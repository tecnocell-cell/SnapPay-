-- Schema do PDV adaptado para PostgreSQL (a partir do schema.sql original de SQL Server).

DROP TABLE IF EXISTS venda_pagamentos CASCADE;
DROP TABLE IF EXISTS venda_itens CASCADE;
DROP TABLE IF EXISTS estoque_movimentacao CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;

CREATE TABLE produtos (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(20) NOT NULL UNIQUE,
    barras          VARCHAR(20) NULL,
    nome            VARCHAR(120) NOT NULL,
    unidade         VARCHAR(6) NOT NULL DEFAULT 'UN',
    preco_custo     NUMERIC(12,2) NOT NULL DEFAULT 0,
    preco_venda     NUMERIC(12,2) NOT NULL DEFAULT 0,
    estoque_atual   NUMERIC(12,3) NOT NULL DEFAULT 0,
    estoque_minimo  NUMERIC(12,3) NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_produtos_barras ON produtos(barras);
CREATE INDEX ix_produtos_nome ON produtos(nome);

CREATE TABLE clientes (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(120) NOT NULL,
    cpf_cnpj        VARCHAR(18) NULL,
    telefone        VARCHAR(20) NULL,
    email           VARCHAR(120) NULL,
    limite_credito  NUMERIC(12,2) NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_clientes_cpf_cnpj ON clientes(cpf_cnpj);

CREATE TABLE vendas (
    id              SERIAL PRIMARY KEY,
    cliente_id      INT NULL REFERENCES clientes(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'ABERTA',
    valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_desconto  NUMERIC(12,2) NOT NULL DEFAULT 0,
    aberta_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizada_em   TIMESTAMPTZ NULL
);

CREATE TABLE venda_itens (
    id              SERIAL PRIMARY KEY,
    venda_id        INT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id      INT NOT NULL REFERENCES produtos(id),
    quantidade      NUMERIC(12,3) NOT NULL,
    preco_unitario  NUMERIC(12,2) NOT NULL,
    desconto        NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_total     NUMERIC(12,2) NOT NULL
);
CREATE INDEX ix_venda_itens_venda ON venda_itens(venda_id);

CREATE TABLE venda_pagamentos (
    id              SERIAL PRIMARY KEY,
    venda_id        INT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    forma           VARCHAR(20) NOT NULL,
    valor           NUMERIC(12,2) NOT NULL
);
CREATE INDEX ix_venda_pagamentos_venda ON venda_pagamentos(venda_id);

CREATE TABLE estoque_movimentacao (
    id              SERIAL PRIMARY KEY,
    produto_id      INT NOT NULL REFERENCES produtos(id),
    tipo            VARCHAR(10) NOT NULL, -- ENTRADA, SAIDA, AJUSTE
    quantidade      NUMERIC(12,3) NOT NULL,
    observacao      VARCHAR(200) NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_estoque_mov_produto ON estoque_movimentacao(produto_id);
