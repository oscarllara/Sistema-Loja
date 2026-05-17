"use client";

import { Cliente, Produto, Compra, Venda, ItemVenda } from '../types/database';

const STORAGE_KEY = 'dyaderp_db';
const START_ID_NOVO = 5000;

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initialDB = {
      clientes: [],
      produtos: [],
      vendas: [],
      compras: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
  return JSON.parse(data);
};

const saveDB = (db: any) => {
  // Antes de salvar, sempre re-sequenciamos os produtos por nome
  if (db.produtos && db.produtos.length > 0) {
    db.produtos.sort((a: Produto, b: Produto) => a.nome.localeCompare(b.nome));
    db.produtos = db.produtos.map((p: Produto, index: number) => ({
      ...p,
      id_novo: START_ID_NOVO + index
    }));
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
    add: (produto: Omit<Produto, 'id_novo' | 'data_atualizacao'>) => {
      const database = getDB();
      const novoProduto = {
        ...produto,
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
      
      // Atualiza estoque e data de atualização dos produtos comprados
      itens.forEach(item => {
        const pIdx = database.produtos.findIndex((p: Produto) => p.cd_produto === item.cd_produto);
        if (pIdx !== -1) {
          database.produtos[pIdx].estoque += Number(item.qtde);
          database.produtos[pIdx].data_atualizacao = new Date().toISOString();
        }
      });
      
      saveDB(database);
    }
  }
};