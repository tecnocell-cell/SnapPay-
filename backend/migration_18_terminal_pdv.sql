-- Migration 18: Terminal PDV (Fase 8) — preparação para mini PC em modo quiosque.
-- Armazena configuração do terminal local: device_id, unidade_id, modo, ativação.

CREATE TABLE IF NOT EXISTS terminais_pdv (
    id              SERIAL PRIMARY KEY,
    empresa_id      INT NOT NULL REFERENCES empresas(id),
    unidade_id      INT NULL REFERENCES unidades(id),
    device_id       VARCHAR(64) NOT NULL UNIQUE, -- UUID do terminal
    nome            VARCHAR(100) NOT NULL,
    ativo           BOOLEAN DEFAULT FALSE,
    modo_terminal   BOOLEAN DEFAULT FALSE, -- True = quiosque (UI reduzida), False = UI completa
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_terminais_empresa_ativo ON terminais_pdv(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS ix_terminal_device_id ON terminais_pdv(device_id);

-- Configurações do terminal local (sincronização, modo, etc.)
CREATE TABLE IF NOT EXISTS config_terminal (
    id                  SERIAL PRIMARY KEY,
    terminal_id         INT NOT NULL REFERENCES terminais_pdv(id) ON DELETE CASCADE,
    chave_ativacao      VARCHAR(64) NULL, -- gerada na ativação, apagada após confirmação
    sync_intervalo_seg  INT DEFAULT 300, -- cada 5 minutos
    offline_modo        BOOLEAN DEFAULT FALSE, -- True = está offline
    ultima_sync         TIMESTAMPTZ NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
