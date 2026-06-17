-- Migration: Caixa com conferência e separação por forma de pagamento
-- Objetivo: Melhorar relatório e conferência de caixa

-- Expandir tabela caixas
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS usuario_abertura_id INTEGER;
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS usuario_fechamento_id INTEGER;
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS valor_contado NUMERIC(12,2);
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS diferenca NUMERIC(12,2);
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS observacao_fechamento TEXT;
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Expandir tabela caixa_movimentos
ALTER TABLE caixa_movimentos ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE caixa_movimentos ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
ALTER TABLE caixa_movimentos ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50);  -- DINHEIRO, CREDITO, DEBITO, PIX
ALTER TABLE caixa_movimentos ADD COLUMN IF NOT EXISTS referencia_id INTEGER;  -- venda_id, sangria_id, etc

-- Criar índices
CREATE INDEX IF NOT EXISTS ix_caixas_empresa ON caixas(empresa_id);
CREATE INDEX IF NOT EXISTS ix_caixas_status ON caixas(status);
CREATE INDEX IF NOT EXISTS ix_caixa_movimentos_empresa ON caixa_movimentos(empresa_id);
CREATE INDEX IF NOT EXISTS ix_caixa_movimentos_forma ON caixa_movimentos(forma_pagamento);
CREATE INDEX IF NOT EXISTS ix_caixa_movimentos_tipo ON caixa_movimentos(tipo);
