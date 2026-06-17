-- Migration 08: Modelo fiscal base (Fase 4) — arquitetura plugável.
-- NÃO contém comunicação com SEFAZ; apenas o modelo de dados, status e
-- permissões. A emissão real é responsabilidade dos providers.

-- ---------- CONFIGURAÇÕES FISCAIS (por empresa) ----------
CREATE TABLE IF NOT EXISTS fiscal_configuracoes (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INT NOT NULL UNIQUE REFERENCES empresas(id),
    provider            VARCHAR(30) NOT NULL DEFAULT 'MOCK',       -- MOCK, NUVEM_FISCAL, FOCUS_NFE, PLUGNOTAS, TECNOSPEED
    ambiente            VARCHAR(15) NOT NULL DEFAULT 'HOMOLOGACAO', -- HOMOLOGACAO, PRODUCAO
    modelo              VARCHAR(2) NOT NULL DEFAULT '65',          -- 65 = NFC-e
    serie               INT NOT NULL DEFAULT 1,
    numero_atual        INT NOT NULL DEFAULT 0,
    csc                 VARCHAR(100) NULL,                         -- Código de Segurança do Contribuinte
    csc_id              VARCHAR(10) NULL,
    provider_token      VARCHAR(255) NULL,                         -- token/api key do provedor
    certificado_nome    VARCHAR(255) NULL,                         -- referência (NÃO armazenar o .pfx aqui)
    certificado_validade DATE NULL,
    regime_tributario   VARCHAR(30) NULL,
    uf                  VARCHAR(2) NULL,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- NOTAS FISCAIS ----------
CREATE TABLE IF NOT EXISTS fiscal_notas (
    id              SERIAL PRIMARY KEY,
    empresa_id      INT NOT NULL REFERENCES empresas(id),
    venda_id        INT NULL REFERENCES vendas(id),
    usuario_id      INT NULL REFERENCES usuarios(id),
    modelo          VARCHAR(2) NOT NULL DEFAULT '65',
    serie           INT NULL,
    numero          INT NULL,
    status          VARCHAR(25) NOT NULL DEFAULT 'RASCUNHO',  -- RASCUNHO, EMITINDO, AUTORIZADA, REJEITADA, CANCELADA, CONTINGENCIA, CONTINGENCIA_PENDENTE
    ambiente        VARCHAR(15) NULL,
    provider        VARCHAR(30) NULL,
    chave_acesso    VARCHAR(60) NULL,
    protocolo       VARCHAR(60) NULL,
    valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    motivo_rejeicao VARCHAR(400) NULL,
    danfe_url       VARCHAR(400) NULL,
    xml             TEXT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    autorizada_em   TIMESTAMPTZ NULL,
    cancelada_em    TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS ix_fiscal_notas_empresa ON fiscal_notas(empresa_id);
CREATE INDEX IF NOT EXISTS ix_fiscal_notas_venda ON fiscal_notas(venda_id);
CREATE INDEX IF NOT EXISTS ix_fiscal_notas_status ON fiscal_notas(status);

-- ---------- EVENTOS FISCAIS (histórico de cada nota) ----------
CREATE TABLE IF NOT EXISTS fiscal_eventos (
    id                SERIAL PRIMARY KEY,
    nota_id           INT NOT NULL REFERENCES fiscal_notas(id) ON DELETE CASCADE,
    empresa_id        INT NOT NULL REFERENCES empresas(id),
    tipo              VARCHAR(20) NOT NULL,   -- EMISSAO, AUTORIZACAO, REJEICAO, CANCELAMENTO, INUTILIZACAO, CONSULTA
    status_resultante VARCHAR(15) NULL,
    mensagem          VARCHAR(400) NULL,
    payload           JSONB NULL,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_fiscal_eventos_nota ON fiscal_eventos(nota_id);

-- ---------- PERMISSÕES FISCAIS ----------
INSERT INTO permissoes (chave, descricao) VALUES
    ('fiscal.emitir',     'Emitir e consultar notas fiscais'),
    ('fiscal.cancelar',   'Cancelar notas fiscais'),
    ('fiscal.configurar', 'Configurar parâmetros fiscais')
    ON CONFLICT (chave) DO NOTHING;

-- ADMIN: todas
INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p CROSS JOIN permissoes perm WHERE p.chave='ADMIN'
    ON CONFLICT DO NOTHING;

-- GERENTE: emitir e cancelar (configurar fiscal fica restrito ao ADMIN)
INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p JOIN permissoes perm ON perm.chave IN ('fiscal.emitir','fiscal.cancelar')
    WHERE p.chave='GERENTE' ON CONFLICT DO NOTHING;
