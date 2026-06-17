-- Migration 07: RBAC completo + ajuste de permissões por papel
-- Objetivo: chaves de permissão para gestão (compras, financeiro, inventário,
-- auditoria) e ajuste dos papéis conforme regra de negócio da Fase 3.5.

-- Novas permissões
INSERT INTO permissoes (chave, descricao) VALUES
    ('compras.gerenciar',    'Gerenciar fornecedores e compras'),
    ('financeiro.gerenciar', 'Criar e liquidar contas a pagar/receber'),
    ('inventario.gerenciar', 'Criar, contar e fechar inventário'),
    ('auditoria.ver',        'Consultar logs de auditoria')
    ON CONFLICT (chave) DO NOTHING;

-- ADMIN: todas as permissões (re-aplica para pegar as novas)
INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p CROSS JOIN permissoes perm WHERE p.chave='ADMIN'
    ON CONFLICT DO NOTHING;

-- GERENTE: tudo menos gestão de usuários/módulos (re-aplica para pegar as novas)
INSERT INTO papel_permissao (papel_id, permissao_id)
    SELECT p.id, perm.id FROM papeis p
      JOIN permissoes perm ON perm.chave NOT IN ('usuarios.gerenciar','modulos.gerenciar')
    WHERE p.chave='GERENTE' ON CONFLICT DO NOTHING;

-- OPERADOR: caixa/vendas apenas. Remove estoque.editar (regra: operador não
-- altera estoque). Mantém produtos.ver, vendas.criar, caixa.operar, caixa.sangria.
DELETE FROM papel_permissao
 WHERE papel_id = (SELECT id FROM papeis WHERE chave='OPERADOR')
   AND permissao_id = (SELECT id FROM permissoes WHERE chave='estoque.editar');
