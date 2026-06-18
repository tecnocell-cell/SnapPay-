-- SQLite schema para Terminal PDV offline-first (Fase 8)
-- Inclui tabelas de vendas, produtos, clientes, pagamentos, sincronização e backup fiscal.

PRAGMA foreign_keys = ON;

-- Configuração do terminal local
CREATE TABLE IF NOT EXISTS config_terminal (
    chave TEXT PRIMARY KEY,
    valor TEXT,
    tipo TEXT, -- STRING, INT, BOOLEAN, JSON
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Produtos (cache do cloud)
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    unidade_id INTEGER,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    categoria_id INTEGER,
    preco_venda REAL NOT NULL,
    estoque_atual REAL DEFAULT 0,
    estoque_minimo REAL DEFAULT 0,
    ativo BOOLEAN DEFAULT 1,
    uuid TEXT UNIQUE,
    sincronizado BOOLEAN DEFAULT 0,
    ultima_atualizacao_cloud DATETIME
);
CREATE INDEX idx_prod_codigo ON produtos(codigo);
CREATE INDEX idx_prod_empresa ON produtos(empresa_id);

-- Clientes básicos (cache do cloud)
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    telefone TEXT,
    ativo BOOLEAN DEFAULT 1,
    uuid TEXT UNIQUE,
    sincronizado BOOLEAN DEFAULT 0,
    ultima_atualizacao_cloud DATETIME
);

-- Categorias (cache do cloud)
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    icone TEXT
);

-- Caixa local
CREATE TABLE IF NOT EXISTS caixa (
    id INTEGER PRIMARY KEY,
    aberto_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    fechado_em DATETIME,
    valor_abertura REAL DEFAULT 0,
    valor_fechamento REAL DEFAULT 0,
    status TEXT DEFAULT 'ABERTO', -- ABERTO, FECHADO
    saldo_final REAL
);

-- Vendas (fila para sync ao cloud)
CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    unidade_id INTEGER,
    cliente_id INTEGER,
    caixa_id INTEGER,
    valor_total REAL NOT NULL,
    desconto_total REAL DEFAULT 0,
    finalizada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    uuid TEXT UNIQUE,
    status_sync TEXT DEFAULT 'PENDENTE', -- PENDENTE, SINCRONIZADO, ERRO
    id_cloud INTEGER,
    tentativas_sync INTEGER DEFAULT 0,
    ultima_tentativa_sync DATETIME
);
CREATE INDEX idx_vendas_status_sync ON vendas(status_sync);

-- Itens da venda
CREATE TABLE IF NOT EXISTS venda_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL,
    quantidade REAL NOT NULL,
    preco_unitario REAL NOT NULL,
    desconto REAL DEFAULT 0,
    valor_total REAL NOT NULL
);

-- Pagamentos
CREATE TABLE IF NOT EXISTS venda_pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    forma TEXT NOT NULL, -- DINHEIRO, PIX, CARTAO_CREDITO, CARTAO_DEBITO
    valor REAL NOT NULL
);

-- Estoque local da unidade (cache + offline)
CREATE TABLE IF NOT EXISTS estoque_local (
    produto_id INTEGER PRIMARY KEY,
    quantidade REAL NOT NULL,
    ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fila de sincronização (backup local de operações pendentes)
CREATE TABLE IF NOT EXISTS fila_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_operacao TEXT NOT NULL, -- VENDA, DEVOLUCAO, etc.
    entidade_id INTEGER,
    payload TEXT, -- JSON
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    sincronizado BOOLEAN DEFAULT 0,
    tentativas INTEGER DEFAULT 0,
    erro_ultima_tentativa TEXT
);

-- Eventos fiscais locais (NFC-e em CONTINGENCIA, devoluções pendentes)
CREATE TABLE IF NOT EXISTS fiscal_pendente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL, -- CONTINGENCIA, DEVOLUCAO_EVENTO, etc.
    venda_id INTEGER,
    descricao TEXT,
    payload TEXT, -- JSON
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    processado BOOLEAN DEFAULT 0
);
