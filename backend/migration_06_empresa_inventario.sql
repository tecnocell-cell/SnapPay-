-- Migration: Empresa, Unidades e Inventário
-- Objetivo: Completar dados da empresa e implementar inventário

-- Expandir tabela empresas (se não existir, criar)
CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(20) UNIQUE,
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  telefone VARCHAR(20),
  email VARCHAR(120),
  endereco VARCHAR(500),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(10),
  regime_tributario VARCHAR(50),
  logo_url VARCHAR(500),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de unidades/lojas
CREATE TABLE IF NOT EXISTS unidades (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id),
  nome VARCHAR(255) NOT NULL,
  endereco VARCHAR(500),
  telefone VARCHAR(20),
  responsavel VARCHAR(150),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de inventário
CREATE TABLE IF NOT EXISTS inventarios (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL,
  nome VARCHAR(255) NOT NULL,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  status VARCHAR(50) DEFAULT 'ABERTO', -- ABERTO, FECHADO
  usuario_id INTEGER,
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de itens de inventário
CREATE TABLE IF NOT EXISTS inventario_itens (
  id SERIAL PRIMARY KEY,
  inventario_id INTEGER NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL,
  quantidade_sistema NUMERIC(12,3),
  quantidade_contada NUMERIC(12,3),
  diferenca NUMERIC(12,3),
  motivo_ajuste VARCHAR(100),
  usuario_contagem_id INTEGER,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS ix_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS ix_unidades_empresa ON unidades(empresa_id);
CREATE INDEX IF NOT EXISTS ix_inventarios_empresa ON inventarios(empresa_id);
CREATE INDEX IF NOT EXISTS ix_inventarios_status ON inventarios(status);
CREATE INDEX IF NOT EXISTS ix_inventario_itens_inventario ON inventario_itens(inventario_id);
