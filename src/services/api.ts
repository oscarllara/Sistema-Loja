"use client";

import { supabase } from '@/integrations/supabase/client';
import { Cliente, Produto, Venda, LancamentoFinanceiro, ContaBancaria, Configuracoes, Compra, Orcamento, Patrimonio, Transferencia } from '../types/database';

const AUTH_KEY = 'dyaderp_auth';

// Cache simples em memória para evitar requisições repetitivas
let productsCache: Produto[] | null = null;

export const db = {
  auth: {
    login: async (usuario: string, senha: string) => {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('usuario', usuario)
        .eq('senha', senha)
        .single();
      
      if (data) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(data));
        return data;
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
    get: async (): Promise<Configuracoes> => {
      const { data, error } = await supabase.from('configuracoes').select('*').single();
      if (error) throw error;
      return data;
    },
    update: async (data: Partial<Configuracoes>) => {
      const { data: config } = await supabase.from('configuracoes').select('id').single();
      if (config) {
        const { error } = await supabase.from('configuracoes').update(data).eq('id', config.id);
        if (error) throw error;
      }
    }
  },
  produtos: {
    getAll: async (forceRefresh = false): Promise<Produto[]> => {
      if (productsCache && !forceRefresh) return productsCache;
      
      const { data, error } = await supabase.from('produtos').select('*').order('nome');
      if (error) throw error;
      productsCache = data || [];
      return productsCache;
    },
    add: async (p: any) => {
      const { data: lastProd } = await supabase.from('produtos').select('id_manual').order('id_manual', { ascending: false }).limit(1).maybeSingle();
      const nextId = lastProd ? (parseInt(lastProd.id_manual) + 1).toString().padStart(5, '0') : '00001';
      const { data, error } = await supabase.from('produtos').insert([{ ...p, id_manual: nextId }]).select().single();
      if (error) throw error;
      productsCache = null; 
      return data;
    },
    bulkAdd: async (products: any[]) => {
      const { error } = await supabase.from('produtos').insert(products);
      if (error) throw error;
      productsCache = null;
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('produtos').update(data).eq('cd_produto', id);
      if (error) throw error;
      productsCache = null;
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('produtos').delete().eq('cd_produto', id);
      if (error) throw error;
      productsCache = null;
    }
  },
  clientes: {
    getAll: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase.from('clientes').select('*').order('nome');
      if (error) throw error;
      return data || [];
    },
    add: async (c: any) => {
      const { error } = await supabase.from('clientes').insert([c]);
      if (error) throw error;
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('clientes').update(data).eq('cd_clientes', id);
      if (error) throw error;
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('clientes').delete().eq('cd_clientes', id);
      if (error) throw error;
    }
  },
  contas: {
    getAll: async (): Promise<ContaBancaria[]> => {
      const { data, error } = await supabase.from('contas').select('*').order('nome');
      if (error) throw error;
      return data || [];
    },
    add: async (c: any) => {
      const { error } = await supabase.from('contas').insert([c]);
      if (error) throw error;
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('contas').update(data).eq('cd_conta', id);
      if (error) throw error;
    }
  },
  financeiro: {
    getAll: async (): Promise<LancamentoFinanceiro[]> => {
      const { data, error } = await supabase.from('financeiro').select('*').order('data_vencimento', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getByEntidade: async (id: number): Promise<LancamentoFinanceiro[]> => {
      const { data, error } = await supabase.from('financeiro').select('*').eq('cd_entidade', id).order('data_vencimento');
      if (error) throw error;
      return data || [];
    },
    add: async (l: any) => {
      const { error } = await supabase.from('financeiro').insert([l]);
      if (error) throw error;
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('financeiro').update(data).eq('cd_lancamento', id);
      if (error) throw error;
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('financeiro').delete().eq('cd_lancamento', id);
      if (error) throw error;
    },
    baixar: async (id: number, cd_conta: number, valor?: number, meio?: string) => {
      const { data: lanc, error: lError } = await supabase.from('financeiro').select('*').eq('cd_lancamento', id).single();
      if (lError) throw lError;
      
      if (lanc) {
        const updateData: any = { status: 'Pago', data_pagamento: new Date().toISOString(), cd_conta };
        if (meio) updateData.meio_pagamento = meio;
        const { error: uError } = await supabase.from('financeiro').update(updateData).eq('cd_lancamento', id);
        if (uError) throw uError;
        
        const { data: conta, error: cError } = await supabase.from('contas').select('saldo').eq('cd_conta', cd_conta).single();
        if (cError) throw cError;
        
        if (conta) {
          const valorBaixa = valor || lanc.valor;
          const novoSaldo = lanc.tipo === 'R' ? Number(conta.saldo) + Number(valorBaixa) : Number(conta.saldo) - Number(valorBaixa);
          const { error: sError } = await supabase.from('contas').update({ saldo: novoSaldo }).eq('cd_conta', cd_conta);
          if (sError) throw sError;
        }
      }
    },
    changeAccount: async (id: number, newAccountId: number) => {
      const { error } = await supabase.from('financeiro').update({ cd_conta: newAccountId }).eq('cd_lancamento', id);
      if (error) throw error;
    },
    transferir: async (t: any) => {
      const { error: e1 } = await supabase.from('financeiro').insert([{
        tipo: 'P',
        descricao: `TRANSFERÊNCIA PARA CONTA #${t.cd_conta_destino} - ${t.obs || ''}`,
        valor: t.valor,
        data_vencimento: t.data,
        data_pagamento: t.data,
        status: 'Pago',
        categoria: 'Transferência',
        cd_conta: t.cd_conta_origem,
        meio_pagamento: 'Transferência'
      }]);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from('financeiro').insert([{
        tipo: 'R',
        descricao: `TRANSFERÊNCIA DE CONTA #${t.cd_conta_origem} - ${t.obs || ''}`,
        valor: t.valor,
        data_vencimento: t.data,
        data_pagamento: t.data,
        status: 'Pago',
        categoria: 'Transferência',
        cd_conta: t.cd_conta_destino,
        meio_pagamento: 'Transferência'
      }]);
      if (e2) throw e2;

      const { data: cOrigem } = await supabase.from('contas').select('saldo').eq('cd_conta', t.cd_conta_origem).single();
      const { data: cDestino } = await supabase.from('contas').select('saldo').eq('cd_conta', t.cd_conta_destino).single();
      
      if (cOrigem) await supabase.from('contas').update({ saldo: Number(cOrigem.saldo) - Number(t.valor) }).eq('cd_conta', t.cd_conta_origem);
      if (cDestino) await supabase.from('contas').update({ saldo: Number(cDestino.saldo) + Number(t.valor) }).eq('cd_conta', t.cd_conta_destino);
    }
  },
  patrimonio: {
    getAll: async (): Promise<Patrimonio[]> => {
      const { data, error } = await supabase.from('patrimonio').select('*').order('descricao');
      if (error) throw error;
      return data || [];
    },
    add: async (p: any) => {
      const { error } = await supabase.from('patrimonio').insert([p]);
      if (error) throw error;
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('patrimonio').update(data).eq('cd_patrimonio', id);
      if (error) throw error;
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('patrimonio').delete().eq('cd_patrimonio', id);
      if (error) throw error;
    }
  },
  vendas: {
    getAll: async (): Promise<Venda[]> => {
      const { data, error } = await supabase.from('vendas').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    getByCliente: async (id: number): Promise<Venda[]> => {
      const { data, error } = await supabase.from('vendas').select('*').eq('cd_clientes', id).order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    add: async (v: any) => {
      const { error } = await supabase.from('vendas').insert([v]);
      if (error) throw error;
    }
  },
  orcamentos: {
    getAll: async (): Promise<Orcamento[]> => {
      const { data, error } = await supabase.from('orcamentos').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('orcamentos').delete().eq('cd_orcamento', id);
      if (error) throw error;
    }
  },
  compras: {
    getAll: async (): Promise<Compra[]> => {
      const { data, error } = await supabase.from('compras').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    save: async (c: any) => {
      const { error } = await supabase.from('compras').upsert([c]);
      if (error) throw error;
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('compras').delete().eq('cd_compra', id);
      if (error) throw error;
    }
  },
  mappings: {
    get: async (fornecedorId: number, codigoExterno: string) => {
      const { data } = await supabase.from('fornecedor_produto_map').select('cd_produto_interno').eq('cd_fornecedor', fornecedorId).eq('codigo_externo', codigoExterno).maybeSingle();
      return data?.cd_produto_interno;
    },
    save: async (fornecedorId: number, codigoExterno: string, produtoId: number) => {
      await supabase.from('fornecedor_produto_map').upsert([{ cd_fornecedor: fornecedorId, codigo_externo: codigoExterno, cd_produto_interno: produtoId }]);
    }
  }
};