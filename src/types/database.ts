"use client";

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
  cd_func?: number;
}

export interface Funcionario {
  cd_func: number;
  nome: string;
  cpf?: string;
  tel?: string;
  cargo?: string;
  fixo?: number;
  comissao?: number;
  admissao?: string;
  demitido: boolean;
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
  pesavel?: boolean;
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
  pago_dinheiro?: number;
  pago_cartao?: number;
  pago_cheque?: number;
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

export interface OS {
  cd_os: number;
  cd_clientes: number;
  cd_func: number;
  data_chegada: string;
  defeito_aparente?: string;
  situacao_atual: string;
  valor: number;
  fechado: boolean;
  aparelho?: string;
  marca?: string;
  modelo?: string;
}

export interface Compra {
  cd_compra: number;
  data: string;
  nota_fiscal?: string;
  total: number;
  cd_fornecedores: number;
  cd_func: number;
  confirmada: boolean;
}

export interface ContaPagar {
  cd_conta_pagar: number;
  cd_fornecedores: number;
  valor: number;
  vencimento: string;
  descricao: string;
  pago: boolean;
  data_pagamento?: string;
  cd_centro_custos?: number;
}

export interface Receber {
  cd_receber: number;
  cd_clientes: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  data?: string;
  cd_venda?: number;
  cd_os?: number;
}

export interface Caixa {
  cd_caixa: number;
  data: string;
  descricao: string;
  entrada: number;
  saida: number;
  atual: number;
  cd_func?: number;
  hora?: string;
}

export interface CentroCusto {
  cd_centro_custos: number;
  descricao: string;
}

export interface Cheque {
  cd_cheque: number;
  cd_clientes?: number;
  cd_fornecedores?: number;
  banco?: string;
  n_cheque?: string;
  valor: number;
  vencimento: string;
  pago: boolean;
}