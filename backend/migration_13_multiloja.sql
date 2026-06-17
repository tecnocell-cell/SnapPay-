-- Migration 13: Multi-loja (Fase 6.4) — estoque por unidade e transferências.
-- O estoque global (produtos.estoque_atual) é mantido como consolidado/matriz;
-- estoque_unidade detalha o saldo por loja. Transferências movem saldo entre
-- unidades com registro no kardex.

CREATE TABLE IF NOT EXISTS estoque_unidade (
    id          SERIAL PRIMARY KEY,
    empresa_id  INT NOT NULL REFERENCES empresas(id),
    unidade_id  INT NOT NULL REFERENCES unidades(id),
    produto_id  INT NOT NULL REFERENCES produtos(id),
    quantidade  NUMERIC(12,3) NOT NULL DEFAULT 0,
    UNIQUE (unidade_id, produto_id)
);
CREATE INDEX IF NOT EXISTS ix_estoque_unidade ON estoque_unidade(empresa_id, unidade_id);

CREATE TABLE IF NOT EXISTS transferencias (
    id              SERIAL PRIMARY KEY,
    empresa_id      INT NOT NULL REFERENCES empresas(id),
    unidade_origem  INT NOT NULL REFERENCES unidades(id),
    unidade_destino INT NOT NULL REFERENCES unidades(id),
    usuario_id      INT NULL REFERENCES usuarios(id),
    status          VARCHAR(15) NOT NULL DEFAULT 'CONCLUIDA', -- CONCLUIDA, PENDENTE
    observacao      VARCHAR(300) NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transferencia_itens (
    id               SERIAL PRIMARY KEY,
    transferencia_id INT NOT NULL REFERENCES transferencias(id) ON DELETE CASCADE,
    produto_id       INT NOT NULL REFERENCES produtos(id),
    quantidade       NUMERIC(12,3) NOT NULL
);

-- vínculo de venda/caixa à unidade (caixas já tem unidade_id; vendas ganha)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS unidade_id INT NULL REFERENCES unidades(id);
