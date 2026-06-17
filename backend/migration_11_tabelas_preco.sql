-- Migration 11: Tabelas de preço (Fase 6.2) — varejo/atacado/especial
-- com preço por faixa de quantidade (1+, 10+, 20+, 50+).

CREATE TABLE IF NOT EXISTS tabelas_preco (
    id          SERIAL PRIMARY KEY,
    empresa_id  INT NOT NULL REFERENCES empresas(id),
    nome        VARCHAR(80) NOT NULL,
    tipo        VARCHAR(15) NOT NULL DEFAULT 'VAREJO', -- VAREJO, ATACADO, ESPECIAL
    padrao      BOOLEAN NOT NULL DEFAULT FALSE,        -- tabela usada quando o cliente não tem uma
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_tabelas_preco_empresa ON tabelas_preco(empresa_id);

-- Preço por produto e faixa de quantidade mínima.
CREATE TABLE IF NOT EXISTS tabela_preco_itens (
    id          SERIAL PRIMARY KEY,
    tabela_id   INT NOT NULL REFERENCES tabelas_preco(id) ON DELETE CASCADE,
    produto_id  INT NOT NULL REFERENCES produtos(id),
    qtd_min     NUMERIC(12,3) NOT NULL DEFAULT 1,  -- faixa: 1, 10, 20, 50...
    preco       NUMERIC(12,2) NOT NULL,
    UNIQUE (tabela_id, produto_id, qtd_min)
);
CREATE INDEX IF NOT EXISTS ix_tpi_tabela_produto ON tabela_preco_itens(tabela_id, produto_id);

-- Vincula cliente a uma tabela de preço (NULL = usa a tabela padrão da empresa).
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tabela_preco_id INT NULL REFERENCES tabelas_preco(id);

-- Permissão para gerenciar tabelas de preço (reusa config.editar p/ gestão).
