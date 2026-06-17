-- ============================================================================
-- SnapPay — Fase 0 (Fundação): multiempresa, RBAC, módulos ativáveis,
-- categorias e base de caixa. PostgreSQL.
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT onde possível.
-- ============================================================================

-- ---------- EMPRESAS / UNIDADES (multiempresa) ----------
CREATE TABLE IF NOT EXISTS empresas (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    cnpj        VARCHAR(18) NULL,
    segmento    VARCHAR(20) NOT NULL DEFAULT 'mercado',
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unidades (
    id          SERIAL PRIMARY KEY,
    empresa_id  INT NOT NULL REFERENCES empresas(id),
    nome        VARCHAR(120) NOT NULL,
    codigo      VARCHAR(20) NOT NULL DEFAULT '001',
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- RBAC: papéis, permissões, usuários ----------
CREATE TABLE IF NOT EXISTS papeis (
    id          SERIAL PRIMARY KEY,
    chave       VARCHAR(20) NOT NULL UNIQUE,  -- ADMIN, GERENTE, OPERADOR
    nome        VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS permissoes (
    id          SERIAL PRIMARY KEY,
    chave       VARCHAR(40) NOT NULL UNIQUE,  -- ex.: produtos.editar, caixa.sangria
    descricao   VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS papel_permissao (
    papel_id      INT NOT NULL REFERENCES papeis(id) ON DELETE CASCADE,
    permissao_id  INT NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
    PRIMARY KEY (papel_id, permissao_id)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id           SERIAL PRIMARY KEY,
    empresa_id   INT NOT NULL REFERENCES empresas(id),
    papel_id     INT NOT NULL REFERENCES papeis(id),
    nome         VARCHAR(120) NOT NULL,
    email        VARCHAR(120) NOT NULL UNIQUE,
    senha_hash   VARCHAR(200) NOT NULL,
    ativo        BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- MÓDULOS ATIVÁVEIS ----------
CREATE TABLE IF NOT EXISTS modulos (
    chave       VARCHAR(20) PRIMARY KEY,       -- cadastro, pdv, caixa, mercado, padaria...
    nome        VARCHAR(60) NOT NULL,
    nucleo      BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = sempre ativo
    ordem       INT NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS empresa_modulos (
    empresa_id  INT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    modulo_key  VARCHAR(20) NOT NULL REFERENCES modulos(chave),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (empresa_id, modulo_key)
);

-- ---------- CATEGORIAS DE PRODUTO ----------
CREATE TABLE IF NOT EXISTS categorias (
    id          SERIAL PRIMARY KEY,
    empresa_id  INT NOT NULL REFERENCES empresas(id),
    nome        VARCHAR(60) NOT NULL,
    cor         VARCHAR(9) NOT NULL DEFAULT '#6366f1',
    icone       VARCHAR(8) NOT NULL DEFAULT '🏷️',
    ordem       INT NOT NULL DEFAULT 100,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- BASE DE CAIXA ----------
CREATE TABLE IF NOT EXISTS caixas (
    id            SERIAL PRIMARY KEY,
    empresa_id    INT NOT NULL REFERENCES empresas(id),
    unidade_id    INT NULL REFERENCES unidades(id),
    usuario_id    INT NULL REFERENCES usuarios(id),
    status        VARCHAR(10) NOT NULL DEFAULT 'ABERTO', -- ABERTO, FECHADO
    valor_abertura NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_fechamento NUMERIC(12,2) NULL,
    aberto_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fechado_em    TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS caixa_movimentos (
    id          SERIAL PRIMARY KEY,
    caixa_id    INT NOT NULL REFERENCES caixas(id) ON DELETE CASCADE,
    tipo        VARCHAR(12) NOT NULL, -- ABERTURA, SANGRIA, SUPRIMENTO, VENDA, FECHAMENTO
    valor       NUMERIC(12,2) NOT NULL,
    observacao  VARCHAR(200) NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- ESCOPO MULTIEMPRESA NAS TABELAS EXISTENTES ----------
ALTER TABLE produtos  ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresas(id);
ALTER TABLE produtos  ADD COLUMN IF NOT EXISTS categoria_id INT REFERENCES categorias(id);
ALTER TABLE clientes  ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresas(id);
ALTER TABLE vendas    ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresas(id);
ALTER TABLE vendas    ADD COLUMN IF NOT EXISTS caixa_id INT REFERENCES caixas(id);

-- ============================================================================
-- SEED BASE (idempotente)
-- ============================================================================

-- Empresa + unidade demo
INSERT INTO empresas (id, nome, segmento) VALUES (1, 'SnapPay Loja Demo', 'mercado')
    ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('empresas','id'), GREATEST((SELECT MAX(id) FROM empresas),1));
INSERT INTO unidades (id, empresa_id, nome, codigo) VALUES (1, 1, 'Loja 001', '001')
    ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('unidades','id'), GREATEST((SELECT MAX(id) FROM unidades),1));

-- Papéis
INSERT INTO papeis (chave, nome) VALUES
    ('ADMIN','Administrador'), ('GERENTE','Gerente'), ('OPERADOR','Operador de Caixa')
    ON CONFLICT (chave) DO NOTHING;

-- Permissões (núcleo)
INSERT INTO permissoes (chave, descricao) VALUES
    ('produtos.ver','Ver produtos'), ('produtos.editar','Criar/editar produtos'),
    ('categorias.editar','Gerenciar categorias'),
    ('vendas.criar','Realizar vendas'), ('vendas.cancelar','Cancelar vendas'),
    ('caixa.operar','Abrir/fechar caixa'), ('caixa.sangria','Sangria/suprimento'),
    ('estoque.editar','Movimentar estoque'),
    ('financeiro.ver','Ver financeiro'),
    ('relatorios.ver','Ver relatórios'),
    ('config.editar','Configurações'), ('usuarios.gerenciar','Gerenciar usuários'),
    ('modulos.gerenciar','Ativar/desativar módulos')
    ON CONFLICT (chave) DO NOTHING;

-- ADMIN: todas as permissões
INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p CROSS JOIN permissoes perm WHERE p.chave='ADMIN'
    ON CONFLICT DO NOTHING;
-- GERENTE: tudo menos gestão de usuários/módulos
INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p JOIN permissoes perm ON perm.chave NOT IN ('usuarios.gerenciar','modulos.gerenciar')
    WHERE p.chave='GERENTE' ON CONFLICT DO NOTHING;
-- OPERADOR: operação de caixa/vendas
INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p JOIN permissoes perm ON perm.chave IN
        ('produtos.ver','vendas.criar','caixa.operar','caixa.sangria','estoque.editar')
    WHERE p.chave='OPERADOR' ON CONFLICT DO NOTHING;

-- Módulos (núcleo + segmentos)
INSERT INTO modulos (chave, nome, nucleo, ordem) VALUES
    ('cadastro','Cadastros', TRUE, 10),
    ('produtos','Produtos', TRUE, 20),
    ('estoque','Estoque', TRUE, 30),
    ('pdv','PDV', TRUE, 40),
    ('caixa','Caixa', TRUE, 50),
    ('vendas','Vendas', TRUE, 60),
    ('financeiro','Financeiro', TRUE, 70),
    ('relatorios','Relatórios', TRUE, 80),
    ('mercado','Módulo Mercado', FALSE, 110),
    ('padaria','Módulo Padaria', FALSE, 120),
    ('restaurante','Módulo Restaurante', FALSE, 130),
    ('loja','Módulo Loja', FALSE, 140),
    ('distribuidora','Módulo Distribuidora', FALSE, 150),
    ('servicos','Módulo Serviços', FALSE, 160)
    ON CONFLICT (chave) DO NOTHING;

-- Empresa demo: ativa núcleo + mercado
INSERT INTO empresa_modulos (empresa_id, modulo_key, ativo)
    SELECT 1, chave, TRUE FROM modulos WHERE nucleo = TRUE OR chave = 'mercado'
    ON CONFLICT DO NOTHING;

-- Categorias demo
INSERT INTO categorias (empresa_id, nome, cor, icone, ordem) VALUES
    (1,'Bebidas','#0ea5e9','🥤',10),
    (1,'Alimentos','#f59e0b','🍞',20),
    (1,'Limpeza','#22c55e','🧽',30),
    (1,'Higiene','#a855f7','🧴',40)
    ON CONFLICT DO NOTHING;

-- Vincula produtos e clientes existentes à empresa demo
UPDATE produtos SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE clientes SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE vendas   SET empresa_id = 1 WHERE empresa_id IS NULL;
