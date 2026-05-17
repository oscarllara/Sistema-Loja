"use client";

import { Cliente, Produto, Compra, Venda, LancamentoFinanceiro, ContaBancaria, Permissoes } from '../types/database';

const STORAGE_KEY = 'dyaderp_db';
const AUTH_KEY = 'dyaderp_auth';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  let database;

  const adminUser = {
    cd_clientes: 1,
    tipo_entidade: 'A' as const,
    is_funcionario: true,
    nome: 'ADMINISTRADOR',
    usuario: 'admin',
    senha: 'Senha@123',
    data: new Date().toISOString(),
    permissoes: {
      dashboard: true,
      pos: true,
      registrations: true,
      inventory: true,
      purchases: true,
      financial: true,
      reports: true,
      settings: true
    }
  };

  if (!data) {
    database = {
      clientes: [adminUser],
      produtos: [],
      vendas: [],
      compras: [],
      financeiro: [],
      contas: [
        { cd_conta: 1, nome: 'Caixa Loja', saldo: 0, tipo: 'Caixa' },
        { cd_conta: 2, nome: 'Banco do Brasil', saldo: 0, tipo: 'Banco' }
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } else {
    database = JSON.parse(data);
    
    // Garante que o admin existe se a lista estiver vazia ou se o admin não for encontrado
    if (!database.clientes || database.clientes.length === 0 || !database.clientes.find((c: any) => c.usuario === 'admin')) {
      if (!database.clientes) database.clientes = [];
      database.clientes.push(adminUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    }
  }
  return database;
};

const saveDB = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const db = {
  auth: {
    login: (usuario: string, senha: string) => {
      const database = getDB();
      const user = database.clientes.find((c: Cliente) => c.usuario === usuario && c.senha === senha);
      if (user) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    },
    logout: () => {
      localStorage.removeItem(AUTH_KEY);
    },
    getUser: (): Cliente | null => {
      const data = localStorage.getItem(AUTH_KEY);
      return data ? JSON.parse(data) : null;
    }
  },
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
        
        const currentUser = db.auth.getUser();
        if (currentUser && currentUser.cd_clientes === id) {
          localStorage.setItem(AUTH_KEY, JSON.stringify(database.clientes[index]));
        }
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
        const numericIds = database.produtos.map((p: Produto) => parseInt(p.id_manual)).filter((id: number) => !isNaN(id));
        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
        finalIdManual = (maxId + 1).toString();
      }
      const novoProduto = { ...produto, id_manual: finalIdManual, nome: produto.nome.toUpperCase(), data_atualizacao: new Date().toISOString() };
      database.produtos.push(novoProduto);
      saveDB(database);
    },
    update: (id: number, data: Partial<Produto>) => {
      const database = getDB();
      const index = database.produtos.findIndex((p: Produto) => p.cd_produto === id);
      if (index !== -1) {
        database.produtos[index] = { ...database.produtos[index], ...data, data_atualizacao: new Date().toISOString() };
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
      itens.forEach(item => {
        const pIdx = database.produtos.findIndex((p: Produto) => p.cd_produto === item.cd_produto);
        if (pIdx !== -1) {
          database.produtos[pIdx].estoque += Number(item.qtde);
          database.produtos[pIdx].data_atualizacao = new Date().toISOString();
        }
      });
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
    baixar: (id: number, cd_conta: number) => {
      const database = getDB();
      const index = database.financeiro.findIndex((l: LancamentoFinanceiro) => l.cd_lancamento === id);
      const cIdx = database.contas.findIndex((c: ContaBancaria) => c.cd_conta === cd_conta);
      if (index !== -1 && cIdx !== -1) {
        const lanc = database.financeiro[index];
        if (lanc.status === 'Pago') return;
        lanc.status = 'Pago';
        lanc.data_pagamento = new Date().toISOString();
        if (lanc.tipo === 'R') database.contas[cIdx].saldo += lanc.valor;
        else database.contas[cIdx].saldo -= lanc.valor;
        saveDB(database);
      }
    }
  },
  contas: {
    getAll: (): ContaBancaria[] => getDB().contas
  }
};