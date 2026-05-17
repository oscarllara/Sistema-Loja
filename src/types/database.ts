"use client";

export type TipoPessoa = 'F' | 'J';
export type TipoEntidade = 'C' | 'F' | 'A' | 'T';

export interface Permissoes {
  dashboard: boolean;
  pos: boolean;
  registrations: boolean;
  inventory: boolean;
  purchases: boolean;
  financial: boolean;
  reports: boolean;
  settings: boolean;
}

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
  usuario?: string;
  senha?: string;
  permissoes?: Permissoes;
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
  itens_kit?: any[];
  data_atualizacao: string;
}

export type TipoFinanceiro = 'R' | 'P'; // Receita | Pagamento
export type MeioPagamento = 'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Cheque' | 'Boleto' | 'Transferência';

export interface LancamentoFinanceiro {
  cd_lancamento: number;
  tipo: TipoFinanceiro;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'Pendente' | 'Pago' | 'Cancelado';
  cd_entidade?: number;
  nome_entidade?: string;
  categoria: string; 
  meio_pagamento?: MeioPagamento;
  bandeira_cartao?: string;
  cd_conta?: number; 
  is_fixa?: boolean;
}

export interface ContaBancaria {
  cd_conta: number;
  nome: string;
  banco_numero?: string;
  agencia?: string;
  conta_numero?: string;
  saldo_inicial: number; // Novo campo
  saldo: number;
  tipo: 'Caixa' | 'Banco' | 'Retaguarda' | 'Digital';
}

export interface Transferencia {
  cd_transferencia: number;
  data: string;
  valor: number;
  cd_conta_origem: number;
  cd_conta_destino: number;
  obs?: string;
}

export interface Patrimonio {
  cd_patrimonio: number;
  descricao: string;
  valor: number;
  tipo: 'Imóvel' | 'Veículo' | 'Equipamento' | 'Outros';
  proprietário: 'Empresa' | 'Sócio A' | 'Sócio B';
}

export interface Venda {
  cd_venda: number;
  data: string;
  total: number;
  custo_total: number; 
  cd_clientes: number;
  cd_func: number;
  tipo_venda: 'Vista' | 'Prazo';
  meio_pagamento: MeioPagamento;
}