import { Cliente, Produto, Venda, ItemVenda, ContaPagar, Receber, Caixa } from '../types/database';

// Simulação de Banco de Dados usando LocalStorage
const STORAGE_KEY = 'dyaderp_db';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {
    clientes: [],
    produtos: [],
    vendas: [],
    itensVenda: [],
    contasPagar: [],
    receber: [],
    caixa: []
  };
};

const saveDB = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const db = {
  clientes: {
    getAll: (): Cliente[] => getDB().clientes,
    add: (cliente: Cliente) => {
      const database = getDB();
      database.clientes.push(cliente);
      saveDB(database);
    }
  },
  produtos: {
    getAll: (): Produto[] => getDB().produtos,
    add: (produto: Produto) => {
      const database = getDB();
      database.produtos.push(produto);
      saveDB(database);
    },
    updateStock: (id: number, qtde: number) => {
      const database = getDB();
      const prod = database.produtos.find((p: Produto) => p.cd_produto === id);
      if (prod) prod.estoque += qtde;
      saveDB(database);
    }
  },
  vendas: {
    getAll: (): Venda[] => getDB().vendas,
    create: (venda: Venda, itens: ItemVenda[]) => {
      const database = getDB();
      database.vendas.push(venda);
      database.itensVenda.push(...itens);
      saveDB(database);
    }
  }
};