-- ============================================================================
-- PROBLEMA 6 — Seed de demonstração PROFISSIONAL (empresa 1: SnapPay Loja Demo)
-- Complementa a base já limpa com staples de mercado/padaria/loja.
-- Idempotente: usa códigos fixos e só insere se não existir.
-- ============================================================================

-- Garante categorias profissionais (não duplica por nome).
INSERT INTO categorias (empresa_id, nome, cor, icone, ordem)
SELECT 1, v.nome, v.cor, v.icone, v.ordem FROM (VALUES
  ('Mercearia', '#f59e0b', '🛒', 10),
  ('Padaria',   '#d97706', '🥖', 20),
  ('Utilidades','#6366f1', '🏠', 30)
) AS v(nome, cor, icone, ordem)
WHERE NOT EXISTS (SELECT 1 FROM categorias c WHERE c.empresa_id = 1 AND c.nome = v.nome);

-- Staples de mercado/padaria que faltavam na demo.
INSERT INTO produtos (empresa_id, codigo, barras, nome, unidade, preco_venda, preco_custo, estoque_atual, estoque_minimo, ativo)
SELECT 1, v.codigo, v.barras, v.nome, v.unidade, v.pv, v.pc, v.est, v.estmin, TRUE FROM (VALUES
  ('789011', '7891000100011', 'Arroz Branco Tio João 5kg',      'UN', 28.90, 22.00, 60, 10),
  ('789012', '7891000100028', 'Feijão Carioca Camil 1kg',       'UN',  8.50,  6.00, 50, 10),
  ('789013', '7891000100035', 'Detergente Ypê Neutro 500ml',    'UN',  2.50,  1.40, 120, 20),
  ('789014', '7891000100042', 'Shampoo Seda 325ml',             'UN', 12.90,  8.50, 40,  8),
  ('PAO-BOLO','7891000100059', 'Bolo de Chocolate (fatia)',      'UN',  6.50,  3.00, 24,  5)
) AS v(codigo, barras, nome, unidade, pv, pc, est, estmin)
WHERE NOT EXISTS (SELECT 1 FROM produtos p WHERE p.empresa_id = 1 AND p.codigo = v.codigo);

-- Corrige estoques negativos (artefatos de stress) na empresa demo.
UPDATE produtos SET estoque_atual = 0 WHERE empresa_id = 1 AND estoque_atual < 0;

-- Remove artefato de homologação da Empresa B da base demonstrável.
UPDATE produtos SET ativo = FALSE WHERE codigo = 'B001';
