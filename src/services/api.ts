"use client";

import { supabase } from '@/integrations/supabase/client';
import { Cliente, Produto, Venda, LancamentoFinanceiro, ContaBancaria, Transferencia, Patrimonio, Orcamento, Configuracoes, Compra, FornecedorProdutoMap } from '../types/database';

const AUTH_KEY = 'dyaderp_auth';

export const db = {
  auth: {
    login: async (usuario: string, senha: string) => {
      const { data, error } = await supabase
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
      const { data } = await supabase.from('configuracoes').select('*').single();
      return data;
    },
    update: async (data: Partial<Configuracoes>) => {
      const { data: config } = await supabase.from('configuracoes').select('id').single();
      if (config) {
        await supabase.from('configuracoes').update(data).eq('id', config.id);
      }
    }
  },
  produtos: {
    getAll: async (): Promise<Produto[]> => {
      const { data } = await supabase.from('produtos').select('*').order('nome');
      return data || [];
    },
    add: async (p: any) => {
      const { data: lastProd } = await supabase.from('produtos').select('id_manual').order('id_manual', { ascending: false }).limit(1).single();
      const nextId = lastProd ? (parseInt(lastProd.id_manual) + 1).toString().padStart(5, '0') : '00001';
      
      const { data, error } = await supabase.from('produtos').insert([{ ...p, id_manual: nextId }]).select().single();
      return data;
    },
    bulkAdd: async (products: any[]) => {
      const { data, error } = await supabase.from('produtos').insert(products);
      return { data, error };
    },
    update: async (id: number, data: any) => {
      await supabase.from('produtos').update(data).eq('cd_produto', id);
    },
    delete: async (id: number) => {
      await supabase.from('produtos').delete().eq('cd_produto', id);
    }
  },
  clientes: {
    getAll: async (): Promise<Cliente[]> => {
      const { data } = await supabase.from('clientes').select('*').order('nome');
      return data || [];
    },
    add: async (c: any) => {
      await supabase.from('clientes').insert([c]);
    },
    update: async (id: number, data: any) => {
      await supabase.from('clientes').update(data).eq('cd_clientes', id);
    },
    delete: async (id: number) => {
      await supabase.from('clientes').delete().eq('cd_clientes', id);
    }
  },
  contas: {
    getAll: async (): Promise<ContaBancaria[]> => {
      const { data } = await supabase.from('contas').select('*').order('nome');
      return data || [];
    }
  },
  financeiro: {
    getAll: async (): Promise<LancamentoFinanceiro[]> => {
      const { data } = await supabase.from('financeiro').select('*').order('data_vencimento');
      return data || [];
    },
    add: async (l: any) => {
      await supabase.from('financeiro').insert([l]);
    }
  },
  vendas: {
    getAll: async (): Promise<Venda[]> => {
      const { data } = await supabase.from('vendas').select('*').order('data', { ascending: false });
      return data || [];
    },
    add: async (v: any) => {
      await supabase.from('vendas').insert([v]);
    }
  }
};