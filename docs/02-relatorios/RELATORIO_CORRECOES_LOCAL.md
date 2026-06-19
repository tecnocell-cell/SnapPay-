# 🔧 RELATÓRIO — Correções para Rodar o SnapPay Localmente

**Data:** 17 de junho de 2026
**Branch:** `main`
**Commit das correções:** `2498e0f`
**Contexto:** O sistema não logava e, após logar, abria com vários erros 404 e o menu duplicado. Esta etapa foi de **diagnóstico e correção** — não de novas features.

---

## 1. Objetivo da etapa

Fazer o SnapPay (que estava só com código das Fases 1, 2 e 3, mas nunca tinha rodado de ponta a ponta na máquina local) **efetivamente funcionar**: login, carregamento de dados e navegação entre telas.

> Observação importante (pedido do usuário): produção é configurada pelo próprio usuário. Esta etapa cuidou **apenas do ambiente local de desenvolvimento**.

---

## 2. Diagnóstico — a cadeia de problemas encontrados

O sintoma inicial (`ERR_CONNECTION_REFUSED` / `ERR_CONNECTION_RESET` no login) escondia **uma cadeia de 7 problemas distintos**, descobertos um a um:

| # | Problema | Causa raiz | Camada |
|---|----------|-----------|--------|
| 1 | Backend não subia | 4 rotas da Fase 3 importavam `empresaId` de `db.js`, mas ela existe em `auth.js` → `SyntaxError` no boot | Backend |
| 2 | Banco não existia | O banco nunca tinha sido criado (script anterior falhou silenciosamente). Não havia `easysac_pdv` nem `snappay` | Banco |
| 3 | Tabelas da Fase 2 faltando | As rotas de `compras`/`fornecedores`/`contas` existiam, mas **nenhum SQL criava as tabelas**. A `migration_04` só fazia `ALTER` numa tabela inexistente | Banco |
| 4 | Sem usuário para logar | O seed criava empresa, papéis e permissões, mas **nenhum usuário** | Banco |
| 5 | Produtos/categorias/clientes davam 404 | `api.js` chamava a API **sem o prefixo `/api`** | Frontend |
| 6 | Módulos davam 404 + menu duplicado | `modules.jsx` chamava rota inexistente (`/api/empresa/:id/modulos`) e mapeava campo errado; labels do menu tinham emoji duplicado | Frontend |
| 7 | `/api/produtos` retornava lixo | Rotas da Fase 3 tratavam o retorno de `query()` como array, mas o `pg` retorna um objeto com `.rows` | Backend |

---

## 3. O que foi feito

### 3.1 Banco de dados local (`snappay`)

- Criado o banco **`snappay`** no PostgreSQL 17 (nome do projeto — sem resquício de outros nomes).
- Carregados os schemas na ordem correta:
  `schema.postgres.sql` → `schema.fase0.postgres.sql` → **`schema.fase2.postgres.sql` (novo)** → migrations 03–06 → `seed.postgres.sql`.
- Adicionadas as colunas de empresa que a `migration_06` havia pulado (a tabela `empresas` já existia do fase0).
- Corrigido o `empresa_id` dos 15 produtos do seed (estavam `NULL`).
- Criado o usuário administrador para login.

### 3.2 Novo arquivo de schema — `backend/schema.fase2.postgres.sql`

Cria as tabelas base que nunca tiveram schema:
`fornecedores`, `compras`, `compra_itens`, `contas_pagar`, `contas_receber`, `configuracoes`, `auditoria`.

### 3.3 Correções no Backend

- **Imports:** `empresaId` passou a ser importado de `auth.js` em `produtos.js`, `marcas.js`, `empresa.js`, `inventario.js`.
- **`.rows` / `.rowCount`:** corrigido o tratamento do retorno de `query()` em `produtos.js`, `marcas.js`, `empresa.js`, `inventario.js`, `compras.js` e `caixa.js` (endpoints da Fase 3).
- **Bug financeiro:** `compras.js` gravava a conta a pagar numa tabela inexistente `contas`; corrigido para **`contas_pagar`** (a tabela que o módulo Financeiro realmente lê).

### 3.4 Correções no Frontend

- **`api.js`:** base da API agora inclui `/api` (`http://localhost:3001/api`).
- **`modules.jsx`:** endpoint corrigido para `/api/modulos`, mapeamento por `m.chave`, labels do menu sem emoji duplicado, e **todas as telas das Fases 2/3 adicionadas ao menu** (estavam órfãs — código existia mas não aparecia em lugar nenhum).
- **`App.jsx`:** `PAGINAS` alinhado aos módulos ativos do `REGISTRY` (fornecedores/compras apontavam para um módulo `compras` que não existe).

### 3.5 Configuração local

- Criado `backend/.env` apontando para o banco `snappay` (mantido **fora do git** — contém senha).

---

## 4. Validação (testada de ponta a ponta)

| Item | Resultado |
|------|-----------|
| Login `admin@snappay.local` / `admin123` | ✅ retorna token + usuário + empresa + permissões |
| `/api/produtos` | ✅ array com 15 produtos, `empresa_id: 1` |
| `/api/categorias`, `/api/modulos`, `/api/caixa/atual` | ✅ respondendo |
| `/api/fornecedores`, `/api/empresa`, `/api/financeiro/resumo` | ✅ sem erro |
| Build frontend | ✅ 288.61 kB, 45 módulos, 0 erros |
| Tela do PDV no navegador | ✅ produtos listados, menu limpo, navegação completa |

---

## 5. Multi-tenant — confirmação

O SnapPay **é multi-tenant**: `empresa_id` em todas as tabelas, JWT carrega o `empresa_id`, helper `empresaId(req)` em `auth.js`, e todas as queries filtram por empresa. O papel ADMIN é administrador **dentro da própria empresa**, não um super-admin global.

Referência futura (a pedido do usuário): o projeto **CenterFlow/Fluxiva** pode ser consultado como exemplo de padrão multi-tenant, **somente leitura**.

---

## 6. Arquivos alterados (commit `2498e0f`)

```
backend/schema.fase2.postgres.sql      (novo)
backend/src/routes/produtos.js
backend/src/routes/marcas.js
backend/src/routes/empresa.js
backend/src/routes/inventario.js
backend/src/routes/compras.js
backend/src/routes/caixa.js
frontend/src/App.jsx
frontend/src/lib/api.js
frontend/src/lib/modules.jsx
```
*(`backend/.env` foi criado mas não versionado — está no `.gitignore`.)*

---

## 7. Pendência recomendada (não bloqueante)

Como o `.env` e os passos de criação do banco não vivem no repositório, sugere-se futuramente um **script `setup-db`** que automatize: criar banco → carregar schemas na ordem → criar usuário admin. Isso torna o onboarding reproduzível em qualquer máquina. Os passos manuais estão documentados.

---

**Status:** ✅ SnapPay rodando localmente, ponta a ponta.
**Próximo passo sugerido:** validar fluxos de operação (abrir caixa → venda → fornecedor → compra → recebimento → conta a pagar).
