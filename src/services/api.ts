"use client";

import { 
  Cliente, 
  Produto, 
  Venda, 
  ItemVenda, 
  ContaPagar, 
  Receber, 
  Caixa, 
  Funcionario, 
  OS, 
  Compra,
  CentroCusto,
  Cheque
} from '../types/database';

const STORAGE_KEY = 'dyaderp_db';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initialDB = {
      clientes: [],
      funcionarios: [],
      produtos: [],
      vendas: [],
      itensVenda: [],
      contasPagar: [],
      receber: [],
      caixa: [],
      os: [],
      compras: [],
      centroCustos: [],
      cheques: []
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
  return JSON.parse(data);
};

const saveDB = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const db = {
  clientes: {
    getAll: (): Cliente[] => getDB().clientes,
    getById: (id: number): Cliente | undefined => 
      getDB().clientes.find((c: Cliente) => c.cd_clientes === id),
    add: (cliente: Cliente) => {
      const database = getDB();
      database.clientes.push(cliente);
      saveDB(database);
      return cliente;
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
    getById: (id: number): Produto | undefined => 
      getDB().produtos.find((p: Produto) => p.cd_produto === id),
    add: (produto: Produto) => {
      const database = getDB();
      database.produtos.push(produto);
      saveDB(database);
      return produto;
    },
    update: (id: number, data: Partial<Produto>) => {
      const database = getDB();
      const index = database.produtos.findIndex((p: Produto) => p.cd_produto === id);
      if (index !== -1) {
        database.produtos[index] = { ...database.produtos[index], ...data };
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
      saveDB(database);
    }
  },
  vendas: {
    getAll: (): Venda[] => getDB().vendas,
    create: (venda: Venda, itens: ItemVenda[]) => {
      const database = getDB();
      database.vendas.push(venda);
      saveDB(database);
    }
  }
};