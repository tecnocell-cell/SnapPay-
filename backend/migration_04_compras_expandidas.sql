-- Migration: Expandir compras com integração ao financeiro
-- Objetivo: Adicionar campos para melhor controle e integração com financeiro

-- Adicionar campos à tabela compras
ALTER TABLE compras ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(50);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_compra DATE DEFAULT CURRENT_DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_recebimento DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS data_vencimento DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS condicao_pagamento VARCHAR(50) DEFAULT 'A_VISTA';  -- A_VISTA, 30, 60, 90, PARCELADO
ALTER TABLE compras ADD COLUMN IF NOT EXISTS frete NUMERIC(12,2) DEFAULT 0;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS desconto NUMERIC(12,2) DEFAULT 0;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS acrescimo NUMERIC(12,2) DEFAULT 0;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Criar índices
CREATE INDEX IF NOT EXISTS ix_compras_empresa ON compras(empresa_id);
CREATE INDEX IF NOT EXISTS ix_compras_fornecedor ON compras(fornecedor_id);
CREATE INDEX IF NOT EXISTS ix_compras_status ON compras(status);
CREATE INDEX IF NOT EXISTS ix_compras_data ON compras(data_compra);

-- Garantir que estoque_movimentacao tem os campos necessários
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS saldo_anterior NUMERIC(12,3);
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS saldo_posterior NUMERIC(12,3);
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS origem VARCHAR(50);  -- COMPRA, VENDA, AJUSTE, INVENTARIO
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS origem_id INTEGER;

CREATE INDEX IF NOT EXISTS ix_estoque_mov_empresa ON estoque_movimentacao(empresa_id);
CREATE INDEX IF NOT EXISTS ix_estoque_mov_origem ON estoque_movimentacao(origem);
