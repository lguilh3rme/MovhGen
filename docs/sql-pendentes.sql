-- SQL PRONTO, NAO APLICADO (preparado em 22/11/2026). Aplicar so com autorizacao explicita do dono (DDL no Supabase cfanjhuzrcgxrbfmhahi).
-- Idempotente: pode rodar mais de uma vez. Depois de aplicar, dar baixa em docs/pendencias-triagem.md (item 1).

-- 1) Professor poder ENVIAR/TROCAR fotos de avaliacao dos proprios alunos no bucket 'avaliacoes'
--    (hoje o professor so tem SELECT; so o aluno insere/atualiza na propria pasta).
--    A 1a pasta do caminho do arquivo e o id do aluno (mesmo padrao das politicas de SELECT existentes).
drop policy if exists "professor envia fotos dos proprios alunos" on storage.objects;
create policy "professor envia fotos dos proprios alunos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avaliacoes'
    and exists (select 1 from public.alunos a
                where a.id::text = (storage.foldername(name))[1]
                  and a.professor_id = auth.uid())
  );

drop policy if exists "professor atualiza fotos dos proprios alunos" on storage.objects;
create policy "professor atualiza fotos dos proprios alunos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avaliacoes'
    and exists (select 1 from public.alunos a
                where a.id::text = (storage.foldername(name))[1]
                  and a.professor_id = auth.uid())
  );

-- Teste depois de aplicar (como professor, no Gerador): trocar a foto de uma avaliacao por upload.
-- Reverter: drop policy "professor envia fotos dos proprios alunos" on storage.objects;
--           drop policy "professor atualiza fotos dos proprios alunos" on storage.objects;

-- 2) EXERCICIOS que faltam: NAO escrito de proposito. O banco (195 ex.) nao tem Flexao, Barra fixa nem
--    Agachamento na caixa pelos nomes em portugues (so Agachamento Hack/Sumo e Lunge Thruster). Antes de inserir,
--    o dono define nome_pt/nome_en e categoria (as categorias tem emoji, ex.: '🦵 Squat'); colunas obrigatorias:
--    professor_id, categoria, nome. Preencher tambem padrao_movimento, grupo_primario, nivel, lateralidade, multiarticular.
