"use client";

export type TipoPessoa = 'F' | 'J';
export type TipoEntidade = 'C' | 'F' | 'A'; // Cliente, Fornecedor, Ambos

export interface EnderecoAdicional {
  tipo: 'Entrega' | 'Cobrança' | 'Trabalho';
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface Cliente {
  cd_clientes: number;
  tipo_entidade: TipoEntidade;
  tipo_pessoa: TipoPessoa;
  data: string;
  nome: string;
  apelido_fantasia?: string;
  
  // Documentos
  cpf_cnpj?: string;
  rg_ie?: string;
  tipo_documento?: string; // RG, CNH, Passaporte, etc.
  
  // Pessoal (PF)
  sexo?: string;
  estado_civil?: string;
  naturalidade?: string;
  profissao?: string;
  data_nascimento?: string;
  filiacao_pai?: string;
  filiacao_mae?: string;
  
  // Cônjuge
  conjuge_nome?: string;
  conjuge_nascimento?: string;
  conjuge_empresa?: string;
  conjuge_telefone?: string;
  conjuge_salario?: number;
  
  // Profissional
  local_trabalho?: string;
  cargo?: string;
  data_admissao?: string;
  salario?: number;
  
  // Endereço Principal
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  referencia?: string;
  
  // Contato
  tel1?: string;
  tel2?: string;
  cel?: string;
  email?: string;
  
  // Financeiro / Adicional
  limite?: number;
  despesa_fixa?: number; // Água/Luz/Tel
  despesa_alimentacao?: number;
  despesa_aluguel?: number;
  obs1?: string;
  
  // Autorizações
  pessoas_autorizadas?: string[]; // Lista de nomes
  
  // Múltiplos Endereços
  enderecos_adicionais?: EnderecoAdicional[];
}

// ... manter as outras interfaces (Produto, Venda, etc)
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