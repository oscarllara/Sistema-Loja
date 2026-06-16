"use client";

import { supabase } from '@/integrations/supabase/client';
import { Cliente, Produto, Venda, LancamentoFinanceiro, ContaBancaria, Configuracoes, Compra, Orcamento, Patrimonio, Aluguel, CaixaSessao } from '../types/database';
import { formatAddressTitleCase, formatCnpj, formatCpfCnpj, formatPhoneBR } from '@/utils/formatters';

const AUTH_KEY = 'dyaderp_auth';

const OFFLINE_SALES_KEY = 'dyaderp_offline_sales';

const sanitizeProductPayload = (product: Partial<Produto>) => {
  const payload = { ...product } as Partial<Produto> & { id?: unknown };

  delete payload.id;

  if (payload.id_manual === undefined || payload.id_manual === "") delete payload.id_manual;

  if ('id_importado' in payload && payload.id_importado === "") payload.id_importado = null;
  if ('cod_barras' in payload && payload.cod_barras === "") payload.cod_barras = null;
  if ('ncm' in payload && payload.ncm === "") payload.ncm = null;
  if ('un_fracionada' in payload && payload.un_fracionada === "") payload.un_fracionada = null;
  if ('imagem_url' in payload && payload.imagem_url === "") payload.imagem_url = null;
  if ('link_externo' in payload && payload.link_externo === "") payload.link_externo = null;
  if ('descricao_site' in payload && payload.descricao_site === "") payload.descricao_site = null;
  if ('cd_fornecedores' in payload && payload.cd_fornecedores === undefined) payload.cd_fornecedores = null;
  if ('is_kit' in payload && !payload.is_kit) {
    payload.itens_kit = null;
  }

  return payload;
};

const sanitizeConfigPayload = (config: Partial<Configuracoes>) => {
  const allowedKeys: (keyof Configuracoes)[] = [
    'provider_name',
    'provider_slogan',
    'provider_cnpj',
    'provider_tel',
    'provider_email',
    'provider_logo',
    'nome_empresa',
    'slogan',
    'cnpj',
    'inscricao_estadual',
    'inscricao_municipal',
    'endereco',
    'telefone',
    'tel2',
    'tel3',
    'whatsapp_loja',
    'site_loja',
    'email_loja',
    'logo_url',
    'tipo_impressao',
    'largura_bobina',
    'margem_esquerda',
    'margem_direita',
    'margem_topo',
    'margem_rodape',
    'juros_parcelamento',
    'juros_atraso',
    'multa_atraso',
    'dias_carencia_juros',
    'payment_account_routes',
    'whatsapp_suporte'
  ];

  const payload = allowedKeys.reduce((acc, key) => {
    if (config[key] !== undefined) {
      acc[key] = config[key] as never;
    }
    return acc;
  }, {} as Partial<Configuracoes>);

  if (payload.provider_cnpj) payload.provider_cnpj = formatCpfCnpj(payload.provider_cnpj);
  if (payload.cnpj) payload.cnpj = formatCnpj(payload.cnpj);
  if (payload.provider_tel) payload.provider_tel = formatPhoneBR(payload.provider_tel);
  if (payload.telefone) payload.telefone = formatPhoneBR(payload.telefone);
  if (payload.tel2) payload.tel2 = formatPhoneBR(payload.tel2);
  if (payload.tel3) payload.tel3 = formatPhoneBR(payload.tel3);
  if (payload.whatsapp_loja) payload.whatsapp_loja = formatPhoneBR(payload.whatsapp_loja);
  if (payload.whatsapp_suporte) payload.whatsapp_suporte = formatPhoneBR(payload.whatsapp_suporte);
  if (payload.endereco) payload.endereco = formatAddressTitleCase(payload.endereco);

  return payload;
};

