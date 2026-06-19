-- Migration 20: Auditoria Fiscal
-- Tabela para rastreamento de mudanças em dados fiscais críticos

CREATE TABLE IF NOT EXISTS auditoria_fiscal (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id BIGINT REFERENCES produtos(id) ON DELETE SET NULL,
  tabela VARCHAR(50) NOT NULL, -- 'produtos', 'empresas', 'aliquotas', etc
  tipo_mudanca VARCHAR(50) NOT NULL, -- 'CRIACAO', 'ATUALIZACAO', 'REMOCAO'
  campo TEXT, -- Lista de campos alterados (JSON array)
  valor_antes TEXT, -- Valor anterior (JSON dump)
  valor_depois TEXT, -- Valor novo (JSON dump)
  atualizado_em TIMESTAMP DEFAULT NOW(),
  INDEX idx_empresa_fiscal (empresa_id, atualizado_em),
  INDEX idx_produto_fiscal (produto_id, atualizado_em),
  INDEX idx_usuario_fiscal (usuario_id, atualizado_em),
  INDEX idx_tipo_fiscal (tipo_mudanca)
);

-- Índice para buscar mudanças recentes rapidamente
CREATE INDEX idx_fiscal_recente ON auditoria_fiscal
  (empresa_id, atualizado_em DESC)
  WHERE atualizado_em > NOW() - INTERVAL '90 days';

-- Comentários
COMMENT ON TABLE auditoria_fiscal IS
  'Auditoria de mudanças em dados fiscais (NCM, CFOP, CST, alíquotas, CRT, CNPJ, etc)
   Persiste antes/depois para análise e conformidade.';

COMMENT ON COLUMN auditoria_fiscal.campo IS
  'Array JSON com nomes dos campos alterados. Ex: ["ncm_codigo", "cst_icms"]';

COMMENT ON COLUMN auditoria_fiscal.valor_antes IS
  'JSON com valores anteriores de todos os campos relevantes do produto/empresa';

COMMENT ON COLUMN auditoria_fiscal.valor_depois IS
  'JSON com valores novos de todos os campos relevantes do produto/empresa';

-- Tabela de permissões para auditoria fiscal (se não existir)
DO $$
BEGIN
  INSERT INTO papeis_permissoes (papel, permissao, descricao)
  VALUES
    ('ADMIN', 'fiscal.auditar', 'Ver auditoria fiscal e detectar anomalias'),
    ('GERENTE', 'fiscal.auditar', 'Ver auditoria fiscal'),
    ('ADMIN', 'fiscal.configurar', 'Alterar dados fiscais críticos (CRT, CNPJ, etc)'),
    ('GERENTE', 'fiscal.configurar', 'Alterar NCM, CST, alíquotas de produtos')
  ON CONFLICT (papel, permissao) DO NOTHING;
END $$;
