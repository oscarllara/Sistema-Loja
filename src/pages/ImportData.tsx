"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { db } from '@/services/api';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Cliente, Produto } from '@/types/database';

const ImportData = () => {
  const [importing, setImporting] = React.useState(false);

  const processExcel = (file: File, type: 'clientes' | 'produtos') => {
    const reader = new FileReader();
    const loadingId = showLoading(`Processando ${type}...`);

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (type === 'produtos') {
          importProdutos(jsonData);
        } else {
          importClientes(jsonData);
        }
        
        dismissToast(loadingId);
        showSuccess(`Importação de ${type} concluída!`);
      } catch (err) {
        dismissToast(loadingId);
        showError("Erro ao ler o arquivo Excel. Verifique o formato.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const importProdutos = (data: any[]) => {
    // 1. Mapear e filtrar campos (ajustar nomes de colunas comuns)
    const mapped = data.map(item => ({
      nome: (item.DESCRICAO || item.NOME || item.PRODUTO || "").toString().toUpperCase(),
      id_importado: (item.CODIGO || item.ID || item.COD || "").toString(),
      venda: parseFloat(item.PRECO || item.VALOR || item.VENDA || 0),
      compra: parseFloat(item.CUSTO || item.COMPRA || 0),
      estoque: parseFloat(item.ESTOQUE || item.SALDO || 0),
      un: (item.UNIDADE || item.UN || "UN").toString().toUpperCase(),
      cod_barras: (item.BARRAS || item.EAN || "").toString(),
    })).filter(p => p.nome);

    // 2. Ordenar por nome (Ordem Alfabética)
    mapped.sort((a, b) => a.nome.localeCompare(b.nome));

    // 3. Gerar ID Manual Sequencial (00001, 00002...)
    const finalProducts = mapped.map((p, index) => ({
      ...p,
      cd_produto: Date.now() + index,
      id_manual: (index + 1).toString().padStart(5, '0'),
      data_atualizacao: new Date().toISOString()
    }));

    // 4. Salvar no Banco
    const database = JSON.parse(localStorage.getItem('dyaderp_db') || '{}');
    database.produtos = [...(database.produtos || []), ...finalProducts];
    localStorage.setItem('dyaderp_db', JSON.stringify(database));
  };

  const importClientes = (data: any[]) => {
    const mapped = data.map((item, index) => ({
      cd_clientes: Date.now() + index,
      nome: (item.NOME || item.RAZAO_SOCIAL || "").toString().toUpperCase(),
      cpf_cnpj: (item.CPF || item.CNPJ || item.DOCUMENTO || "").toString(),
      cel: (item.CELULAR || item.TELEFONE || item.FONE || "").toString(),
      email: (item.EMAIL || "").toString().toLowerCase(),
      endereco: (item.ENDERECO || item.LOGRADOURO || "").toString(),
      bairro: (item.BAIRRO || "").toString(),
      cidade: (item.CIDADE || "").toString(),
      uf: (item.UF || item.ESTADO || "").toString().toUpperCase(),
      tipo_entidade: 'C' as const,
      is_funcionario: false,
      data: new Date().toISOString()
    })).filter(c => c.nome);

    const database = JSON.parse(localStorage.getItem('dyaderp_db') || '{}');
    database.clientes = [...(database.clientes || []), ...mapped];
    localStorage.setItem('dyaderp_db', JSON.stringify(database));
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

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" /> Produtos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-slate-500 space-y-1">
                <p>• Colunas esperadas: CODIGO, DESCRICAO, PRECO, ESTOQUE.</p>
                <p>• Os produtos serão ordenados alfabeticamente.</p>
                <p>• Novos IDs sequenciais serão gerados automaticamente.</p>
              </div>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'produtos')}
                />
                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 gap-2">
                  <Upload size={18} /> Selecionar PRODUTO.xlsx
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" /> Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-slate-500 space-y-1">
                <p>• Colunas esperadas: NOME, CPF, TELEFONE, CIDADE.</p>
                <p>• Serão importados como Entidade: CLIENTE.</p>
              </div>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'clientes')}
                />
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 gap-2">
                  <Upload size={18} /> Selecionar CLIENTES.xlsx
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
          <AlertCircle className="text-amber-600 shrink-0" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-bold">Atenção antes de importar:</p>
            <p>1. Certifique-se de que os arquivos estão no formato .xlsx</p>
            <p>2. A primeira linha do Excel deve conter os nomes das colunas.</p>
            <p>3. Esta ação adicionará os dados aos registros já existentes no sistema.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportData;