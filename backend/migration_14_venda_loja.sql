-- Migration 14 (Fase 6.5): venda por loja.
-- Kardex passa a registrar a unidade; estoque_unidade é semeado a partir do
-- estoque consolidado para a unidade matriz (id 1), para que o controle por
-- loja tenha um saldo inicial coerente.

ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS unidade_id INT NULL REFERENCES unidades(id);
-- tipo precisa comportar 'SAIDA_VENDA' (11) e 'TRANSFERENCIA' (13); era varchar(10).
ALTER TABLE estoque_movimentacao ALTER COLUMN tipo TYPE VARCHAR(20);

-- Semeia o estoque da matriz (menor unidade da empresa) com o consolidado atual.
INSERT INTO estoque_unidade (empresa_id, unidade_id, produto_id, quantidade)
SELECT p.empresa_id,
       (SELECT MIN(id) FROM unidades u WHERE u.empresa_id = p.empresa_id),
       p.id,
       p.estoque_atual
FROM produtos p
WHERE p.empresa_id IS NOT NULL
  AND (SELECT MIN(id) FROM unidades u WHERE u.empresa_id = p.empresa_id) IS NOT NULL
ON CONFLICT (unidade_id, produto_id) DO NOTHING;
