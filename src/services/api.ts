"use client";

import { supabase } from '@/integrations/supabase/client';
import { Cliente, Produto, Venda, LancamentoFinanceiro, ContaBancaria, Configuracoes, Compra, Orcamento, Patrimonio } from '../types/database';

const AUTH_KEY = 'dyaderp_auth';
const OFFLINE_SALES_KEY = 'dyaderp_offline_sales';
const PRODUCTS_CACHE_KEY = 'dyaderp_products_cache';

export const db = {
  auth: {
    login: async (usuario: string, senha: string) => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('usuario', usuario)
        .eq('senha', senha)
        .maybeSingle();
      
      if (error) throw error;
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
    getAll: async (): Promise<Produto[]> => {
      try {
        // Sempre tenta buscar do banco primeiro para garantir dados novos
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .order('nome');
        
        if (error) throw error;
        
        if (data) {
          localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(data));
          return data;
        }
        return [];
      } catch (err) {
        const cache = localStorage.getItem(PRODUCTS_CACHE_KEY);
        return cache ? JSON.parse(cache) : [];
      }
    },
    add: async (p: any) => {
      const { data: lastProd } = await supabase
        .from('produtos')
        .select('id_manual')
        .order('id_manual', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextId = lastProd 
        ? (parseInt(lastProd.id_manual) + 1).toString().padStart(5, '0') 
        : '00001';

      const { data, error } = await supabase
        .from('produtos')
        .insert([{ ...p, id_manual: nextId }])
        .select()
        .single();
      
      if (error) throw error;
      
      // LIMPA O CACHE IMEDIATAMENTE
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      return data;
    },
    bulkAdd: async (products: any[]) => {
      const { error } = await supabase.from('produtos').insert(products);
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      return { error };
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('produtos').update(data).eq('cd_produto', id);
      if (error) throw error;
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('produtos').delete().eq('cd_produto', id);
      if (error) throw error;
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
    }
  },
  clientes: {
    getAll: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase.from('clientes').select('*').order('nome');
      if (error) throw error;
      return data || [];
    },
    checkStatus: async (id: number) => {
      const { data: financeiro } = await supabase
        .from('financeiro')
        .select('valor, data_vencimento')
        .eq('cd_entidade', id)
        .eq('status', 'Pendente')
        .eq('tipo', 'R');
      
      const today = new Date().toISOString().split('T')[0];
      const atrasado = (financeiro || []).some(l => l.data_vencimento < today);
      const totalPendente = (financeiro || []).reduce((acc, l) => acc + l.valor, 0);
      
      return { atrasado, totalPendente };
    },
    add: async (c: any) => {
      const { error } = await supabase.from('clientes').insert([c]);
      if (error) throw error;
    },
    bulkAdd: async (clients: any[]) => {
      const { error } = await supabase.from('clientes').insert(clients);
      return { error };
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
    baixar: async (id: number, cd_conta: number, valor?: number, meio?: string, cd_func?: number) => {
      const { data: lanc, error: lError } = await supabase.from('financeiro').select('*').eq('cd_lancamento', id).single();
      if (lError) throw lError;
      
      if (lanc) {
        const updateData: any = { 
          status: 'Pago', 
          data_pagamento: new Date().toISOString(), 
          cd_conta 
        };
        if (meio) updateData.meio_pagamento = meio;
        if (cd_func) updateData.cd_func = cd_func;

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
    },
    changeAccount: async (lancamentoId: number, newAccountId: number) => {
      const { error } = await supabase.from('financeiro').update({ cd_conta: newAccountId }).eq('cd_lancamento', lancamentoId);
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
      try {
        const { error } = await supabase.from('vendas').insert([v]);
        if (error) throw error;
      } catch (err) {
        const offlineSales = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || '[]');
        offlineSales.push({ ...v, offline: true, timestamp: Date.now() });
        localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(offlineSales));
        throw new Error("OFFLINE_SAVED");
      }
    },
    getOfflineCount: () => {
      const offlineSales = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || '[]');
      return offlineSales.length;
    },
    syncOffline: async () => {
      const offlineSales = JSON.parse(localStorage.getItem(OFFLINE_SALES_KEY) || '[]');
      if (offlineSales.length === 0) return 0;

      let syncedCount = 0;
      const remainingSales = [];

      for (const sale of offlineSales) {
        try {
          const { offline, timestamp, ...saleData } = sale;
          const { error } = await supabase.from('vendas').insert([saleData]);
          if (error) throw error;
          syncedCount++;
        } catch (err) {
          remainingSales.push(sale);
        }
      }

      localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(remainingSales));
      return syncedCount;
    }
  },
  orcamentos: {
    getAll: async (): Promise<Orcamento[]> => {
      const { data, error } = await supabase.from('orcamentos').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    add: async (o: any) => {
      const { error } = await supabase.from('orcamentos').insert([o]);
      if (error) throw error;
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
  mappings: {
    save: async (cd_fornecedor: number, codigo_externo: string, cd_produto_interno: number) => {
      const { error } = await supabase
        .from('fornecedor_produto_map')
        .upsert({ 
          cd_fornecedor, 
          codigo_externo, 
          cd_produto_interno 
        }, { onConflict: 'cd_fornecedor,codigo_externo' });
      if (error) throw error;
    }
  }
};