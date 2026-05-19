"use client";

import { supabase } from '@/integrations/supabase/client';
import { Cliente, Produto, Venda, LancamentoFinanceiro, ContaBancaria, Configuracoes, Compra, Orcamento } from '../types/database';

const AUTH_KEY = 'dyaderp_auth';

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
      const { data: lastProd } = await supabase.from('produtos').select('id_manual').order('id_manual', { ascending: false }).limit(1).maybeSingle();
      const nextId = lastProd ? (parseInt(lastProd.id_manual) + 1).toString().padStart(5, '0') : '00001';
      const { data } = await supabase.from('produtos').insert([{ ...p, id_manual: nextId }]).select().single();
      return data;
    },
    bulkAdd: async (products: any[]) => {
      return await supabase.from('produtos').insert(products);
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
      const { data } = await supabase.from('financeiro').select('*').order('data_vencimento', { ascending: false });
      return data || [];
    },
    getByEntidade: async (id: number): Promise<LancamentoFinanceiro[]> => {
      const { data } = await supabase.from('financeiro').select('*').eq('cd_entidade', id).order('data_vencimento');
      return data || [];
    },
    add: async (l: any) => {
      await supabase.from('financeiro').insert([l]);
    },
    baixar: async (id: number, cd_conta: number, valor?: number, meio?: string) => {
      const { data: lanc } = await supabase.from('financeiro').select('*').eq('cd_lancamento', id).single();
      if (lanc) {
        const updateData: any = { status: 'Pago', data_pagamento: new Date().toISOString(), cd_conta };
        if (meio) updateData.meio_pagamento = meio;
        await supabase.from('financeiro').update(updateData).eq('cd_lancamento', id);
        
        // Atualizar saldo da conta
        const { data: conta } = await supabase.from('contas').select('saldo').eq('cd_conta', cd_conta).single();
        if (conta) {
          const valorBaixa = valor || lanc.valor;
          const novoSaldo = lanc.tipo === 'R' ? conta.saldo + valorBaixa : conta.saldo - valorBaixa;
          await supabase.from('contas').update({ saldo: novoSaldo }).eq('cd_conta', cd_conta);
        }
      }
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
  },
  orcamentos: {
    getAll: async (): Promise<Orcamento[]> => {
      // Implementação simplificada usando a tabela de vendas com flag ou tabela própria
      return []; 
    }
  },
  mappings: {
    get: async (fornecedorId: number, codigoExterno: string) => {
      return null; // Implementar se necessário
    },
    save: async (fornecedorId: number, codigoExterno: string, produtoId: number) => {
      // Salvar vínculo
    }
  }
};