-- Migration: Expandir cadastro de produtos com campos profissionais
-- Data: Fase 3.1
-- Objetivo: Adicionar campos para marcas, categorias, impostos, margens e promoções

-- Criar tabela de marcas
CREATE TABLE IF NOT EXISTS marcas (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, nome)
);

-- Criar tabela de categorias (pode reutilizar existente se houver)
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, nome)
);

-- Expandir tabela de produtos com campos profissionais
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS marca_id INTEGER REFERENCES marcas(id);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_maximo NUMERIC(12,3) DEFAULT 999999;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS controla_estoque BOOLEAN DEFAULT TRUE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS permite_estoque_negativo BOOLEAN DEFAULT FALSE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS localizacao VARCHAR(100);

-- Campos de margem
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS margem_lucro_pct NUMERIC(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS margem_lucro_valor NUMERIC(12,2) DEFAULT 0;

-- Campos de promoção
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_promocional NUMERIC(12,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS data_inicio_promo DATE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS data_fim_promo DATE;

-- Campos fiscais (preparados para fase fiscal, sem emitir ainda)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(20);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cest VARCHAR(20);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cfop VARCHAR(10);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS origem VARCHAR(2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_tributavel VARCHAR(10);

-- Timestamp de atualização
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS ix_produtos_empresa ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS ix_produtos_sku ON produtos(sku, empresa_id);
CREATE INDEX IF NOT EXISTS ix_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS ix_produtos_marca ON produtos(marca_id);
CREATE INDEX IF NOT EXISTS ix_produtos_fornecedor ON produtos(fornecedor_id);

-- Adicionar chave estrangeira para empresa em outras tabelas
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS ix_clientes_empresa ON clientes(empresa_id);

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS caixa_id INTEGER;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
CREATE INDEX IF NOT EXISTS ix_vendas_empresa ON vendas(empresa_id);
CREATE INDEX IF NOT EXISTS ix_vendas_caixa ON vendas(caixa_id);

ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS empresa_id INTEGER DEFAULT 1;
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS saldo_anterior NUMERIC(12,3);
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS saldo_posterior NUMERIC(12,3);
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS origem VARCHAR(50);
ALTER TABLE estoque_movimentacao ADD COLUMN IF NOT EXISTS origem_id INTEGER;
CREATE INDEX IF NOT EXISTS ix_estoque_mov_empresa ON estoque_movimentacao(empresa_id);
CREATE INDEX IF NOT EXISTS ix_estoque_mov_tipo ON estoque_movimentacao(tipo);
