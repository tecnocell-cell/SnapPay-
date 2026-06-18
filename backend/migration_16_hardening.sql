-- Migration 16: Hardening operacional (Fase 7 — correções).
-- Idempotente.

-- A2: idempotência de venda online + A3: flag de divergência de preço no sync
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS idempotency_key   VARCHAR(80);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS divergencia_preco BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS ux_vendas_idem ON vendas (empresa_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- C1: kardex por unidade (multi-loja)
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS unidade_id INT NULL REFERENCES unidades(id);

-- M2: movimento de caixa com unidade + origem
ALTER TABLE caixa_movimentos ADD COLUMN IF NOT EXISTS unidade_id INT NULL REFERENCES unidades(id);
ALTER TABLE caixa_movimentos ADD COLUMN IF NOT EXISTS origem     VARCHAR(20) NULL;

-- M10: forma de pagamento da liquidação financeira
ALTER TABLE contas_pagar   ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(15) NULL;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(15) NULL;

-- Auditoria: amplia 'tipo' (nomes novos como SYNC_PRECO_DIVERGENTE/AJUSTE_PRECO_CONFIRMADO passavam de 20 chars e falhavam silenciosamente)
ALTER TABLE auditoria ALTER COLUMN tipo TYPE VARCHAR(40);

-- M1: impedir 2 caixas ABERTOS por empresa.
-- Fecha duplicatas antigas (mantém o mais recente) antes de criar o índice único.
UPDATE caixas c SET status='FECHADO', fechado_em = COALESCE(fechado_em, NOW())
 WHERE status='ABERTO'
   AND id < (SELECT MAX(id) FROM caixas c2 WHERE c2.empresa_id = c.empresa_id AND c2.status='ABERTO');
CREATE UNIQUE INDEX IF NOT EXISTS ux_caixa_aberto_empresa ON caixas (empresa_id) WHERE status='ABERTO';
