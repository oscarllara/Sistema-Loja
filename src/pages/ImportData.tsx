"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Database, RefreshCw, Terminal, HelpCircle, Copy, RefreshCcw, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { db } from '@/services/api';
import { formatCpfCnpj, formatPhoneBR } from '@/utils/formatters';

type ConflictAction = 'duplicate' | 'skip' | 'replace';

interface ConflictItem {
  index: number;
  newData: any;
  existingData: any;
  action: ConflictAction;
  displayName: string;
  displayKey: string;
}

const ImportData = () => {
  const [isFinished, setIsFinished] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);
  
  // Conflict resolution states
  const [conflicts, setConflicts] = React.useState<ConflictItem[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = React.useState(false);
  const [importType, setImportType] = React.useState<'clientes' | 'produtos' | 'receber' | 'pagar' | null>(null);
  const [pendingData, setPendingData] = React.useState<any[]>([]);
  const [nonConflictingData, setNonConflictingData] = React.useState<any[]>([]);

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

  const processExcel = async (file: File, type: 'clientes' | 'produtos' | 'receber' | 'pagar') => {
    if (isImporting) return;
    setIsImporting(true);
    setIsFinished(false);
    setLogs([]);
    setConflicts([]);
    setImportType(type);
    
    const loadingId = showLoading(`Lendo arquivo de ${type}...`);
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

        addLog(`${jsonData.length} registros encontrados na planilha.`);
        dismissToast(loadingId);

        // Analyze conflicts before importing
        await analyzeConflicts(jsonData, type);
      } catch (err: any) {
        dismissToast(loadingId);
        showError("Erro: " + err.message);
        addLog(`ERRO: ${err.message}`);
        setIsImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const analyzeConflicts = async (jsonData: any[], type: 'clientes' | 'produtos' | 'receber' | 'pagar') => {
    addLog("Analisando possíveis duplicidades no banco de dados...");
    const foundConflicts: ConflictItem[] = [];
    const nonConflicts: any[] = [];

    if (type === 'produtos') {
      const existingProducts = await db.produtos.getAll();
      const first = jsonData[0];
      const kNome = findKey(first, ['NOME', 'DESCRICAO', 'PRODUTO', 'DESC', 'NOME_PRODUTO', 'DESCRICAO_PRODUTO']);
      const kCodOriginal = findKey(first, ['CD_PRODUTO', 'ID_IMPORTADO', 'CODIGO', 'REF', 'ID', 'COD_PRODUTO', 'COD_PROD']);
      const kPrecoVenda = findKey(first, ['PRECO_VENDA', 'VENDA', 'PRECO', 'VLR_VENDA', 'VALOR_VENDA', 'PRECO_DE_VENDA', 'SAIDA', 'PRECO_SAIDA']);
      const kPrecoCusto = findKey(first, ['PRECO_CUSTO', 'CUSTO', 'COMPRA', 'VLR_CUSTO', 'VALOR_CUSTO', 'VALOR_COMPRA', 'CUSTO_UNITARIO']);
      const kEstoque = findKey(first, ['ESTOQUE', 'SALDO', 'QUANTIDADE', 'ESTOQUE_ST', 'QTD', 'QTDE', 'ATUAL', 'ESTOQUE_ATUAL', 'DISPONIVEL']);
      const kUn = findKey(first, ['UNIDADE', 'UN', 'MEDIDA']);
      const kBarras = findKey(first, ['BARRAS', 'EAN', 'GTIN', 'COD_BARRAS', 'COD_BARRA']);

      if (!kNome) throw new Error("Coluna de Descrição não identificada.");

      jsonData.forEach((item, index) => {
        const nome = (item[kNome] || "").toString().trim().toUpperCase();
        if (!nome) return;

        const id_importado = kCodOriginal ? (item[kCodOriginal] || "").toString().trim() : "";
        const cod_barras = kBarras ? (item[kBarras] || "").toString().trim() : "";

        const mappedItem = {
          nome,
          id_importado: id_importado || null,
          cod_barras: cod_barras || null,
          venda: parseNum(item[kPrecoVenda]),
          compra: parseNum(item[kPrecoCusto]),
          estoque: parseNum(item[kEstoque]),
          un: kUn ? (item[kUn] || "UN").toString().toUpperCase() : "UN",
          venda_vista: parseNum(item[kPrecoVenda]),
          data_atualizacao: new Date().toISOString()
        };

        // Check if product already exists by name or imported code
        const existing = existingProducts.find(p => 
          p.nome.trim().toUpperCase() === nome || 
          (id_importado && p.id_importado?.trim() === id_importado)
        );

        if (existing) {
          foundConflicts.push({
            index,
            newData: mappedItem,
            existingData: existing,
            action: 'skip', // Default action
            displayName: nome,
            displayKey: id_importado ? `Cód. Antigo: ${id_importado}` : `Nome: ${nome}`
          });
        } else {
          nonConflicts.push(mappedItem);
        }
      });

    } else if (type === 'clientes') {
      const existingClients = await db.clientes.getAll();
      const first = jsonData[0];
      const kNome = findKey(first, ['NOME', 'RAZAO', 'CLIENTE', 'NOME_COMPLETO', 'PARCEIRO']);
      const kDoc = findKey(first, ['CPF', 'CNPJ', 'DOC', 'DOCUMENTO']);
      const kTel = findKey(first, ['TEL', 'CEL', 'FONE', 'CONTATO', 'TELEFONE', 'WHATSAPP']);

      if (!kNome) throw new Error("Coluna de Nome não identificada.");

      jsonData.forEach((item, index) => {
        const nome = (item[kNome] || "").toString().trim().toUpperCase();
        if (!nome) return;

        const cpf_cnpj = kDoc ? formatCpfCnpj((item[kDoc] || "").toString()) : "";
        const cel = kTel ? formatPhoneBR((item[kTel] || "").toString()) : "";

        const mappedItem = {
          nome,
          cpf_cnpj: cpf_cnpj || null,
          cel: cel || null,
          tipo_entidade: 'C' as const,
          is_funcionario: false,
          created_at: new Date().toISOString()
        };

        const existing = existingClients.find(c => 
          c.nome.trim().toUpperCase() === nome || 
          (cpf_cnpj && c.cpf_cnpj === cpf_cnpj)
        );

        if (existing) {
          foundConflicts.push({
            index,
            newData: mappedItem,
            existingData: existing,
            action: 'skip',
            displayName: nome,
            displayKey: cpf_cnpj ? `CPF/CNPJ: ${cpf_cnpj}` : `Nome: ${nome}`
          });
        } else {
          nonConflicts.push(mappedItem);
        }
      });

    } else {
      // Receber / Pagar
      const existingFinance = await db.financeiro.getAll();
      const first = jsonData[0];
      const kDesc = findKey(first, ['DESCRICAO', 'NOME', 'CLIENTE', 'FORNECEDOR', 'NOME_ENTIDADE']);
      const kValor = findKey(first, ['VALOR', 'VLR', 'TOTAL', 'VALOR_A_RECEBER', 'VALOR_A_PAGAR']);
      const kDataVenc = findKey(first, ['VENCIMENTO', 'DATA_VENC', 'VENC', 'DATA_VENCIMENTO']);
      const kDoc = findKey(first, ['DOCUMENTO', 'NF', 'NUM_DOCUMENTO', 'DUPLICATA', 'BOLETO']);
      const kChequeNum = findKey(first, ['CHEQUE', 'NUM_CHEQUE', 'N_CHEQUE', 'CHQ']);
      const kBanco = findKey(first, ['BANCO', 'BANCO_NOME', 'NOME_BANCO']);

      if (!kDesc) throw new Error("Coluna de Descrição / Nome não identificada.");
      if (!kValor) throw new Error("Coluna de Valor não identificada.");
      if (!kDataVenc) throw new Error("Coluna de Data de Vencimento não identificada.");

      jsonData.forEach((item, index) => {
        const descricao = (item[kDesc] || "").toString().trim().toUpperCase();
        const valor = parseNum(item[kValor]);
        if (!descricao || valor <= 0) return;

        let rawDate = item[kDataVenc];
        let formattedDate = "";
        if (typeof rawDate === 'number') {
          const jsDate = new Date((rawDate - 25569) * 86400 * 1000);
          formattedDate = jsDate.toISOString().split('T')[0];
        } else if (rawDate) {
          try {
            const parts = rawDate.toString().split('/');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
              formattedDate = new Date(rawDate).toISOString().split('T')[0];
            }
          } catch (e) {
            formattedDate = new Date().toISOString().split('T')[0];
          }
        } else {
          formattedDate = new Date().toISOString().split('T')[0];
        }

        const chequeNum = kChequeNum ? (item[kChequeNum] || "").toString().trim() : "";
        const isCheque = chequeNum !== "";

        const mappedItem = {
          tipo: type === 'receber' ? 'R' as const : 'P' as const,
          descricao,
          valor,
          data_vencimento: formattedDate,
          status: 'Pendente' as const,
          num_documento: kDoc && item[kDoc] ? (item[kDoc] || "").toString().trim() : null,
          meio_pagamento: isCheque ? 'Cheque' as const : (kDoc && item[kDoc] ? 'Boleto' as const : 'Dinheiro' as const),
          cheque_num: chequeNum || null,
          banco_nome: kBanco && item[kBanco] ? (item[kBanco] || "").toString().trim().toUpperCase() : null,
          categoria: type === 'receber' ? 'Cliente' : 'Fornecedor',
          data_pagamento: null,
          cd_conta: null
        };

        const existing = existingFinance.find(f => 
          f.descricao.trim().toUpperCase() === descricao && 
          f.valor === valor && 
          f.data_vencimento === formattedDate &&
          f.tipo === (type === 'receber' ? 'R' : 'P')
        );

        if (existing) {
          foundConflicts.push({
            index,
            newData: mappedItem,
            existingData: existing,
            action: 'skip',
            displayName: descricao,
            displayKey: `Venc: ${formattedDate} | R$ ${valor.toFixed(2)}`
          });
        } else {
          nonConflicts.push(mappedItem);
        }
      });
    }

    setNonConflictingData(nonConflicts);
    setPendingData(jsonData);

    if (foundConflicts.length > 0) {
      addLog(`${foundConflicts.length} possíveis duplicidades encontradas. Aguardando decisão do usuário...`);
      setConflicts(foundConflicts);
      setIsConflictModalOpen(true);
    } else {
      addLog("Nenhuma duplicidade encontrada. Prosseguindo com a importação direta...");
      await executeImport(nonConflicts, [], type);
    }
  };

  const handleGlobalAction = (action: ConflictAction) => {
    setConflicts(prev => prev.map(c => ({ ...c, action })));
    showSuccess(`Ação "${action === 'duplicate' ? 'Duplicar' : action === 'replace' ? 'Substituir' : 'Ignorar'}" aplicada a todos os conflitos.`);
  };

  const handleItemAction = (index: number, action: ConflictAction) => {
    setConflicts(prev => prev.map((c, i) => i === index ? { ...c, action } : c));
  };

  const confirmConflictResolution = async () => {
    setIsConflictModalOpen(false);
    if (!importType) return;

    const loadingId = showLoading("Processando decisões de conflito...");
    addLog("Processando decisões de conflito e executando importação...");

    try {
      await executeImport(nonConflictingData, conflicts, importType);
      dismissToast(loadingId);
      setIsFinished(true);
      showSuccess(`Importação de ${importType} finalizada com sucesso!`);
    } catch (err: any) {
      dismissToast(loadingId);
      showError("Erro na importação: " + err.message);
      addLog(`ERRO: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const executeImport = async (cleanData: any[], resolvedConflicts: ConflictItem[], type: 'clientes' | 'produtos' | 'receber' | 'pagar') => {
    const toInsert: any[] = [...cleanData];
    const toUpdate: { id: number; data: any }[] = [];

    // Process resolved conflicts
    resolvedConflicts.forEach(conflict => {
      if (conflict.action === 'duplicate') {
        if (type === 'produtos') {
          const duplicatedProduct = { ...conflict.newData };
          duplicatedProduct.nome = `${duplicatedProduct.nome} (DUPLICADO)`;
          if (duplicatedProduct.id_importado) {
            duplicatedProduct.id_importado = `${duplicatedProduct.id_importado}-DUP`;
          }
          toInsert.push(duplicatedProduct);
        } else if (type === 'clientes') {
          const duplicatedClient = { ...conflict.newData };
          duplicatedClient.nome = `${duplicatedClient.nome} (DUPLICADO)`;
          toInsert.push(duplicatedClient);
        } else {
          const duplicatedFinance = { ...conflict.newData };
          duplicatedFinance.descricao = `${duplicatedFinance.descricao} (DUPLICADO)`;
          toInsert.push(duplicatedFinance);
        }
      } else if (conflict.action === 'replace') {
        if (type === 'produtos') {
          toUpdate.push({
            id: conflict.existingData.cd_produto,
            data: conflict.newData
          });
        } else if (type === 'clientes') {
          toUpdate.push({
            id: conflict.existingData.cd_clientes,
            data: conflict.newData
          });
        } else {
          toUpdate.push({
            id: conflict.existingData.cd_lancamento,
            data: conflict.newData
          });
        }
      }
    });

    addLog(`Registros novos/duplicados a inserir: ${toInsert.length}`);
    addLog(`Registros existentes a substituir: ${toUpdate.length}`);

    // 1. Execute Updates (Replace)
    if (toUpdate.length > 0) {
      addLog(`Substituindo ${toUpdate.length} registros anteriores...`);
      for (const updateItem of toUpdate) {
        if (type === 'produtos') {
          await db.produtos.update(updateItem.id, updateItem.data);
        } else if (type === 'clientes') {
          await db.clientes.update(updateItem.id, updateItem.data);
        } else {
          await db.financeiro.update(updateItem.id, updateItem.data);
        }
      }
    }

    // 2. Execute Inserts (New & Duplicated)
    if (toInsert.length > 0) {
      addLog(`Inserindo ${toInsert.length} registros novos/duplicados...`);
      if (type === 'produtos') {
        for (let i = 0; i < toInsert.length; i++) {
          if (i % 50 === 0 && i > 0) {
            addLog(`Inserindo produto ${i} de ${toInsert.length}...`);
          }
          await db.produtos.add(toInsert[i]);
        }
      } else if (type === 'clientes') {
        const chunkSize = 100;
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize);
          await db.clientes.bulkAdd(chunk);
        }
      } else {
        const chunkSize = 100;
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize);
          await db.financeiro.addBulk(chunk);
        }
      }
    }

    addLog("Importação concluída com sucesso!");
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
            <p className="text-slate-500">Suba suas planilhas Excel (.xlsx) com controle inteligente de duplicidades.</p>
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
          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl">
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
                <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-2xl" disabled={isImporting}>
                  {isImporting ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                  Selecionar PRODUTO.xlsx
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Colunas esperadas: Nome, Código, Preço Venda, Preço Custo, Estoque, Unidade, Barras.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl">
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
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 gap-2 rounded-2xl" disabled={isImporting}>
                  {isImporting ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                  Selecionar CLIENTES.xlsx
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Colunas esperadas: Nome, CPF/CNPJ, Telefone.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="text-amber-600" /> Contas a Receber</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  disabled={isImporting}
                  onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'receber')}
                />
                <Button className="w-full h-12 bg-amber-600 hover:bg-amber-700 gap-2 rounded-2xl" disabled={isImporting}>
                  {isImporting ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                  Selecionar RECEBER.xlsx
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Colunas esperadas: Descrição/Cliente, Valor, Vencimento, Documento (Opcional).</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="text-rose-600" /> Contas a Pagar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  disabled={isImporting}
                  onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0], 'pagar')}
                />
                <Button className="w-full h-12 bg-rose-600 hover:bg-rose-700 gap-2 rounded-2xl" disabled={isImporting}>
                  {isImporting ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                  Selecionar PAGAR.xlsx
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">Colunas esperadas: Fornecedor, Valor, Vencimento, Cheque/Doc (Opcional), Banco (Opcional).</p>
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

      {/* CONFLICT RESOLUTION DIALOG */}
      <Dialog open={isConflictModalOpen} onOpenChange={(open) => { if(!open) setIsConflictModalOpen(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-amber-600 text-white p-6 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                <AlertCircle size={26} /> Duplicidades Encontradas ({conflicts.length})
              </DialogTitle>
              <p className="text-xs font-bold text-amber-100 mt-1">
                Alguns registros da planilha já existem no banco de dados. Escolha o que fazer para cada um ou aplique uma ação global.
              </p>
            </DialogHeader>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button type="button" variant="outline" className="bg-white/10 border-white/10 text-white hover:bg-white/20 rounded-xl font-black text-xs" onClick={() => handleGlobalAction('skip')}>
                <EyeOff size={14} className="mr-1.5" /> Ignorar Todos (Não Importar)
              </Button>
              <Button type="button" variant="outline" className="bg-white/10 border-white/10 text-white hover:bg-white/20 rounded-xl font-black text-xs" onClick={() => handleGlobalAction('duplicate')}>
                <Copy size={14} className="mr-1.5" /> Duplicar Todos (Criar Novo)
              </Button>
              <Button type="button" variant="outline" className="bg-white/10 border-white/10 text-white hover:bg-white/20 rounded-xl font-black text-xs" onClick={() => handleGlobalAction('replace')}>
                <RefreshCcw size={14} className="mr-1.5" /> Substituir Todos (Atualizar Anterior)
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="space-y-3">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{conflict.displayKey}</p>
                    <h4 className="text-sm font-black text-slate-900 uppercase mt-1 truncate">{conflict.displayName}</h4>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Dado na Planilha (Novo)</p>
                        {importType === 'produtos' && (
                          <p className="font-bold text-slate-700 mt-0.5">Estoque: {conflict.newData.estoque} {conflict.newData.un} | Venda: R$ {conflict.newData.venda.toFixed(2)}</p>
                        )}
                        {importType === 'clientes' && (
                          <p className="font-bold text-slate-700 mt-0.5">Cel: {conflict.newData.cel || 'N/A'}</p>
                        )}
                        {(importType === 'receber' || importType === 'pagar') && (
                          <p className="font-bold text-slate-700 mt-0.5">Venc: {conflict.newData.data_vencimento} | R$ {conflict.newData.valor.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase">Dado no Sistema (Existente)</p>
                        {importType === 'produtos' && (
                          <p className="font-bold text-indigo-950 mt-0.5">Estoque: {conflict.existingData.estoque} {conflict.existingData.un} | Venda: R$ {conflict.existingData.venda.toFixed(2)}</p>
                        )}
                        {importType === 'clientes' && (
                          <p className="font-bold text-indigo-950 mt-0.5">Cel: {conflict.existingData.cel || 'N/A'}</p>
                        )}
                        {(importType === 'receber' || importType === 'pagar') && (
                          <p className="font-bold text-indigo-950 mt-0.5">Venc: {conflict.existingData.data_vencimento} | R$ {conflict.existingData.valor.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={conflict.action === 'skip' ? 'default' : 'outline'}
                      className={cn("rounded-xl font-bold text-[10px] uppercase h-8 flex-1 md:w-36", conflict.action === 'skip' && "bg-slate-900 hover:bg-slate-800")}
                      onClick={() => handleItemAction(idx, 'skip')}
                    >
                      Ignorar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={conflict.action === 'duplicate' ? 'default' : 'outline'}
                      className={cn("rounded-xl font-bold text-[10px] uppercase h-8 flex-1 md:w-36", conflict.action === 'duplicate' && "bg-amber-600 hover:bg-amber-700")}
                      onClick={() => handleItemAction(idx, 'duplicate')}
                    >
                      Duplicar!
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={conflict.action === 'replace' ? 'default' : 'outline'}
                      className={cn("rounded-xl font-bold text-[10px] uppercase h-8 flex-1 md:w-36", conflict.action === 'replace' && "bg-indigo-600 hover:bg-indigo-700")}
                      onClick={() => handleItemAction(idx, 'replace')}
                    >
                      Substituir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t bg-slate-100 flex justify-end gap-3 shrink-0">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => { setIsConflictModalOpen(false); setIsImporting(false); }}>
              Cancelar Importação
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black px-8" onClick={confirmConflictResolution}>
              Confirmar e Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ImportData;