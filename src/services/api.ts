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
  return data ? JSON.parse(data) : {
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
  fornecedores: {
    getAll: () => getDB().compras.map((c: any) => c.cd_fornecedores) // Simplificado para o exemplo
  },
  funcionarios: {
    getAll: (): Funcionario[] => getDB().funcionarios,
    add: (func: Funcionario) => {
      const database = getDB();
      database.funcionarios.push(func);
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
  compras: {
    getAll: (): Compra[] => getDB().compras,
    create: (compra: Compra, itens: any[]) => {
      const database = getDB();
      
      // 1. Registrar a Compra
      database.compras.push(compra);
      
      // 2. Atualizar Estoque de cada produto
      itens.forEach(item => {
        const prod = database.produtos.find((p: Produto) => p.cd_produto === item.cd_produto);
        if (prod) {
          prod.estoque += item.qtde;
          prod.compra = item.valor_unit; // Atualiza preço de custo
        }
      });
      
      // 3. Gerar Conta a Pagar (se não for confirmada/paga na hora)
      const novaConta: ContaPagar = {
        cd_conta_pagar: Date.now(),
        cd_fornecedores: compra.cd_fornecedores,
        valor: compra.total,
        vencimento: new Date().toISOString(),
        descricao: `Compra NF: ${compra.nota_fiscal || 'S/N'}`,
        pago: false
      };
      database.contasPagar.push(novaConta);
      
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
  },
  os: {
    getAll: (): OS[] => getDB().os,
    add: (os: OS) => {
      const database = getDB();
      database.os.push(os);
      saveDB(database);
    }
  },
  financeiro: {
    getCaixa: (): Caixa[] => getDB().caixa,
    getReceber: (): Receber[] => getDB().receber,
    getPagar: (): ContaPagar[] => getDB().contasPagar,
    getCentroCustos: (): CentroCusto[] => getDB().centroCustos,
    getCheques: (): Cheque[] => getDB().cheques,
    addLancamentoCaixa: (lancamento: Caixa) => {
      const database = getDB();
      database.caixa.push(lancamento);
      saveDB(database);
    }
  }
};