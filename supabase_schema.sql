-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_empresa TEXT DEFAULT 'Key Of Inov Dev',
  slogan TEXT DEFAULT 'A chave da Inovação!',
  telefone TEXT,
  cnpj TEXT,
  endereco TEXT,
  tipo_impressao TEXT DEFAULT 'Bobina',
  largura_bobina TEXT DEFAULT '79mm',
  margem_esquerda INTEGER DEFAULT 5,
  margem_direita INTEGER DEFAULT 5,
  margem_topo INTEGER DEFAULT 5,
  margem_rodape INTEGER DEFAULT 5,
  juros_parcelamento NUMERIC DEFAULT 0,
  juros_atraso NUMERIC DEFAULT 0.033,
  multa_atraso NUMERIC DEFAULT 2.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Clientes/Fornecedores/Funcionários
CREATE TABLE IF NOT EXISTS public.clientes (
  cd_clientes BIGSERIAL PRIMARY KEY,
  tipo_entidade TEXT NOT NULL, -- 'C', 'F', 'A', 'T'
  is_funcionario BOOLEAN DEFAULT FALSE,
  nome TEXT NOT NULL,
  apelido_fantasia TEXT,
  cpf_cnpj TEXT,
  rg_ie TEXT,
  inscricao_municipal TEXT,
  sexo TEXT,
  estado_civil TEXT,
  naturalidade TEXT,
  profissao TEXT,
  data_nascimento DATE,
  filiacao_pai TEXT,
  filiacao_mae TEXT,
  conjuge_nome TEXT,
  conjuge_cpf TEXT,
  conjuge_nascimento DATE,
  conjuge_empresa TEXT,
  conjuge_telefone TEXT,
  conjuge_salario NUMERIC,
  local_trabalho TEXT,
  cargo TEXT,
  data_admissao DATE,
  salario NUMERIC,
  dia_pagamento INTEGER,
  site TEXT,
  facebook TEXT,
  instagram TEXT,
  linkedin TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  referencia TEXT,
  tel1 TEXT,
  tel2 TEXT,
  cel TEXT,
  email TEXT,
  limite NUMERIC DEFAULT 0,
  despesa_fixa NUMERIC DEFAULT 0,
  despesa_alimentacao NUMERIC DEFAULT 0,
  despesa_aluguel NUMERIC DEFAULT 0,
  obs1 TEXT,
  usuario TEXT,
  senha TEXT,
  permissoes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  cd_produto BIGSERIAL PRIMARY KEY,
  id_manual TEXT UNIQUE,
  id_importado TEXT,
  nome TEXT NOT NULL,
  un TEXT DEFAULT 'UN',
  un_fracionada TEXT,
  fator_conversao NUMERIC,
  cod_barras TEXT,
  compra NUMERIC DEFAULT 0,
  venda NUMERIC DEFAULT 0,
  venda_vista NUMERIC DEFAULT 0,
  venda_fracionada NUMERIC DEFAULT 0,
  desconto_vista_tipo TEXT DEFAULT 'P',
  desconto_vista_valor NUMERIC DEFAULT 0,
  estoque NUMERIC DEFAULT 0,
  minimo NUMERIC DEFAULT 0,
  cd_fornecedores BIGINT REFERENCES public.clientes(cd_clientes),
  ncm TEXT,
  fracionado BOOLEAN DEFAULT FALSE,
  is_kit BOOLEAN DEFAULT FALSE,
  itens_kit JSONB,
  is_locacao BOOLEAN DEFAULT FALSE,
  valor_diaria NUMERIC DEFAULT 0,
  valor_semana NUMERIC DEFAULT 0,
  valor_quinzena NUMERIC DEFAULT 0,
  valor_mes NUMERIC DEFAULT 0,
  disponivel_site BOOLEAN DEFAULT FALSE,
  preco_site NUMERIC DEFAULT 0,
  imagem_url TEXT,
  link_externo TEXT,
  descricao_site TEXT,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS public.contas (
  cd_conta BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  banco_numero TEXT,
  agencia TEXT,
  conta_numero TEXT,
  saldo_inicial NUMERIC DEFAULT 0,
  saldo NUMERIC DEFAULT 0,
  tipo TEXT NOT NULL -- 'Caixa', 'Banco', 'Retaguarda', 'Digital'
);

-- Tabela de Vendas
CREATE TABLE IF NOT EXISTS public.vendas (
  cd_venda BIGSERIAL PRIMARY KEY,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total NUMERIC NOT NULL,
  custo_total NUMERIC DEFAULT 0,
  cd_clientes BIGINT REFERENCES public.clientes(cd_clientes),
  nome_cliente TEXT,
  cd_func BIGINT REFERENCES public.clientes(cd_clientes),
  tipo_venda TEXT, -- 'Vista', 'Prazo'
  meio_pagamento TEXT,
  itens JSONB NOT NULL
);

-- Tabela de Financeiro (Lançamentos)
CREATE TABLE IF NOT EXISTS public.financeiro (
  cd_lancamento BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'R', 'P'
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Pago', 'Cancelado', 'Devolvido'
  cd_entidade BIGINT REFERENCES public.clientes(cd_clientes),
  nome_entidade TEXT,
  categoria TEXT,
  meio_pagamento TEXT,
  cd_conta BIGINT REFERENCES public.contas(cd_conta),
  cd_venda BIGINT REFERENCES public.vendas(cd_venda),
  num_documento TEXT,
  cheque_num TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso público (para simplificar o ERP interno)
CREATE POLICY "Acesso total para autenticados" ON public.configuracoes FOR ALL USING (true);
CREATE POLICY "Acesso total para autenticados" ON public.clientes FOR ALL USING (true);
CREATE POLICY "Acesso total para autenticados" ON public.produtos FOR ALL USING (true);
CREATE POLICY "Acesso total para autenticados" ON public.contas FOR ALL USING (true);
CREATE POLICY "Acesso total para autenticados" ON public.vendas FOR ALL USING (true);
CREATE POLICY "Acesso total para autenticados" ON public.financeiro FOR ALL USING (true);

-- Inserir dados iniciais se não existirem
INSERT INTO public.contas (nome, saldo, tipo, saldo_inicial) VALUES 
('CAIXA LOJA', 0, 'Caixa', 0),
('SICOOB', 0, 'Banco', 0),
('RETAGUARDA (COFRE)', 0, 'Retaguarda', 0)
ON CONFLICT DO NOTHING;

INSERT INTO public.configuracoes (nome_empresa) VALUES ('Key Of Inov Dev') ON CONFLICT DO NOTHING;