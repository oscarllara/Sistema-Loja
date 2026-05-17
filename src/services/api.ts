"use client";

import { Cliente, Produto, Compra, Venda, LancamentoFinanceiro, ContaBancaria } from '../types/database';

const STORAGE_KEY = 'dyaderp_db';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initialDB = {
      clientes: [],
      produtos: [],
      vendas: [],
      compras: [],
      financeiro: [],
      contas: [
        { cd_conta: 1, nome: 'Caixa Loja', saldo: 0, tipo: 'Caixa' },
        { cd_conta: 2, nome: 'Banco do Brasil', saldo: 0, tipo: 'Banco' }
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
  return JSON.parse(data);
};

const saveDB = (db: any) => {
  if (db.produtos) {
    db.produtos.sort((a: Produto, b: Produto) => a.nome.localeCompare(b.nome));
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const db = {
  clientes: {
    getAll: (): Cliente[] => getDB().clientes,
    add: (cliente: Cliente) => {
      const database = getDB();
      database.clientes.push(cliente);
      saveDB(database);
    },
    update: (id: number, data: Partial<Cliente>) => {
      const database = getDB();
      const index = database.clientes.findIndex((c: Cliente) => c.cd_clientes === id);
      if (index !== -1) {
        database.clientes[index] = { ...database.clientes[index], ...data };
        saveDB(database);
      }
    },
    delete: (id: number) => {
      const database = getDB();
      database.clientes = database.clientes.filter((c: Cliente) => c.cd_clientes !== id);
      saveDB(database);
    }
  },
  produtos: {
    getAll: (): Produto[] => getDB().produtos,
    add: (produto: Omit<Produto, 'data_atualizacao'>) => {
      const database = getDB();
      
      let finalIdManual = produto.id_manual;

      if (!finalIdManual || finalIdManual.trim() === "") {
        const numericIds = database.produtos
          .map((p: Produto) => parseInt(p.id_manual))
          .filter((id: number) => !isNaN(id));
        
        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
        finalIdManual = (maxId + 1).toString();
      } else {
        const exists = database.produtos.some((p: Produto) => p.id_manual === finalIdManual);
        if (exists) throw new Error(`O código ${finalIdManual} já está em uso.`);
      }

      const novoProduto = {
        ...produto,
        id_manual: finalIdManual,
        nome: produto.nome.toUpperCase(),
        data_atualizacao: new Date().toISOString()
      };
      database.produtos.push(novoProduto);
      saveDB(database);
    },
    update: (id: number, data: Partial<Produto>) => {
      const database = getDB();
      const index = database.produtos.findIndex((p: Produto) => p.cd_produto === id);
      if (index !== -1) {
        if (data.id_manual && data.id_manual !== database.produtos[index].id_manual) {
          const exists = database.produtos.some((p: Produto) => p.id_manual === data.id_manual);
          if (exists) throw new Error(`O código ${data.id_manual} já está em uso.`);
        }

        database.produtos[index] = { 
          ...database.produtos[index], 
          ...data, 
          nome: data.nome ? data.nome.toUpperCase() : database.produtos[index].nome,
          data_atualizacao: new Date().toISOString()
        };
        saveDB(database);
      }
    },
    delete: (id: number) => {
      const database = getDB();
      database.produtos = database.produtos.filter((p: Produto) => p.cd_produto !== id);
      saveDB(database);
    }
  },
  compras: {
    getAll: (): Compra[] => getDB().compras,
    create: (compra: Compra, itens: any[]) => {
      const database = getDB();
      database.compras.push(compra);
      
      // Atualiza estoque
      itens.forEach(item => {
        const pIdx = database.produtos.findIndex((p: Produto) => p.cd_produto === item.cd_produto);
        if (pIdx !== -1) {
          database.produtos[pIdx].estoque += Number(item.qtde);
          database.produtos[pIdx].data_atualizacao = new Date().toISOString();
        }
      });

      // Gera conta a pagar
      const fornecedor = database.clientes.find((c: Cliente) => c.cd_clientes === compra.cd_fornecedores);
      const lancamento: LancamentoFinanceiro = {
        cd_lancamento: Date.now(),
        tipo: 'P',
        descricao: `Compra NF ${compra.nota_fiscal || 'S/N'}`,
        valor: compra.total,
        data_vencimento: new Date().toISOString(),
        status: 'Pendente',
        cd_entidade: compra.cd_fornecedores,
        nome_entidade: fornecedor?.nome || `Fornecedor #${compra.cd_fornecedores}`,
        categoria: 'Compras'
      };
      database.financeiro.push(lancamento);
      
      saveDB(database);
    }
  },
  financeiro: {
    getAll: (): LancamentoFinanceiro[] => getDB().financeiro,
    add: (lancamento: LancamentoFinanceiro) => {
      const database = getDB();
      database.financeiro.push(lancamento);
      saveDB(database);
    },
    baixar: (id: number, cd_conta: number) => {
      const database = getDB();
      const index = database.financeiro.findIndex((l: LancamentoFinanceiro) => l.cd_lancamento === id);
      const cIdx = database.contas.findIndex((c: ContaBancaria) => c.cd_conta === cd_conta);
      
      if (index !== -1 && cIdx !== -1) {
        const lanc = database.financeiro[index];
        if (lanc.status === 'Pago') return;

        lanc.status = 'Pago';
        lanc.data_pagamento = new Date().toISOString();
        
        // Atualiza saldo da conta
        if (lanc.tipo === 'R') {
          database.contas[cIdx].saldo += lanc.valor;
        } else {
          database.contas[cIdx].saldo -= lanc.valor;
        }
        
        saveDB(database);
      }
    }
  },
  contas: {
    getAll: (): ContaBancaria[] => getDB().contas,
    updateSaldo: (id: number, valor: number) => {
      const database = getDB();
      const index = database.contas.findIndex((c: ContaBancaria) => c.cd_conta === id);
      if (index !== -1) {
        database.contas[index].saldo += valor;
        saveDB(database);
      }
    }
  }
};