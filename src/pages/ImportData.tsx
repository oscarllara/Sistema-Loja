"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Database, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { db } from '@/services/api';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

const ImportData = () => {
  const [isFinished, setIsFinished] = React.useState(false);

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

        if (jsonData.length === 0) {
          throw new Error("O arquivo está vazio ou não tem o formato correto.");
        }

        if (type === 'produtos') {
          importProdutos(jsonData);
        } else {
          importClientes(jsonData);
        }
        
        dismissToast(loadingId);
        setIsFinished(true);
        showSuccess(`Importação de ${type} concluída com sucesso!`);
      } catch (err: any) {
        dismissToast(loadingId);
        showError(err.message || "Erro ao ler o arquivo Excel.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const importProdutos = (data: any[]) => {
    // 1. Mapear campos tentando encontrar nomes de colunas variados
    const mapped = data.map(item => {
      const nome = (item.DESCRICAO || item.NOME || item.PRODUTO || item.Descricao || "").toString().toUpperCase();
      const id_importado = (item.CODIGO || item.ID || item.COD || item.Codigo || "").toString();
      const venda = parseFloat(item.PRECO || item.VALOR || item.VENDA || item.Preco || 0);
      const compra = parseFloat(item.CUSTO || item.COMPRA || item.Custo || 0);
      const estoque = parseFloat(item.ESTOQUE || item.SALDO || item.Estoque || 0);
      const un = (item.UNIDADE || item.UN || item.Unidade || "UN").toString().toUpperCase();
      const cod_barras = (item.BARRAS || item.EAN || item.Barras || "").toString();

      return {
        nome,
        id_importado,
        venda: isNaN(venda) ? 0 : venda,
        venda_vista: isNaN(venda) ? 0 : venda,
        compra: isNaN(compra) ? 0 : compra,
        estoque: isNaN(estoque) ? 0 : estoque,
        un,
        cod_barras,
        data_atualizacao: new Date().toISOString()
      };
    }).filter(p => p.nome);

    // 2. Ordenar por nome (Ordem Alfabética)
    mapped.sort((a, b) => a.nome.localeCompare(b.nome));

    // 3. Gerar ID Manual Sequencial (00001, 00002...)
    const finalProducts = mapped.map((p, index) => ({
      ...p,
      cd_produto: Date.now() + index,
      id_manual: (index + 1).toString().padStart(5, '0'),
    }));

    // 4. Salvar no Banco (Mesclando com o que já existe)
    const currentDB = JSON.parse(localStorage.getItem('dyaderp_db') || '{}');
    currentDB.produtos = [...(currentDB.produtos || []), ...finalProducts];
    localStorage.setItem('dyaderp_db', JSON.stringify(currentDB));
  };

  const importClientes = (data: any[]) => {
    const mapped = data.map((item, index) => {
      const nome = (item.NOME || item.RAZAO_SOCIAL || item.CLIENTE || item.Nome || "").toString().toUpperCase();
      const cpf_cnpj = (item.CPF || item.CNPJ || item.DOCUMENTO || item.CpfCnpj || "").toString();
      const cel = (item.CELULAR || item.TELEFONE || item.FONE || item.Celular || "").toString();
      
      return {
        cd_clientes: Date.now() + index,
        nome,
        cpf_cnpj,
        cel,
        email: (item.EMAIL || item.Email || "").toString().toLowerCase(),
        endereco: (item.ENDERECO || item.LOGRADOURO || item.Endereco || "").toString(),
        bairro: (item.BAIRRO || item.Bairro || "").toString(),
        cidade: (item.CIDADE || item.Cidade || "").toString(),
        uf: (item.UF || item.ESTADO || item.Uf || "").toString().toUpperCase(),
        tipo_entidade: 'C' as const,
        is_funcionario: false,
        data: new Date().toISOString()
      };
    }).filter(c => c.nome);

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
              <p className="text-sm text-emerald-700">Os dados foram gravados com sucesso. Para que o sistema carregue as novas informações em todas as telas, é necessário atualizar a página.</p>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <RefreshCw size={18} /> Atualizar Sistema Agora
            </Button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" /> Produtos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-slate-500 space-y-1">
                <p>• Colunas: CODIGO, DESCRICAO, PRECO, ESTOQUE.</p>
                <p>• Ordenação alfabética automática.</p>
                <p>• Novos IDs sequenciais (00001, 00002...).</p>
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
                <p>• Colunas: NOME, CPF, TELEFONE, CIDADE.</p>
                <p>• Importados como Entidade: CLIENTE.</p>
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
            <p className="font-bold">Dica de Importação:</p>
            <p>Se os dados não aparecerem imediatamente no Estoque ou Cadastros, use o botão de **Rebuild** ou **Refresh** acima do chat para forçar o recarregamento completo do banco de dados local.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportData;