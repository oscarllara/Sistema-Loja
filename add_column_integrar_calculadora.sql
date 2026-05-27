ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS integrar_calculadora BOOLEAN DEFAULT false;

-- Garantir que as permissões continuem corretas
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.produtos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.produtos TO service_role;