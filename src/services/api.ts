"use client";

import { Cliente, Produto, Venda, LancamentoFinanceiro, ContaBancaria, Transferencia, Patrimonio, Orcamento, Configuracoes, Compra, FornecedorProdutoMap } from '../types/database';

const STORAGE_KEY = 'dyaderp_db';
const AUTH_KEY = 'dyaderp_auth';

const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  let database: any;

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

  const defaultConfig: Configuracoes = {
    nome_empresa: 'Key Of Inov Dev',
    slogan: 'A chave da Inovação!',
    telefone: '+55 (35) 99842-1050',
    cnpj: '00.000.000/0001-00',
    endereco: 'Rua Exemplo, 123 - Centro',
    tipo_impressao: 'Bobina',
    largura_bobina: '79mm',
    margem_esquerda: 5,
    margem_direita: 5,
    margem_topo: 5,
    margem_rodape: 5,
    juros_parcelamento: 0,
    juros_atraso: 0.033, // 1% ao mês aprox.
    multa_atraso: 2.00    // 2% de multa padrão
  };

  if (!data) {
    database = {
      clientes: [adminUser],
      produtos: [],
      vendas: [],
      orcamentos: [],
      compras: [],
      financeiro: [],
      transferencias: [],
      patrimonio: [],
      mappings: [],
      configuracoes: defaultConfig,
      contas: [
        { cd_conta: 1, nome: 'CAIXA LOJA', saldo: 0, tipo: 'Caixa', saldo_inicial: 0 },
        { cd_conta: 2, nome: 'SICOOB', saldo: 0, tipo: 'Banco', saldo_inicial: 0 },
        { cd_conta: 3, nome: 'RETAGUARDA (COFRE)', saldo: 0, tipo: 'Retaguarda', saldo_inicial: 0 }
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } else {
    try {
      database = JSON.parse(data);
    } catch (e) {
      database = {};
    }
    
    if (!Array.isArray(database.clientes)) database.clientes = [adminUser];
    if (!Array.isArray(database.produtos)) database.produtos = [];
    if (!Array.isArray(database.vendas)) database.vendas = [];
    if (!Array.isArray(database.orcamentos)) database.orcamentos = [];
    if (!Array.isArray(database.compras)) database.compras = [];
    if (!Array.isArray(database.financeiro)) database.financeiro = [];
    if (!Array.isArray(database.transferencias)) database.transferencias = [];
    if (!Array.isArray(database.patrimonio)) database.patrimonio = [];
    if (!Array.isArray(database.mappings)) database.mappings = [];
    
    if (!database.configuracoes) {
      database.configuracoes = defaultConfig;
    } else {
      database.configuracoes = { ...defaultConfig, ...database.configuracoes };
    }
    
    if (!Array.isArray(database.contas) || database.contas.length === 0) {
      database.contas = [
        { cd_conta: 1, nome: 'CAIXA LOJA', saldo: 0, tipo: 'Caixa', saldo_inicial: 0 },
        { cd_conta: 2, nome: 'SICOOB', saldo: 0, tipo: 'Banco', saldo_inicial: 0 },
        { cd_conta: 3, nome: 'RETAGUARDA (COFRE)', saldo: 0, tipo: 'Retaguarda', saldo_inicial: 0 }
      ];
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
    logout: () => localStorage.removeItem(AUTH_KEY),
    getUser: (): Cliente | null => {
      try {
        const data = localStorage.getItem(AUTH_KEY);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    }
  },
  config: {
    get: (): Configuracoes => getDB().configuracoes,
    update: (data: Partial<Configuracoes>) => {
      const database = getDB();
      database.configuracoes = { ...database.configuracoes, ...data };
      saveDB(database);
    }
  },
  mappings: {
    get: (cd_fornecedor: number, codigo_externo: string): number | null => {
      const database = getDB();
      const map = database.mappings.find((m: FornecedorProdutoMap) => 
        m.cd_fornecedor === cd_fornecedor && m.codigo_externo === codigo_externo
      );
      return map ? map.cd_produto_interno : null;
    },
    save: (cd_fornecedor: number, codigo_externo: string, cd_produto_interno: number) => {
      const database = getDB();
      const idx = database.mappings.findIndex((m: FornecedorProdutoMap) => 
        m.cd_fornecedor === cd_fornecedor && m.codigo_externo === codigo_externo
      );
      if (idx !== -1) {
        database.mappings[idx].cd_produto_interno = cd_produto_interno;
      } else {
        database.mappings.push({ cd_fornecedor, codigo_externo, cd_produto_interno });
      }
      saveDB(database);
    }
  },
  compras: {
    getAll: (): Compra[] => getDB().compras || [],
    save: (compra: Compra) => {
      const database = getDB();
      const idx = database.compras.findIndex((c: any) => c.cd_compra === compra.cd_compra);
      
      if (compra.status === 'Confirmada') {
        compra.itens.forEach(item => {
          if (item.cd_produto) {
            const pIdx = database.produtos.findIndex((p: any) => p.cd_produto === item.cd_produto);
            if (pIdx !== -1) {
              database.produtos[pIdx].estoque += item.qtde;
              database.produtos[pIdx].compra = item.valor_unit;
              database.produtos[pIdx].venda = item.valor_venda;
              database.produtos[pIdx].data_atualizacao = new Date().toISOString();
            }
            if (item.codigo_fornecedor) {
              const mIdx = database.mappings.findIndex((m: any) => 
                m.cd_fornecedor === compra.cd_fornecedores && m.codigo_externo === item.codigo_fornecedor
              );
              if (mIdx === -1) {
                database.mappings.push({
                  cd_fornecedor: compra.cd_fornecedores,
                  codigo_externo: item.codigo_fornecedor,
                  cd_produto_interno: item.cd_produto
                });
              }
            }
          }
        });

        database.financeiro.push({
          cd_lancamento: Date.now(),
          tipo: 'P',
          descricao: `Compra NF ${compra.nota_fiscal || 'S/N'}`,
          valor: compra.total,
          data_vencimento: new Date().toISOString(),
          status: 'Pendente',
          cd_entidade: compra.cd_fornecedores,
          nome_entidade: compra.nome_fornecedor,
          categoria: 'Fornecedor',
          cd_compra: compra.cd_compra
        });
      }

      if (idx !== -1) {
        database.compras[idx] = compra;
      } else {
        database.compras.push(compra);
      }
      saveDB(database);
    },
    delete: (id: number) => {
      const database = getDB();
      database.compras = database.compras.filter((c: any) => c.cd_compra !== id);
      saveDB(database);
    }
  },
  orcamentos: {
    getAll: (): Orcamento[] => getDB().orcamentos || [],
    add: (o: Omit<Orcamento, 'cd_orcamento'>) => {
      const database = getDB();
      const nextId = (database.orcamentos.length > 0) 
        ? Math.max(...database.orcamentos.map((orc: any) => orc.cd_orcamento)) + 1 
        : 100;
      
      const novo = { ...o, cd_orcamento: nextId, status: 'Aberto' as const };
      database.orcamentos.push(novo);
      saveDB(database);
      return novo;
    },
    updateStatus: (id: number, status: Orcamento['status']) => {
      const database = getDB();
      const idx = database.orcamentos.findIndex((o: any) => o.cd_orcamento === id);
      if (idx !== -1) {
        database.orcamentos[idx].status = status;
        saveDB(database);
      }
    },
    delete: (id: number) => {
      const database = getDB();
      database.orcamentos = database.orcamentos.filter((o: any) => o.cd_orcamento !== id);
      saveDB(database);
    }
  },
  financeiro: {
    getAll: (): LancamentoFinanceiro[] => getDB().financeiro || [],
    getByEntidade: (cd_entidade: number): LancamentoFinanceiro[] => {
      return (getDB().financeiro || []).filter((l: any) => l.cd_entidade === cd_entidade);
    },
    add: (lancamento: Omit<LancamentoFinanceiro, 'cd_lancamento'>) => {
      const database = getDB();
      const novo = { ...lancamento, cd_lancamento: Date.now() };
      database.financeiro.push(novo);
      if (novo.status === 'Pago' && novo.cd_conta) {
        const cIdx = database.contas.findIndex((c: any) => c.cd_conta === novo.cd_conta);
        if (cIdx !== -1) {
          if (novo.tipo === 'R') database.contas[cIdx].saldo += novo.valor;
          else database.contas[cIdx].saldo -= novo.valor;
        }
      }
      saveDB(database);
    },
    baixar: (id: number, cd_conta: number) => {
      const database = getDB();
      const index = database.financeiro.findIndex((l: any) => l.cd_lancamento === id);
      const cIdx = database.contas.findIndex((c: any) => c.cd_conta === cd_conta);
      if (index !== -1 && cIdx !== -1) {
        const lanc = database.financeiro[index];
        if (lanc.status === 'Pago') return;
        lanc.status = 'Pago';
        lanc.cd_conta = cd_conta;
        lanc.data_pagamento = new Date().toISOString();
        if (lanc.tipo === 'R') database.contas[cIdx].saldo += lanc.valor;
        else database.contas[cIdx].saldo -= lanc.valor;
        saveDB(database);
      }
    },
    transferir: (transf: Omit<Transferencia, 'cd_transferencia'>) => {
      const database = getDB();
      const oIdx = database.contas.findIndex((c: any) => c.cd_conta === transf.cd_conta_origem);
      const dIdx = database.contas.findIndex((c: any) => c.cd_conta === transf.cd_conta_destino);
      if (oIdx !== -1 && dIdx !== -1) {
        database.contas[oIdx].saldo -= transf.valor;
        database.contas[dIdx].saldo += transf.valor;
        database.transferencias.push({ ...transf, cd_transferencia: Date.now() });
        saveDB(database);
      }
    },
    changeAccount: (lancamentoId: number, newAccountId: number) => {
      const database = getDB();
      const lIdx = database.financeiro.findIndex((l: any) => l.cd_lancamento === lancamentoId);
      if (lIdx === -1) return;
      
      const lanc = database.financeiro[lIdx];
      if (lanc.cd_conta === newAccountId) return;
      
      if (lanc.status === 'Pago' && lanc.cd_conta) {
        const oldCIdx = database.contas.findIndex((c: any) => c.cd_conta === lanc.cd_conta);
        if (oldCIdx !== -1) {
          if (lanc.tipo === 'R') database.contas[oldCIdx].saldo -= lanc.valor;
          else database.contas[oldCIdx].saldo += lanc.valor;
        }
      }
      
      lanc.cd_conta = newAccountId;
      if (lanc.status === 'Pago') {
        const newCIdx = database.contas.findIndex((c: any) => c.cd_conta === newAccountId);
        if (newCIdx !== -1) {
          if (lanc.tipo === 'R') database.contas[newCIdx].saldo += lanc.valor;
          else database.contas[newCIdx].saldo -= lanc.valor;
        }
      }
      
      saveDB(database);
    }
  },
  vendas: {
    getAll: (): Venda[] => getDB().vendas || [],
    getByCliente: (cd_clientes: number): Venda[] => {
      return (getDB().vendas || []).filter((v: any) => v.cd_clientes === cd_clientes);
    },
    add: (v: Venda) => {
      const database = getDB();
      database.vendas.push(v);
      saveDB(database);
    }
  },
  clientes: {
    getAll: (): Cliente[] => getDB().clientes || [],
    add: (c: Cliente) => { const db = getDB(); db.clientes.push(c); saveDB(db); },
    update: (id: number, data: any) => {
      const db = getDB();
      const idx = db.clientes.findIndex((c: any) => c.cd_clientes === id);
      if (idx !== -1) { db.clientes[idx] = { ...db.clientes[idx], ...data }; saveDB(db); }
    },
    delete: (id: number) => {
      const db = getDB();
      db.clientes = db.clientes.filter((c: any) => c.cd_clientes !== id);
      saveDB(db);
    }
  },
  produtos: {
    getAll: (): Produto[] => getDB().produtos || [],
    add: (p: any) => {
      const db = getDB();
      const id = (db.produtos.length + 1).toString().padStart(5, '0');
      const novo = { ...p, id_manual: id, cd_produto: Date.now(), data_atualizacao: new Date().toISOString() };
      db.produtos.push(novo);
      saveDB(db);
      return novo;
    },
    update: (id: number, data: any) => {
      const db = getDB();
      const idx = db.produtos.findIndex((p: any) => p.cd_produto === id);
      if (idx !== -1) { db.produtos[idx] = { ...db.produtos[idx], ...data }; saveDB(db); }
    },
    delete: (id: number) => {
      const db = getDB();
      db.produtos = db.produtos.filter((p: any) => p.cd_produto !== id);
      saveDB(db);
    }
  },
  contas: {
    getAll: (): ContaBancaria[] => getDB().contas || [],
    add: (c: Omit<ContaBancaria, 'cd_conta'>) => {
      const database = getDB();
      database.contas.push({ ...c, cd_conta: Date.now() });
      saveDB(database);
    },
    update: (id: number, data: Partial<ContaBancaria>) => {
      const database = getDB();
      const idx = database.contas.findIndex((c: any) => c.cd_conta === id);
      if (idx !== -1) {
        database.contas[idx] = { ...database.contas[idx], ...data };
        saveDB(database);
      }
    }
  },
  patrimonio: {
    getAll: (): Patrimonio[] => getDB().patrimonio || [],
    add: (item: Omit<Patrimonio, 'cd_patrimonio'>) => {
      const database = getDB();
      if (!database.patrimonio) database.patrimonio = [];
      database.patrimonio.push({ ...item, cd_patrimonio: Date.now() });
      saveDB(database);
    }
  }
};