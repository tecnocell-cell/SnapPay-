-- Migration 17: Status fiscal para devolução com NFC-e autorizada.
-- Ao fazer devolução parcial de venda com NFC-e AUTORIZADA,
-- registra EVENTO_DEVOLUCAO_PENDENTE e bloqueia até que seja autorizado.

-- Novos status em notas_fiscais.status:
-- DEVOLUCAO_PENDENTE (a venda original tem devolução aguardando evento)
-- EVENTO_DEVOLUCAO_PENDENTE (evento de devolução pendente de autorização)

-- Tabela de eventos fiscais pendentes (para M5 — reprocessamento manual)
CREATE TABLE IF NOT EXISTS eventos_fiscais_pendentes (
    id          SERIAL PRIMARY KEY,
    empresa_id  INT NOT NULL REFERENCES empresas(id),
    nota_id     INT NULL REFERENCES fiscal_notas(id),
    tipo        VARCHAR(30) NOT NULL, -- DEVOLUCAO, CANCELAMENTO, etc.
    descricao   VARCHAR(300) NULL,
    dados       JSONB NULL,
    tentativas  INT DEFAULT 0,
    ultima_tentativa TIMESTAMPTZ NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, AUTORIZADO, REJEITADO, ERRO
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_eventos_pendentes_empresa ON eventos_fiscais_pendentes(empresa_id, status);
