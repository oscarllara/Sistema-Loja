-- Adiciona a coluna integrar_calculadora na tabela produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS integrar_calculadora BOOLEAN DEFAULT false;

-- Garante que as permissões de acesso continuem funcionando
GRANT ALL ON TABLE public.produtos TO authenticated;
GRANT ALL ON TABLE public.produtos TO service_role;