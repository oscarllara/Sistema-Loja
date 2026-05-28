"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Database, RefreshCw, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { db } from '@/services/api';

const ImportData = () => {
  const [isFinished, setIsFinished] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const findKey = (obj: any, keywords: string[]) => {
    const keys = Object.keys(obj);
    const exactMatch = keys.find(k => {
      const upperK = k.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.some(kw => upperK === kw.toUpperCase());
    });
    if (exactMatch) return exactMatch;

    return keys.find(k => {
      const upperK = k.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.some(kw => upperK.includes(kw.toUpperCase()));
    });
  };

  const processExcel = async (file: File, type: 'clientes' | 'produtos') => {
    if (isImporting) return;
    setIsImporting(true);
    setIsFinished(false);
    setLogs([]);
    
    const loadingId = showLoading(`Processando arquivo de ${type}...`);
    addLog(`Iniciando leitura do arquivo: ${file.name}`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("Arquivo vazio.");

        addLog(`${jsonData.length} registros encontrados.`);

        if (type === 'produtos') {
          await importProdutos(jsonData);
        } else {
          await importClientes(jsonData);
        }
        
        dismissToast(loadingId);
        setIsFinished(true);
        showSuccess(`Importação de ${type} finalizada com sucesso!`);
      } catch (err: any) {
        dismissToast(loadingId);
        showError("Erro: " + err.message);
        addLog(`ERRO: ${err.message}`);
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const parseNum = (val: any) => {
    if (val === undefined || val === null || val === "") return 0;
    if (typeof val === 'number') return val;
    
    let s = val.toString().replace('R$', '').trim();
    
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } 
    else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    
    return parseFloat(s) || 0;
  };

  const importProdutos = async (data: any[]) => {
    const first = data[0];
    const kNome = findKey(first, ['NOME', 'DESCRICAO', 'PRODUTO']);
    const kCodOriginal = findKey(first, ['CD_PRODUTO', 'ID_IMPORTADO', 'CODIGO', 'REF', 'ID']);
    const kPrecoVenda = findKey(first, ['PRECO_VENDA', 'VENDA', 'PRECO', 'VLR_VENDA']);
    const kPrecoCusto = findKey(first, ['PRECO_CUSTO', 'CUSTO', 'COMPRA', 'VLR_CUSTO']);
    const kEstoque = findKey(first, ['ESTOQUE', 'SALDO', 'QUANTIDADE', 'ESTOQUE_ST']);
    const kUn = findKey(first, ['UNIDADE', 'UN', 'MEDIDA']);
    const kBarras = findKey(first, ['BARRAS', 'EAN', 'GTIN', 'COD_BARRAS']);

    if (!kNome) throw new Error("Coluna de Descrição não identificada.");

    addLog("Mapeando produtos e gerando novos IDs sequenciais...");

    const mapped = data.map((item, index) => ({
      nome: (item[kNome] || "").toString().trim().toUpperCase(),
      id_importado: kCodOriginal ? (item[kCodOriginal] || "").toString() : "",
      cod_barras: kBarras ? (item[kBarras] || "").toString() : "",
      venda: parseNum(item[kPrecoVenda]),
      compra: parseNum(item[kPrecoCusto]),
      estoque: parseNum(item[kEstoque]),
      un: kUn ? (item[kUn] || "UN").toString().toUpperCase() : "UN",
      id_manual: (index + 1).toString().padStart(5, '0'), // Novo ID sequencial
      venda_vista: parseNum(item[kPrecoVenda]),
      data_atualizacao: new Date().toISOString()
    })).filter(p => p.nome && p.nome.length > 1);

    const chunkSize = 100;
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);
      addLog(`Enviando lote ${Math.floor(i/chunkSize) + 1} de ${Math.ceil(mapped.length/chunkSize)}...`);
      const { error } = await db.produtos.bulkAdd(chunk);
      if (error) throw error;
    }

    addLog(`Sucesso: ${mapped.length} produtos importados.`);
  };

  const importClientes = async (data: any[]) => {
    const first = data[0];
    const kNome = findKey(first, ['NOME', 'RAZAO', 'CLIENTE']);
    const kDoc = findKey(first, ['CPF', 'CNPJ', 'DOC']);
    const kTel = findKey(first, ['TEL', 'CEL', 'FONE', 'CONTATO']);

    if (!kNome) throw new Error("Coluna de Nome não identificada.");

    const mapped = data.map((item) => ({
      nome: (item[kNome] || "").toString().trim().toUpperCase(),
      cpf_cnpj: kDoc ? (item[kDoc] || "").toString() : "",
      cel: kTel ? (item[kTel] || "").toString() : "",
      tipo_entidade: 'C',
      is_funcionario: false,
      data: new Date().toISOString()
    })).filter(c => c.nome && c.nome.length > 1);

    addLog(`Enviando ${mapped.length} clientes para o banco...`);
    
    const { error } = await db.clientes.bulkAdd(mapped as any);
    if (error) throw error;

    addLog("Clientes importados com sucesso.");
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Importação de Dados</h1>
            <p className="text-slate-500">Suba suas planilhas Excel (.xlsx) para alimentar o sistema.</p>
          </div>
        </div>

        {isFinished && (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Importação Concluída!</h3>
              <p className="text-sm text-emerald-700">Todos os dados foram processados e salvos com sucesso.</p>
            </div>
            <Button onClick={() => window.location.reload()} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <RefreshCw size={18} /> Atualizar Sistema
            </Button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" /> Produtos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  disabled={isImporting}
                  onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'produtos')} 
                />
                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={isImporting}>
                  {isImporting ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                  Selecionar PRODUTO.xlsx
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Colunas esperadas: Nome, Código, Preço Venda, Preço Custo, Estoque, Unidade, Barras.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="text-blue-600" /> Clientes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  disabled={isImporting}
                  onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'clientes')} 
                />
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 gap-2" disabled={isImporting}>
                  {isImporting ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                  Selecionar CLIENTES.xlsx
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Colunas esperadas: Nome, CPF/CNPJ, Telefone.</p>
            </CardContent>
          </Card>
        </div>

        {(logs.length > 0 || isImporting) && (
          <Card className="border-none shadow-sm bg-slate-900 text-slate-300 font-mono text-[10px]">
            <CardHeader className="border-b border-slate-800 py-2 px-4 flex flex-row items-center gap-2">
              <Terminal size={14} /> <span>Log de Importação</span>
            </CardHeader>
            <CardContent className="p-4 max-h-60 overflow-y-auto">
              {logs.map((log, i) => <div key={i}>{log}</div>)}
              {isImporting && <div className="animate-pulse">Processando...</div>}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ImportData;