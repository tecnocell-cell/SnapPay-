-- Migration 14: Tipo de Operação do PDV (segmento)
-- Garante que a coluna segmento existe na tabela empresas.
-- Valores: mercado | loja | padaria | restaurante | conveniencia | farmacia
-- Idempotente.

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS segmento VARCHAR(20) NOT NULL DEFAULT 'mercado';

-- Normaliza valores nulos/legados para o padrão.
UPDATE empresas SET segmento = 'mercado' WHERE segmento IS NULL OR segmento = '';
