"use client";

export type TipoPessoa = 'F' | 'J';
export type TipoEntidade = 'C' | 'F' | 'A' | 'T';

export interface Cliente {
  cd_clientes: number;
  tipo_entidade: TipoEntidade;
  is_funcionario: boolean;
  data: string;
  nome: string;
  apelido_fantasia?: string;
  cpf_cnpj?: string;
  rg_ie?: string;
  inscricao_municipal?: string;
  sexo?: string;
  estado_civil?: string;
  naturalidade?: string;
  profissao?: string;
  data_nascimento?: string;
  filiacao_pai?: string;
  filiacao_mae?: string;
  conjuge_nome?: string;
  conjuge_cpf?: string;
  conjuge_nascimento?: string;
  conjuge_empresa?: string;
  conjuge_telefone?: string;
  conjuge_salario?: number;
  local_trabalho?: string;
  cargo?: string;
  data_admissao?: string;
  salario?: number;
  dia_pagamento?: number;
  site?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  referencia?: string;
  tel1?: string;
  tel2?: string;
  cel?: string;
  email?: string;
  limite?: number;
  despesa_fixa?: number;
  despesa_alimentacao?: number;
  despesa_aluguel?: number;
  obs1?: string;
}

export interface ItemComposicao {
  cd_produto_filho: number;
  qtde: number;
}

export interface Produto {
  cd_produto: number;
  id_manual: string;
  id_importado?: string;
  nome: string;
  un: string;
  un_fracionada?: string;
  fator_conversao?: number;
  cod_barras?: string;
  compra?: number;
  venda: number;
  venda_vista?: number;
  desconto_vista_tipo?: 'P' | 'V';
  desconto_vista_valor?: number;
  estoque: number;
  minimo?: number;
  cd_fornecedores?: number;
  ncm?: string;
  fracionado?: boolean;
  is_kit?: boolean;
  itens_kit?: ItemComposicao[];
  data_atualizacao: string;
}

export interface Venda {
  cd_venda: number;
  data: string;
  total: number;
  pago: number;
  cd_clientes: number;
  cd_func: number;
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

export interface Compra {
  cd_compra: number;
  data: string;
  nota_fiscal?: string;
  total: number;
  cd_fornecedores: number;
  cd_func: number;
  confirmada: boolean;
}

export type TipoFinanceiro = 'R' | 'P'; // R: Receber, P: Pagar

export interface LancamentoFinanceiro {
  cd_lancamento: number;
  tipo: TipoFinanceiro;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'Pendente' | 'Pago' | 'Cancelado';
  cd_entidade?: number; // Cliente ou Fornecedor
  nome_entidade?: string;
  categoria?: string;
  forma_pagamento?: string;
}

export interface ContaBancaria {
  cd_conta: number;
  nome: string;
  saldo: number;
  tipo: 'Caixa' | 'Banco' | 'Digital';
}