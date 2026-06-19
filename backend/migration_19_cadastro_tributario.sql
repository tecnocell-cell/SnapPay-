-- Migration 19: Cadastro Tributário da Empresa e Produtos
-- Data: 2026-06-18
-- Objetivo: Preparar estrutura tributária para NFC-e real

-- ============================================================================
-- TABELAS DE REFERÊNCIA FISCAL
-- ============================================================================

-- Nomenclatura Comum Mercosul (NCM)
CREATE TABLE IF NOT EXISTS ncm (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(8) UNIQUE NOT NULL,  -- Ex: 10061000
  descricao TEXT NOT NULL,            -- Ex: Carne de bovino, fresca ou refrigerada, cortada em pedaços
  aliquota_icms_padrao DECIMAL(5,2),  -- Alíquota padrão ICMS (quando aplicável)
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Código de Especificação da Substituição Tributária (CEST)
CREATE TABLE IF NOT EXISTS cest (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(7) UNIQUE NOT NULL,  -- Ex: 0100100
  descricao TEXT NOT NULL,
  ncm_codigo VARCHAR(8),               -- NCM relacionado (opcional)
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Código Fiscal de Operação e Prestação (CFOP)
CREATE TABLE IF NOT EXISTS cfop (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(4) UNIQUE NOT NULL,  -- Ex: 5101
  descricao TEXT NOT NULL,            -- Ex: Venda de produção do estabelecimento
  tipo VARCHAR(20),                    -- SAIDA, ENTRADA, DEVOLUCAO, TRANSFERENCIA
  aliquota_icms_padrao DECIMAL(5,2),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de Alíquotas de Tributos por Estado (ICMS, PIS, COFINS, IPI)
CREATE TABLE IF NOT EXISTS aliquotas_tributarias (
  id SERIAL PRIMARY KEY,
  ncm_codigo VARCHAR(8),
  uf_destino VARCHAR(2),              -- UF de destino (ou NULL para venda interna)
  regime_tributario VARCHAR(20),      -- SIMPLES_NACIONAL, NORMAL, etc
  cst_icms VARCHAR(3),                -- Ex: 000, 100, 900
  aliquota_icms DECIMAL(5,2),
  cst_pis VARCHAR(3),
  aliquota_pis DECIMAL(5,2),
  cst_cofins VARCHAR(3),
  aliquota_cofins DECIMAL(5,2),
  cst_ipi VARCHAR(3),
  aliquota_ipi DECIMAL(5,2),
  observacao TEXT,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- DADOS DA EMPRESA (TRIBUTÁRIO)
-- ============================================================================

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18) UNIQUE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ie VARCHAR(15);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS im VARCHAR(15);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS crt INTEGER DEFAULT 3;  -- 1=Simples, 2=Simples Excesso, 3=Normal
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cnae_principal VARCHAR(7);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(30) DEFAULT 'NORMAL';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS municipio VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS uf VARCHAR(2);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS razao_social VARCHAR(255);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(255);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS inscricao_estadual_substituta VARCHAR(15);

-- Criar índice para CNPJ (busca rápida)
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);

-- ============================================================================
-- DADOS DOS PRODUTOS (TRIBUTÁRIO)
-- ============================================================================

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm_codigo VARCHAR(8);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cest_codigo VARCHAR(7);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS origem_mercadoria INTEGER DEFAULT 0;  -- 0=Nacional, 1-8=Importação
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cfop_padrao VARCHAR(4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_fiscal VARCHAR(2) DEFAULT 'UN';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst_icms VARCHAR(3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst_pis VARCHAR(3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst_cofins VARCHAR(3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst_ipi VARCHAR(3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS aliquota_icms_padrao DECIMAL(5,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS aliquota_pis_padrao DECIMAL(5,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS aliquota_cofins_padrao DECIMAL(5,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS aliquota_ipi_padrao DECIMAL(5,2);

-- Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_produtos_ncm ON produtos(ncm_codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_cest ON produtos(cest_codigo);

-- ============================================================================
-- DETALHES FISCAIS DA VENDA (POR ITEM)
-- ============================================================================

-- Separar dados tributários de venda_itens (normalizar)
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS ncm_codigo VARCHAR(8);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS cfop_codigo VARCHAR(4);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS cst_icms VARCHAR(3);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS cst_pis VARCHAR(3);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS cst_cofins VARCHAR(3);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS cst_ipi VARCHAR(3);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS aliquota_icms DECIMAL(5,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS aliquota_pis DECIMAL(5,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS aliquota_cofins DECIMAL(5,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS aliquota_ipi DECIMAL(5,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS base_icms DECIMAL(15,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS valor_icms DECIMAL(15,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS valor_pis DECIMAL(15,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS valor_cofins DECIMAL(15,2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS valor_ipi DECIMAL(15,2);

-- ============================================================================
-- COMPLEMENTOS PARA NOTAS FISCAIS
-- ============================================================================

ALTER TABLE fiscal_notas ADD COLUMN IF NOT EXISTS tipo_emissao VARCHAR(20) DEFAULT 'NORMAL';  -- NORMAL, CONTINGENCIA
ALTER TABLE fiscal_notas ADD COLUMN IF NOT EXISTS data_saida_entrada DATE;
ALTER TABLE fiscal_notas ADD COLUMN IF NOT EXISTS valor_total_tributos DECIMAL(15,2);
ALTER TABLE fiscal_notas ADD COLUMN IF NOT EXISTS percentual_tributos DECIMAL(5,2);
ALTER TABLE fiscal_notas ADD COLUMN IF NOT EXISTS informacoes_complementares TEXT;

-- ============================================================================
-- REGRAS FISCAIS POR OPERAÇÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS regras_fiscais (
  id SERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  tipo_operacao VARCHAR(50),         -- VENDA_CONSUMIDOR, VENDA_EMPRESA, TRANSFERENCIA, DEVOLUCAO, COMPRA
  cfop_codigo VARCHAR(4),
  uf_destino VARCHAR(2),
  regime_tributario VARCHAR(30),
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regras_fiscais_empresa ON regras_fiscais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_regras_fiscais_operacao ON regras_fiscais(tipo_operacao);

-- ============================================================================
-- AUDITORIA TRIBUTÁRIA
-- ============================================================================

ALTER TABLE fiscal_eventos ADD COLUMN IF NOT EXISTS ncm_codigo VARCHAR(8);
ALTER TABLE fiscal_eventos ADD COLUMN IF NOT EXISTS cfop_codigo VARCHAR(4);
ALTER TABLE fiscal_eventos ADD COLUMN IF NOT EXISTS cst_icms VARCHAR(3);
ALTER TABLE fiscal_eventos ADD COLUMN IF NOT EXISTS usuario_id BIGINT;

-- ============================================================================
-- IMPORT DE DADOS FISCAIS (FUTURO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fiscal_imports_log (
  id SERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id),
  tipo VARCHAR(20),                  -- NCM, CEST, CFOP, ALIQUOTAS
  origem VARCHAR(50),                -- IBPT, ARQUIVO, MANUAL
  total_registros INTEGER,
  registros_importados INTEGER,
  registros_erro INTEGER,
  resultado TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- VALIDAÇÕES
-- ============================================================================

-- Constraint: NCM deve estar na tabela ncm se fornecido
ALTER TABLE produtos ADD CONSTRAINT fk_produtos_ncm
  FOREIGN KEY (ncm_codigo) REFERENCES ncm(codigo) ON DELETE SET NULL;

-- Constraint: CFOP deve estar na tabela cfop se fornecido
ALTER TABLE produtos ADD CONSTRAINT fk_produtos_cfop
  FOREIGN KEY (cfop_padrao) REFERENCES cfop(codigo) ON DELETE SET NULL;

-- Constraint: CEST deve estar na tabela cest se fornecido
ALTER TABLE produtos ADD CONSTRAINT fk_produtos_cest
  FOREIGN KEY (cest_codigo) REFERENCES cest(codigo) ON DELETE SET NULL;

-- ============================================================================
-- DADOS INICIAIS (MINIMAL)
-- ============================================================================

-- Exemplos de NCM (para testes)
INSERT INTO ncm (codigo, descricao) VALUES
  ('10061000', 'Carne de bovino, fresca ou refrigerada'),
  ('04069010', 'Soro lácteo, mesmo concentrado'),
  ('21069090', 'Preparações alimentares diversas')
ON CONFLICT (codigo) DO NOTHING;

-- Exemplos de CFOP (venda interna)
INSERT INTO cfop (codigo, descricao, tipo) VALUES
  ('5101', 'Venda de produção do estabelecimento', 'SAIDA'),
  ('5102', 'Venda de produção importada', 'SAIDA'),
  ('5201', 'Devolução de venda de produção', 'ENTRADA'),
  ('5911', 'Transferência de produção do estabelecimento', 'SAIDA')
ON CONFLICT (codigo) DO NOTHING;

-- Exemplo de CEST
INSERT INTO cest (codigo, descricao) VALUES
  ('0100100', 'COMBUSTÍVEIS E LUBRIFICANTES')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- COMMIT
-- ============================================================================

-- Exibir status
\echo 'Migration 19 complete: Cadastro Tributário criado com sucesso'
