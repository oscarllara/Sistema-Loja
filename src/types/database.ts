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
  rentals: boolean;
  calculator: boolean;
  is_supervisor: boolean;
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

export interface ItemKitProduto {
  cd_produto: number;
  nome_produto: string;
  quantidade: number;
  unidade?: string;
}

export interface Produto {
  cd_produto: number;
  id_manual: string;
  id_importado?: string;
  nome: string;
  un: string;
  un_fracionada?: string;
  fator_conversao?: number;
  tamanho_caixa?: number;
  cod_barras?: string;
  compra?: number;
  venda: number;
  venda_vista?: number;
  venda_fracionada?: number;
  desconto_vista_tipo?: 'P' | 'V';
  desconto_vista_valor?: number;
  estoque: number;
  minimo?: number;
  cd_fornecedores?: number;
  ncm?: string;
  fracionado?: boolean;
  is_kit?: boolean;
  itens_kit?: ItemKitProduto[];
  data_atualizacao: string;
  is_locacao?: boolean;
  valor_diaria?: number;
  valor_semana?: number;
  valor_quinzena?: number;
  valor_mes?: number;
  disponivel_site?: boolean;
  preco_site?: number;
  imagem_url?: string;
  link_externo?: string;
  descricao_site?: string;
  integrar_calculadora?: boolean;
}

export type TipoFinanceiro = 'R' | 'P';
export type MeioPagamento = 'Dinheiro' | 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Cheque' | 'Boleto' | 'Transferência' | 'Crediário';

export interface LancamentoFinanceiro {
  cd_lancamento: number;
  tipo: TipoFinanceiro;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'Pendente' | 'Pago' | 'Cancelado' | 'Devolvido';
  cd_entidade?: number;
  nome_entidade?: string;
  categoria: string; 
  meio_pagamento?: MeioPagamento;
  bandeira_cartao?: string;
  cd_conta?: number; 
  cd_func?: number;
  is_fixa?: boolean;
  cd_venda?: number;
  cd_compra?: number;
  cd_aluguel?: number;
  is_non_operational?: boolean;
  num_documento?: string;
  banco_nome?: string;
  banco_num?: string;
  agencia?: string;
  conta_num?: string;
  cheque_num?: string;
}

export interface Configuracoes {
  id?: string;
  provider_name: string;
  provider_slogan?: string;
  provider_cnpj: string;
  provider_tel: string;
  provider_email: string;
  provider_logo?: string;
  
  nome_empresa: string;
  slogan: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco: string;
  telefone: string;
  tel2?: string;
  tel3?: string;
  whatsapp_loja?: string;
  site_loja?: string;
  email_loja?: string;
  logo_url?: string;

  tipo_impressao: 'A4' | 'Bobina';
  largura_bobina: '79mm' | '89mm';
  margem_esquerda: number;
  margem_direita: number;
  margem_topo: number;
  margem_rodape: number;
  
  juros_parcelamento: number;
  juros_atraso: number;
  multa_atraso: number;
  dias_carencia_juros: number;
  payment_account_routes?: Record<string, number>;
  whatsapp_suporte?: string;
}

export interface Venda {
  cd_venda: number;
  data: string;
  total: number;
  custo_total: number; 
  cd_clientes: number;
  nome_cliente?: string;
  cd_func: number;
  tipo_venda: 'Vista' | 'Prazo';
  meio_pagamento: MeioPagamento;
  itens: any[];
}

export interface Orcamento extends Omit<Venda, 'cd_venda'> {
  cd_orcamento: number;
  status: 'Aberto' | 'Convertido' | 'Cancelado';
}

export interface CompraItem {
  cd_produto: number;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  un?: string;
}

export interface Compra {
  cd_compra: number;
  data: string;
  nota_fiscal?: string;
  cd_fornecedores?: number;
  nome_fornecedor?: string;
  total: number;
  status: 'Rascunho' | 'Confirmada' | 'Cancelada';
  itens?: CompraItem[];
  items?: CompraItem[];
}

export type StatusAluguel = 'Ativo' | 'Devolvido' | 'Atrasado' | 'Cancelado';
export type PeriodoLocacao = 'Diária' | 'Semana' | 'Quinzena' | 'Mês';

export interface AluguelItem {
  cd_item?: number;
  cd_aluguel?: number;
  cd_produto: number;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  periodo_tipo: PeriodoLocacao;
  subtotal: number;
  devolvido?: boolean;
  data_retirada?: string;
  data_devolucao_prevista?: string;
  data_devolucao_realizada?: string;
  data_devolucao?: string;
  dias?: number;
  calculo_descricao?: string;
}

export interface Aluguel {
  cd_aluguel: number;
  data: string;
  cd_clientes?: number;
  nome_cliente: string;
  cd_func?: number;
  data_inicio: string;
  data_fim_prevista: string;
  data_devolucao?: string;
  periodo_tipo: PeriodoLocacao;
  dias: number;
  total: number;
  valor_pago: number;
  status: StatusAluguel;
  observacoes?: string;
  itens: AluguelItem[];
}

export interface ContaBancaria {
  cd_conta: number;
  nome: string;
  banco_numero?: string;
  agencia?: string;
  conta_numero?: string;
  saldo_inicial: number;
  saldo: number;
  tipo: 'Caixa' | 'Banco' | 'Retaguarda' | 'Digital' | 'Cartão';
}

export type StatusCaixa = 'Aberto' | 'Fechado';

export interface CaixaSessao {
  cd_sessao: number;
  cd_conta: number;
  data_caixa: string;
  status: StatusCaixa;
  saldo_previsto_abertura: number;
  saldo_real_abertura: number;
  diferenca_abertura: number;
  saldo_sistema_fechamento?: number;
  saldo_real_fechamento?: number;
  diferenca_fechamento?: number;
  saldo_para_dia_seguinte?: number;
  observacoes?: string;
  cd_operador?: number;
  aberto_em?: string;
  fechado_em?: string;
  created_at?: string;
}

export interface Patrimonio {
  cd_patrimonio: number;
  descricao: string;
  valor: number;
  tipo: 'Imóvel' | 'Veículo' | 'Equipamento' | 'Outros';
  proprietário: 'Empresa' | 'Sócio A' | 'Sócio B';
  cd_produto_vinculado?: number;
}