-- Migration 10: Devoluções (Fase 5.6) — regra de negócio comercial.
-- Permite devolução total ou PARCIAL de itens de uma venda, com retorno de
-- estoque, kardex (DEVOLUCAO) e auditoria.

CREATE TABLE IF NOT EXISTS devolucoes (
    id            SERIAL PRIMARY KEY,
    empresa_id    INT NOT NULL REFERENCES empresas(id),
    venda_id      INT NOT NULL REFERENCES vendas(id),
    usuario_id    INT NULL REFERENCES usuarios(id),
    valor_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
    motivo        VARCHAR(300) NULL,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_devolucoes_empresa ON devolucoes(empresa_id);
CREATE INDEX IF NOT EXISTS ix_devolucoes_venda ON devolucoes(venda_id);

CREATE TABLE IF NOT EXISTS devolucao_itens (
    id             SERIAL PRIMARY KEY,
    devolucao_id   INT NOT NULL REFERENCES devolucoes(id) ON DELETE CASCADE,
    produto_id     INT NOT NULL REFERENCES produtos(id),
    quantidade     NUMERIC(12,3) NOT NULL,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total    NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_devolucao_itens_dev ON devolucao_itens(devolucao_id);
