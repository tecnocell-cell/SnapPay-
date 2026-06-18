-- Migration 15: Preço autoritativo no servidor + devolução com impacto financeiro.
-- Idempotente.

-- 1) venda_itens: registrar a precificação autoritativa do servidor
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS preco_base       NUMERIC(12,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS tabela_preco_id  INT NULL REFERENCES tabelas_preco(id);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS promocao_id      INT NULL REFERENCES promocoes(id);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS desconto_promo   NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS desconto_manual  NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2) devolucoes: forma de reembolso aplicada
ALTER TABLE devolucoes ADD COLUMN IF NOT EXISTS tipo_reembolso  VARCHAR(20) NOT NULL DEFAULT 'DINHEIRO';
ALTER TABLE devolucoes ADD COLUMN IF NOT EXISTS cliente_id      INT NULL REFERENCES clientes(id);

-- 3) crédito do cliente (vale-troca) gerado por devolução tipo CREDITO_LOJA
CREATE TABLE IF NOT EXISTS creditos_cliente (
    id          SERIAL PRIMARY KEY,
    empresa_id  INT NOT NULL REFERENCES empresas(id),
    cliente_id  INT NOT NULL REFERENCES clientes(id),
    origem      VARCHAR(20) NOT NULL DEFAULT 'DEVOLUCAO',
    origem_id   INT NULL,
    valor       NUMERIC(12,2) NOT NULL,
    saldo       NUMERIC(12,2) NOT NULL,
    status      VARCHAR(12) NOT NULL DEFAULT 'ATIVO', -- ATIVO, USADO, CANCELADO
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_creditos_cliente ON creditos_cliente(empresa_id, cliente_id, status);
