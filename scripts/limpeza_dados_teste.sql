-- ============================================================================
-- PROBLEMA 6 — Limpeza de dados de teste/homologação
-- Remove produtos e categorias artificiais criados durante stress/homologação.
-- Idempotente: pode rodar várias vezes sem erro.
-- ============================================================================

-- Produtos de teste (stress, criados por gerente/operador em homologação)
DELETE FROM produtos
WHERE nome ILIKE 'Produto Stress%'
   OR nome ILIKE 'Prod Gerente%'
   OR nome ILIKE 'Produto criado por operador%'
   OR nome ILIKE 'Produto Teste%'
   OR nome ILIKE 'Teste %'
   OR nome ILIKE '%homolog%'
   OR codigo ILIKE 'STRESS%'
   OR codigo ILIKE 'TESTE%';

-- Categorias artificiais Cat56-* e similares de homologação
DELETE FROM categorias
WHERE nome ILIKE 'Cat56-%'
   OR nome ILIKE 'Cat\_%' ESCAPE '\'
   OR nome ILIKE 'Categoria Teste%'
   OR nome ILIKE 'Teste %'
   OR nome ILIKE '%homolog%';
