-- Schema do MVP do PDV, baseado nos campos centrais de SAC441 (produtos), SAC311 (clientes),
-- SAC100/SAC470 (venda e itens) e SAC511 (recebimentos) do EasySAC original.

CREATE TABLE produtos (
    id              INT IDENTITY PRIMARY KEY,
    codigo          NVARCHAR(20) NOT NULL UNIQUE,
    barras          NVARCHAR(20) NULL,
    nome            NVARCHAR(120) NOT NULL,
    unidade         NVARCHAR(6) NOT NULL DEFAULT 'UN',
    preco_custo     DECIMAL(12,2) NOT NULL DEFAULT 0,
    preco_venda     DECIMAL(12,2) NOT NULL DEFAULT 0,
    estoque_atual   DECIMAL(12,3) NOT NULL DEFAULT 0,
    estoque_minimo  DECIMAL(12,3) NOT NULL DEFAULT 0,
    ativo           BIT NOT NULL DEFAULT 1,
    criado_em       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX ix_produtos_barras ON produtos(barras);
CREATE INDEX ix_produtos_nome ON produtos(nome);

CREATE TABLE clientes (
    id              INT IDENTITY PRIMARY KEY,
    nome            NVARCHAR(120) NOT NULL,
    cpf_cnpj        NVARCHAR(18) NULL,
    telefone        NVARCHAR(20) NULL,
    email           NVARCHAR(120) NULL,
    ativo           BIT NOT NULL DEFAULT 1,
    criado_em       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX ix_clientes_cpf_cnpj ON clientes(cpf_cnpj);

CREATE TABLE vendas (
    id              INT IDENTITY PRIMARY KEY,
    cliente_id      INT NULL REFERENCES clientes(id),
    status          NVARCHAR(20) NOT NULL DEFAULT 'ABERTA', -- ABERTA, FINALIZADA, CANCELADA
    valor_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_desconto  DECIMAL(12,2) NOT NULL DEFAULT 0,
    aberta_em       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    finalizada_em   DATETIME2 NULL
);

CREATE TABLE venda_itens (
    id              INT IDENTITY PRIMARY KEY,
    venda_id        INT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id      INT NOT NULL REFERENCES produtos(id),
    quantidade      DECIMAL(12,3) NOT NULL,
    preco_unitario  DECIMAL(12,2) NOT NULL,
    desconto        DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_total     DECIMAL(12,2) NOT NULL
);
CREATE INDEX ix_venda_itens_venda ON venda_itens(venda_id);

CREATE TABLE venda_pagamentos (
    id              INT IDENTITY PRIMARY KEY,
    venda_id        INT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    forma           NVARCHAR(20) NOT NULL, -- DINHEIRO, DEBITO, CREDITO, PIX, CREDIARIO
    valor           DECIMAL(12,2) NOT NULL
);
CREATE INDEX ix_venda_pagamentos_venda ON venda_pagamentos(venda_id);
