-- Migration 09: Offline First / PDV Local — dispositivos e fila de sincronização.
-- Esta etapa cria APENAS a arquitetura de sync (sem Tauri/Electron).
-- Banco cloud continua PostgreSQL; o banco local (SQLite) é do app futuro.

-- ---------- DISPOSITIVOS / TERMINAIS ----------
CREATE TABLE IF NOT EXISTS pdv_dispositivos (
    id              SERIAL PRIMARY KEY,
    empresa_id      INT NOT NULL REFERENCES empresas(id),
    unidade_id      INT NULL REFERENCES unidades(id),
    nome            VARCHAR(120) NOT NULL,
    device_id       VARCHAR(64) NOT NULL UNIQUE,   -- UUID do terminal
    chave_hash      VARCHAR(200) NULL,             -- hash da chave local (segredo do terminal)
    codigo_ativacao VARCHAR(20) NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_sync     TIMESTAMPTZ NULL,
    versao_app      VARCHAR(20) NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_pdv_disp_empresa ON pdv_dispositivos(empresa_id);

-- ---------- FILA DE SAÍDA (cloud -> dispositivo): alterações a entregar ----------
CREATE TABLE IF NOT EXISTS sync_outbox (
    id            SERIAL PRIMARY KEY,
    empresa_id    INT NOT NULL REFERENCES empresas(id),
    unidade_id    INT NULL,
    device_id     VARCHAR(64) NULL,        -- NULL = broadcast p/ todos os terminais da empresa/unidade
    entidade      VARCHAR(40) NOT NULL,    -- produto, preco, categoria, cliente...
    operacao      VARCHAR(20) NOT NULL,    -- CREATE, UPDATE, DELETE
    payload       JSONB NULL,
    status        VARCHAR(15) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, ENVIADO, PROCESSADO, ERRO
    tentativas    INT NOT NULL DEFAULT 0,
    erro          VARCHAR(400) NULL,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processado_em TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS ix_sync_outbox_empresa ON sync_outbox(empresa_id, status);

-- ---------- FILA DE ENTRADA (dispositivo -> cloud): eventos recebidos ----------
CREATE TABLE IF NOT EXISTS sync_recebimentos (
    id            SERIAL PRIMARY KEY,
    empresa_id    INT NOT NULL REFERENCES empresas(id),
    unidade_id    INT NULL,
    device_id     VARCHAR(64) NOT NULL,
    uuid          VARCHAR(64) NOT NULL,    -- id gerado no terminal (idempotência)
    entidade      VARCHAR(40) NOT NULL,    -- venda, caixa_fechamento...
    operacao      VARCHAR(20) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(15) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, PROCESSADO, ERRO
    tentativas    INT NOT NULL DEFAULT 0,
    erro          VARCHAR(400) NULL,
    resultado_id  INT NULL,                -- id do registro definitivo criado (ex: venda_id)
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processado_em TIMESTAMPTZ NULL,
    UNIQUE (device_id, uuid)
);
CREATE INDEX IF NOT EXISTS ix_sync_receb_empresa ON sync_recebimentos(empresa_id, status);

-- ---------- VÍNCULO DE VENDA COM ORIGEM OFFLINE ----------
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS uuid_sync VARCHAR(64) NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS origem VARCHAR(15) NULL;        -- PDV, OFFLINE
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS device_id VARCHAR(64) NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS divergencia VARCHAR(200) NULL;  -- alerta de conflito (ex: estoque negativo)
CREATE UNIQUE INDEX IF NOT EXISTS ux_vendas_uuid_sync ON vendas(uuid_sync) WHERE uuid_sync IS NOT NULL;

-- ---------- PERMISSÃO DE GESTÃO DE TERMINAIS (ADMIN) ----------
INSERT INTO permissoes (chave, descricao) VALUES
    ('dispositivos.gerenciar', 'Ativar e gerenciar terminais PDV')
    ON CONFLICT (chave) DO NOTHING;

INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p CROSS JOIN permissoes perm WHERE p.chave='ADMIN'
    ON CONFLICT DO NOTHING;
