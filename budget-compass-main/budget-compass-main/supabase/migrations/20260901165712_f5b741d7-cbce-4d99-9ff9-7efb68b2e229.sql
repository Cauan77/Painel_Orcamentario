CREATE TABLE public.bases_painel (
  chave TEXT PRIMARY KEY,
  extracao TEXT,
  exercicio INTEGER,
  conteudo JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bases_painel TO anon;
GRANT SELECT ON public.bases_painel TO authenticated;
GRANT ALL ON public.bases_painel TO service_role;

ALTER TABLE public.bases_painel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bases do painel sao publicas para leitura"
ON public.bases_painel FOR SELECT
TO anon, authenticated
USING (true);