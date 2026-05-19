"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Database, RefreshCw, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const ImportData = () => {
  const [isFinished, setIsFinished] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const findKey = (obj: any, keywords: string[]) => {
    const keys = Object.keys(obj);
    
    // 1. Tenta encontrar um match EXATO primeiro
    const exactMatch = keys.find(k => {
      const upperK = k.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.some(kw => upperK === kw.toUpperCase());
    });
    if (exactMatch) return exactMatch;

    // 2. Tenta por inclusão
    return keys.find(k => {
      const upperK = k.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return keywords.some(kw => upperK.includes(kw.toUpperCase()));
    });
  };

  const processExcel = (file: File, type: 'clientes' | 'produtos') => {
    const reader = new FileReader();
    const loadingId = showLoading(`Lendo arquivo de ${type}...`);
    setLogs([]);
    addLog(`Iniciando leitura do arquivo: ${file.name}`);

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("Arquivo vazio.");

        const columns = Object.keys(jsonData[0]);
        addLog(`Colunas detectadas no Excel: ${columns.join(', ')}`);

        if (type === 'produtos') {
          importProdutos(jsonData);
        } else {
          importClientes(jsonData);
        }
        
        dismissToast(loadingId);
        setIsFinished(true);
        showSuccess(`Importação de ${type} finalizada!`);
      } catch (err: any) {
        dismissToast(loadingId);
        showError("Erro: " + err.message);
        addLog(`ERRO: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const importProdutos = (data: any[]) => {
    const first = data[0];
    
    // Mapeamento refinado baseado no seu print
    const kNome = findKey(first, ['NOME', 'DESCRICAO', 'PRODUTO']);
    const kCodOriginal = findKey(first, ['CD_PRODUTO', 'ID_IMPORTADO', 'CODIGO', 'REF', 'ID']);
    const kPrecoVenda = findKey(first, ['PRECO_VENDA', 'VENDA', 'PRECO', 'VLR_VENDA']);
    const kPrecoCusto = findKey(first, ['PRECO_CUSTO', 'CUSTO', 'COMPRA', 'VLR_CUSTO']);
    const kEstoque = findKey(first, ['ESTOQUE', 'SALDO', 'QUANTIDADE', 'ESTOQUE_ST']);
    const kUn = findKey(first, ['UNIDADE', 'UN', 'MEDIDA']);

    addLog(`Mapeamento Identificado:`);
    addLog(`- Descrição: ${kNome || 'NÃO ENCONTRADO'}`);
    addLog(`- Cód. Original: ${kCodOriginal || 'NÃO ENCONTRADO'}`);
    addLog(`- Preço Venda: ${kPrecoVenda || 'NÃO ENCONTRADO'}`);
    addLog(`- Preço Custo: ${kPrecoCusto || 'NÃO ENCONTRADO'}`);
    addLog(`- Estoque: ${kEstoque || 'NÃO ENCONTRADO'}`);

    if (!kNome) {
      addLog("ERRO: Coluna de descrição/produto não encontrada.");
      throw new Error("Coluna de Descrição não identificada.");
    }

    const parseNum = (val: any) => {
      if (val === undefined || val === null) return 0;
      const s = val.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      return parseFloat(s) || 0;
    };

    // 1. Mapear dados brutos
    const mapped = data.map(item => ({
      nome: (item[kNome] || "").toString().trim().toUpperCase(),
      id_importado: kCodOriginal ? (item[kCodOriginal] || "").toString() : "",
      venda: parseNum(item[kPrecoVenda]),
      compra: parseNum(item[kPrecoCusto]),
      estoque: parseNum(item[kEstoque]),
      un: kUn ? (item[kUn] || "UN").toString().toUpperCase() : "UN",
      data_atualizacao: new Date().toISOString()
    })).filter(p => p.nome && p.nome.length > 1);

    // 2. Ordenar por Nome (Ordem Alfabética)
    mapped.sort((a, b) => a.nome.localeCompare(b.nome));

    // 3. Gerar novos códigos sequenciais (id_manual)
    const finalProducts = mapped.map((p, index) => ({
      ...p,
      cd_produto: Date.now() + index,
      id_manual: (index + 1).toString().padStart(5, '0'),
      venda_vista: p.venda 
    }));

    const currentDB = JSON.parse(localStorage.getItem('dyaderp_db') || '{}');
    currentDB.produtos = [...(currentDB.produtos || []), ...finalProducts];
    
    try {
      localStorage.setItem('dyaderp_db', JSON.stringify(currentDB));
      addLog(`Sucesso: ${finalProducts.length} produtos importados.`);
    } catch (e) {
      addLog("ERRO CRÍTICO: Limite de memória do navegador excedido.");
      throw new Error("O navegador não tem espaço para tantos produtos. Você precisa conectar um Banco de Dados (Supabase).");
    }
  };

  const importClientes = (data: any[]) => {
    const first = data[0];
    const kNome = findKey(first, ['NOME', 'RAZAO', 'CLIENTE']);
    const kDoc = findKey(first, ['CPF', 'CNPJ', 'DOC']);
    const kTel = findKey(first, ['TEL', 'CEL', 'FONE', 'CONTATO']);

    if (!kNome) throw new Error("Coluna de Nome não identificada.");

    const mapped = data.map((item, index) => ({
      cd_clientes: Date.now() + index,
      nome: (item[kNome] || "").toString().trim().toUpperCase(),
      cpf_cnpj: kDoc ? (item[kDoc] || "").toString() : "",
      cel: kTel ? (item[kTel] || "").toString() : "",
      tipo_entidade: 'C' as const,
      is_funcionario: false,
      data: new Date().toISOString()
    })).filter(c => c.nome && c.nome.length > 1);

    const currentDB = JSON.parse(localStorage.getItem('dyaderp_db') || '{}');
    currentDB.clientes = [...(currentDB.clientes || []), ...mapped];
    localStorage.setItem('dyaderp_db', JSON.stringify(currentDB));
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
            <p className="text-slate-500">Migre seus dados do sistema antigo via Excel (.xlsx)</p>
          </div>
        </div>

        {isFinished && (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Importação Concluída!</h3>
              <p className="text-sm text-emerald-700">Os dados foram gravados. Clique no botão abaixo para carregar as informações.</p>
            </div>
            <Button onClick={() => window.location.reload()} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <RefreshCw size={18} /> Atualizar Sistema Agora
            </Button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="text-emerald-600" /> Produtos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <input type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'produtos')} />
                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 gap-2"><Upload size={18} /> Selecionar PRODUTO.xlsx</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="text-blue-600" /> Clientes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <input type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'clientes')} />
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 gap-2"><Upload size={18} /> Selecionar CLIENTES.xlsx</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {logs.length > 0 && (
          <Card className="border-none shadow-sm bg-slate-900 text-slate-300 font-mono text-[10px]">
            <CardHeader className="border-b border-slate-800 py-2 px-4 flex flex-row items-center gap-2">
              <Terminal size={14} /> <span>Log de Processamento</span>
            </CardHeader>
            <CardContent className="p-4 max-h-60 overflow-y-auto">
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ImportData;