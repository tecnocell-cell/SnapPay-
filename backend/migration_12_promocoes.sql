-- Migration 12: Promoções (Fase 6.3) — motor configurável.

CREATE TABLE IF NOT EXISTS promocoes (
    id          SERIAL PRIMARY KEY,
    empresa_id  INT NOT NULL REFERENCES empresas(id),
    nome        VARCHAR(100) NOT NULL,
    tipo        VARCHAR(20) NOT NULL,  -- PERCENTUAL, VALOR, LEVE_X_PAGUE_Y
    valor       NUMERIC(12,2) NULL,    -- % (PERCENTUAL) ou R$ por unidade (VALOR)
    leve_qtd    INT NULL,              -- LEVE_X_PAGUE_Y
    pague_qtd   INT NULL,
    escopo      VARCHAR(15) NOT NULL DEFAULT 'GERAL', -- PRODUTO, CATEGORIA, GERAL
    alvo_id     INT NULL,              -- produto_id ou categoria_id conforme escopo
    hora_inicio TIME NULL,             -- promoção por horário (NULL = qualquer hora)
    hora_fim    TIME NULL,
    dias_semana VARCHAR(20) NULL,      -- ex: "1,2,3,4,5" (0=dom..6=sab); NULL = todos
    data_inicio DATE NULL,
    data_fim    DATE NULL,
    prioridade  INT NOT NULL DEFAULT 100,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_promocoes_empresa ON promocoes(empresa_id, ativo);
