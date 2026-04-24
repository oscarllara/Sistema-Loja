export interface Cliente {
  cd_clientes: number;
  data: string;
  nome: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  cpf?: string;
  cnpj?: string;
  tel1?: string;
  cel?: string;
  email?: string;
  limite?: number;
  obs1?: string;
  fantasia?: string;
}

export interface Produto {
  cd_produto: number;
  nome: string;
  un?: string;
  cod_barras?: string;
  compra?: number;
  venda: number;
  estoque: number;
  minimo?: number;
  cd_fornecedores?: number;
  cd_grupo?: number;
  cd_fabricantes?: number;
  ncm?: string;
}

export interface Venda {
  cd_venda: number;
  data: string;
  total: number;
  pago: number;
  cd_clientes: number;
  cd_func: number;
  hora?: number;
  descontos?: number;
}

export interface ItemVenda {
  cd_desc_venda: number;
  cd_venda: number;
  cd_produto: number;
  nome_prod: string;
  valor: number;
  qtde: number;
  sub: number;
}

export interface ContaPagar {
  cd_conta_pagar: number;
  cd_fornecedores: number;
  valor: number;
  vencimento: string;
  descricao: string;
  pago: boolean;
  data_pagamento?: string;
}

export interface Receber {
  cd_receber: number;
  cd_clientes: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  data?: string;
}

export interface Caixa {
  cd_caixa: number;
  data: string;
  descricao: string;
  entrada: number;
  saida: number;
  atual: number;
}