const sanitizeClientPayload = (client: any) => ({
  ...client,
  cpf_cnpj: client.cpf_cnpj ? formatCpfCnpj(client.cpf_cnpj) : client.cpf_cnpj,
  conjuge_cpf: client.conjuge_cpf ? formatCpfCnpj(client.conjuge_cpf) : client.conjuge_cpf,
  tel1: client.tel1 ? formatPhoneBR(client.tel1) : client.tel1,
  tel2: client.tel2 ? formatPhoneBR(client.tel2) : client.tel2,
  cel: client.cel ? formatPhoneBR(client.cel) : client.cel,
  conjuge_telefone: client.conjuge_telefone ? formatPhoneBR(client.conjuge_telefone) : client.conjuge_telefone,
  endereco: client.endereco ? formatAddressTitleCase(client.endereco) : client.endereco,
  bairro: client.bairro ? formatAddressTitleCase(client.bairro) : client.bairro,
  cidade: client.cidade ? formatAddressTitleCase(client.cidade) : client.cidade,
  referencia: client.referencia ? formatAddressTitleCase(client.referencia) : client.referencia,
  complemento: client.complemento ? formatAddressTitleCase(client.complemento) : client.complemento,
});

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
        const { error } = await supabase.from('configuracoes').update(sanitizeConfigPayload(data)).eq('id', config.id);
        if (error) throw error;
      }
    }
  },
  produtos: {
    getAll: async (): Promise<Produto[]> => {
      const pageSize = 1000;

      let from = 0;
      let allProducts: Produto[] = [];

      while (true) {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .order('nome')
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const batch = data || [];
        allProducts = [...allProducts, ...batch];

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      return allProducts;
    },
    add: async (p: Partial<Produto>) => {
      const { data: lastProducts, error: fetchError } = await supabase
        .from('produtos')
        .select('id_manual, id_importado')
        .order('cd_produto', { ascending: false })
        .limit(500);

      if (fetchError) throw fetchError;

      let maxManualId = 0;
      let maxImportedId = 0;

      (lastProducts || []).forEach(item => {
        const manualNum = parseInt(item.id_manual || "0", 10);
        if (!isNaN(manualNum) && manualNum > maxManualId) maxManualId = manualNum;

        const importedNum = parseInt(item.id_importado || "0", 10);
        if (!isNaN(importedNum) && importedNum > maxImportedId) maxImportedId = importedNum;
      });

      const nextManualId = (maxManualId + 1).toString().padStart(5, '0');
      const nextImportedId = String(maxImportedId + 1);

      const { cd_produto, ...productData } = p as Produto;

      const payload = sanitizeProductPayload({
        ...productData,
        id_manual: nextManualId,
        id_importado: productData.id_importado?.trim() || nextImportedId,
        data_atualizacao: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('produtos')
        .insert([payload])
        .select('*');

      if (error) {
        console.error("Erro Real do Supabase:", error);
        throw error;
      }

      const inserted = data?.[0];
      if (!inserted?.cd_produto) {
        throw new Error("O produto não foi confirmado no banco de dados.");
      }

      return inserted;
    },
    update: async (id: number, data: Partial<Produto>) => {
      const { cd_produto, ...updateData } = data as Produto;

      const payload = sanitizeProductPayload({
        ...updateData,
        data_atualizacao: new Date().toISOString()
      });

      const { data: updated, error } = await supabase
        .from('produtos')
        .update(payload)
        .eq('cd_produto', id)
        .select('*')
        .single();

      if (error) throw error;
      return updated;
    },
    bulkAdd: async (products: Partial<Produto>[]) => {
      const payload = products.map(product => sanitizeProductPayload(product));
      const { error } = await supabase.from('produtos').insert(payload);
      return { error };
    },
    delete: async (id: number) => {
      const { error } = await supabase.from('produtos').delete().eq('cd_produto', id);
      if (error) throw error;
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
      const { error } = await supabase.from('clientes').insert([sanitizeClientPayload(c)]);
      if (error) throw error;
    },
    bulkAdd: async (clients: any[]) => {
      const { error } = await supabase.from('clientes').insert(clients.map(sanitizeClientPayload));
      return { error };
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('clientes').update(sanitizeClientPayload(data)).eq('cd_clientes', id);
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
  caixa: {
    getAll: async (): Promise<CaixaSessao[]> => {
      const { data, error } = await supabase.from('caixa_sessoes').select('*').order('data_caixa', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    open: async (data: Partial<CaixaSessao>) => {
      if (data.cd_conta && data.data_caixa) {
        const { data: existing, error: existingError } = await supabase
          .from('caixa_sessoes')
          .select('*')
          .eq('cd_conta', data.cd_conta)
          .eq('data_caixa', data.data_caixa)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) return existing;
      }

      const { data: created, error } = await supabase.from('caixa_sessoes').insert([data]).select('*').single();
      if (error) throw error;
      if (data.cd_conta) {
        const { error: accountError } = await supabase.from('contas').update({ saldo: data.saldo_real_abertura || 0 }).eq('cd_conta', data.cd_conta);
        if (accountError) throw accountError;
      }
      return created;
    },
    close: async (id: number, data: Partial<CaixaSessao>) => {
      const { data: updated, error } = await supabase
        .from('caixa_sessoes')
        .update({ ...data, status: 'Fechado', fechado_em: new Date().toISOString() })
        .eq('cd_sessao', id)
        .select('*')
        .single();
      if (error) throw error;
      if (updated?.cd_conta) {
        const { error: accountError } = await supabase.from('contas').update({ saldo: data.saldo_real_fechamento || data.saldo_para_dia_seguinte || 0 }).eq('cd_conta', updated.cd_conta);
        if (accountError) throw accountError;
      }
      return updated;
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
        const valorOriginal = Number(lanc.valor || 0);
        const valorBaixa = Number(valor || valorOriginal);
        if (valorBaixa <= 0) throw new Error('Valor de baixa inválido.');
        if (valorBaixa > valorOriginal) throw new Error('Valor de baixa maior que o saldo pendente.');

        const dataPagamento = new Date().toISOString();
        const isPartial = valorBaixa < valorOriginal;

        if (isPartial) {
          const valorRestante = Number((valorOriginal - valorBaixa).toFixed(2));
          const { error: partialUpdateError } = await supabase
            .from('financeiro')
            .update({ valor: valorRestante, status: 'Pendente', data_pagamento: null, cd_conta: null })
            .eq('cd_lancamento', id);
          if (partialUpdateError) throw partialUpdateError;

          const { cd_lancamento, ...lancamentoPago } = lanc;
          const paidPayload: any = {
            ...lancamentoPago,
            descricao: `${lanc.descricao} - BAIXA PARCIAL`,
            valor: Number(valorBaixa.toFixed(2)),
            status: 'Pago',
            data_pagamento: dataPagamento,
            cd_conta
          };
          if (meio) paidPayload.meio_pagamento = meio;
          if (cd_func) paidPayload.cd_func = cd_func;

          const { error: paidInsertError } = await supabase.from('financeiro').insert([paidPayload]);
          if (paidInsertError) throw paidInsertError;
        } else {
          const updateData: any = {
            status: 'Pago',
            data_pagamento: dataPagamento,
            cd_conta
          };
          if (meio) updateData.meio_pagamento = meio;
          if (cd_func) updateData.cd_func = cd_func;

          const { error: uError } = await supabase.from('financeiro').update(updateData).eq('cd_lancamento', id);
          if (uError) throw uError;
        }

        const { data: conta, error: cError } = await supabase.from('contas').select('saldo').eq('cd_conta', cd_conta).single();
        if (cError) throw cError;

        if (conta) {
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
        const { data, error } = await supabase.from('vendas').insert([v]).select('*').single();
        if (error) throw error;
        return data;
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
  alugueis: {
    getAll: async (): Promise<Aluguel[]> => {
      const { data: rentals, error } = await supabase.from('alugueis').select('*').order('data', { ascending: false });
      if (error) throw error;

      const ids = (rentals || []).map(r => r.cd_aluguel);
      if (ids.length === 0) return [];

      const { data: items, error: itemsError } = await supabase
        .from('aluguel_itens')
        .select('*')
        .in('cd_aluguel', ids)
        .order('cd_item');

      if (itemsError) throw itemsError;

      return (rentals || []).map(rental => ({
        ...rental,
        itens: (items || []).filter(item => item.cd_aluguel === rental.cd_aluguel)
      })) as Aluguel[];
    },
    create: async (rental: Omit<Aluguel, 'cd_aluguel' | 'data' | 'valor_pago' | 'status'> & { status?: Aluguel['status'] }) => {
      const { itens, ...contract } = rental;
      const { data: created, error } = await supabase
        .from('alugueis')
        .insert([{ ...contract, status: rental.status || 'Ativo', valor_pago: 0 }])
        .select('*')
        .single();

      if (error) throw error;

      const itemsPayload = itens.map(item => ({ ...item, cd_aluguel: created.cd_aluguel }));
      const { error: itemsError } = await supabase.from('aluguel_itens').insert(itemsPayload);
      if (itemsError) throw itemsError;

      for (const item of itens) {
        const { data: product, error: productError } = await supabase
          .from('produtos')
          .select('estoque')
          .eq('cd_produto', item.cd_produto)
          .single();

        if (productError) throw productError;

        const { error: stockError } = await supabase
          .from('produtos')
          .update({ estoque: Number(product.estoque || 0) - Number(item.quantidade || 0), data_atualizacao: new Date().toISOString() })
          .eq('cd_produto', item.cd_produto);

        if (stockError) throw stockError;
      }

      const { error: financeError } = await supabase.from('financeiro').insert([{
        tipo: 'R',
        descricao: `LOCAÇÃO #${created.cd_aluguel} - ${created.nome_cliente}`,
        valor: created.total,
        data_vencimento: created.data_fim_prevista,
        status: 'Pendente',
        cd_entidade: created.cd_clientes,
        nome_entidade: created.nome_cliente,
        categoria: 'Locação',
        meio_pagamento: 'Crediário',
        cd_func: created.cd_func,
        cd_aluguel: created.cd_aluguel
      }]);

      if (financeError) throw financeError;

      return { ...created, itens } as Aluguel;
    },
    returnRental: async (rental: Aluguel) => {
      const itemsToReturn = rental.itens.filter(item => !item.devolvido);

      for (const item of itemsToReturn) {
        const { data: product, error: productError } = await supabase
          .from('produtos')
          .select('estoque')
          .eq('cd_produto', item.cd_produto)
          .single();

        if (productError) throw productError;

        const { error: stockError } = await supabase
          .from('produtos')
          .update({ estoque: Number(product.estoque || 0) + Number(item.quantidade || 0), data_atualizacao: new Date().toISOString() })
          .eq('cd_produto', item.cd_produto);

        if (stockError) throw stockError;

        if (item.cd_item) {
          const returnedAt = new Date().toISOString();
          const { error: itemError } = await supabase
            .from('aluguel_itens')
            .update({ devolvido: true, data_devolucao: returnedAt, data_devolucao_realizada: returnedAt })
            .eq('cd_item', item.cd_item);

          if (itemError) throw itemError;
        }
      }

      const { error } = await supabase
        .from('alugueis')
        .update({ status: 'Devolvido', data_devolucao: new Date().toISOString() })
        .eq('cd_aluguel', rental.cd_aluguel);

      if (error) throw error;
    },
    cancel: async (rental: Aluguel) => {
      const itemsToReturn = rental.itens.filter(item => !item.devolvido);

      for (const item of itemsToReturn) {
        const { data: product, error: productError } = await supabase
          .from('produtos')
          .select('estoque')
          .eq('cd_produto', item.cd_produto)
          .single();

        if (productError) throw productError;

        const { error: stockError } = await supabase
          .from('produtos')
          .update({ estoque: Number(product.estoque || 0) + Number(item.quantidade || 0), data_atualizacao: new Date().toISOString() })
          .eq('cd_produto', item.cd_produto);

        if (stockError) throw stockError;
      }

      const { error: rentalError } = await supabase
        .from('alugueis')
        .update({ status: 'Cancelado', data_devolucao: new Date().toISOString() })
        .eq('cd_aluguel', rental.cd_aluguel);

      if (rentalError) throw rentalError;

      const { error: financeError } = await supabase
        .from('financeiro')
        .update({ status: 'Cancelado' })
        .eq('cd_aluguel', rental.cd_aluguel)
        .eq('status', 'Pendente');

      if (financeError) throw financeError;
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
      let payload = p;

      if (!payload.cd_patrimonio) {
        const { data: lastItem, error: lastError } = await supabase
          .from('patrimonio')
          .select('cd_patrimonio')
          .order('cd_patrimonio', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastError) throw lastError;
        payload = { ...payload, cd_patrimonio: Number(lastItem?.cd_patrimonio || 0) + 1 };
      }

      const { error } = await supabase.from('patrimonio').insert([payload]);
      if (error) throw error;
    },
    update: async (id: number, data: any) => {
      const { error } = await supabase.from('patrimonio').update(data).eq('cd_patrimonio', id);
      if (error) throw error;
    },
    syncProdutoLocacao: async (productId: number, data: Omit<Partial<Patrimonio>, 'cd_patrimonio' | 'cd_produto_vinculado'>) => {
      const payload = {
        ...data,
        cd_produto_vinculado: productId
      };

      const { data: linked, error: linkedError } = await supabase
        .from('patrimonio')
        .select('*')
        .eq('cd_produto_vinculado', productId)
        .maybeSingle();

      if (linkedError) throw linkedError;

      if (linked) {
        await db.patrimonio.update(linked.cd_patrimonio, payload);
        return;
      }

      await db.patrimonio.add(payload);
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