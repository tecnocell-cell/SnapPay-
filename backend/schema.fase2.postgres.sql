-- ============================================================================
-- SnapPay — Fase 2 (Gestão): tabelas base de fornecedores, compras,
-- financeiro (contas a pagar/receber), configurações e auditoria.
-- Idempotente: CREATE TABLE IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fornecedores (
    id            SERIAL PRIMARY KEY,
    empresa_id    INT NOT NULL REFERENCES empresas(id),
    nome          VARCHAR(120) NOT NULL,
    cnpj          VARCHAR(20) NULL,
    email         VARCHAR(120) NULL,
    telefone      VARCHAR(20) NULL,
    endereco      VARCHAR(200) NULL,
    observacoes   TEXT NULL,
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS ix_fornecedores_empresa ON fornecedores(empresa_id);

CREATE TABLE IF NOT EXISTS compras (
    id            SERIAL PRIMARY KEY,
    empresa_id    INT NOT NULL REFERENCES empresas(id),
    fornecedor_id INT NOT NULL REFERENCES fornecedores(id),
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, RECEBIDA, CANCELADA
    valor_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
    observacoes   TEXT NULL,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_compras_empresa ON compras(empresa_id);

CREATE TABLE IF NOT EXISTS compra_itens (
    id             SERIAL PRIMARY KEY,
    compra_id      INT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    produto_id     INT NOT NULL REFERENCES produtos(id),
    quantidade     NUMERIC(12,3) NOT NULL,
    preco_unitario NUMERIC(12,2) NOT NULL,
    valor_total    NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_compra_itens_compra ON compra_itens(compra_id);

CREATE TABLE IF NOT EXISTS contas_pagar (
    id             SERIAL PRIMARY KEY,
    empresa_id     INT NOT NULL REFERENCES empresas(id),
    fornecedor_id  INT NULL REFERENCES fornecedores(id),
    compra_id      INT NULL REFERENCES compras(id),
    valor          NUMERIC(12,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento  DATE NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, PAGA, CANCELADA
    observacoes    TEXT NULL,
    origem         VARCHAR(20) NULL, -- MANUAL, COMPRA
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_contas_pagar_empresa ON contas_pagar(empresa_id);

CREATE TABLE IF NOT EXISTS contas_receber (
    id             SERIAL PRIMARY KEY,
    empresa_id     INT NOT NULL REFERENCES empresas(id),
    cliente_id     INT NULL REFERENCES clientes(id),
    venda_id       INT NULL REFERENCES vendas(id),
    valor          NUMERIC(12,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, RECEBIDA, CANCELADA
    observacoes    TEXT NULL,
    origem         VARCHAR(20) NULL, -- MANUAL, VENDA
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_contas_receber_empresa ON contas_receber(empresa_id);

CREATE TABLE IF NOT EXISTS configuracoes (
    id                 SERIAL PRIMARY KEY,
    empresa_id         INT NOT NULL UNIQUE REFERENCES empresas(id),
    icms               NUMERIC(5,2) NOT NULL DEFAULT 0,
    pis                NUMERIC(5,2) NOT NULL DEFAULT 0,
    cofins             NUMERIC(5,2) NOT NULL DEFAULT 0,
    ipi                NUMERIC(5,2) NOT NULL DEFAULT 0,
    tipo_nf            VARCHAR(10) NOT NULL DEFAULT 'NFCe',
    aliquota_principal NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auditoria (
    id                SERIAL PRIMARY KEY,
    empresa_id        INT NOT NULL REFERENCES empresas(id),
    usuario_id        INT NULL REFERENCES usuarios(id),
    tipo              VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE, READ
    tabela            VARCHAR(60) NOT NULL,
    registro_id       INT NULL,
    acao              VARCHAR(200) NULL,
    dados_anteriores  JSONB NULL,
    dados_novos       JSONB NULL,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_auditoria_empresa ON auditoria(empresa_id);
