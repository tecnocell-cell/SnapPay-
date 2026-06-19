# 🔧 RELATÓRIO — Correção dos Bugs ALTOS (pós-Homologação Fase 3.5)

**Data:** 17 de junho de 2026
**Base:** [RELATORIO_HOMOLOGACAO_FASE_3.5.md](RELATORIO_HOMOLOGACAO_FASE_3.5.md)
**Objetivo:** corrigir todos os bugs ALTOS antes da Fase Fiscal. Sem iniciar Fiscal.
**Resultado da re-homologação:** **25/25 testes passaram, 0 falhas.**

---

## Prioridade 1 — RBAC no backend ✅

Antes, só `caixa` e `modulos` checavam permissão; qualquer usuário autenticado podia criar produto, mexer no estoque, etc. Agora a proteção é **no backend**, em todas as rotas sensíveis (não depende do menu).

**Ajuste de papéis** (migration `migration_07_rbac_auditoria.sql`):
- Novas permissões: `compras.gerenciar`, `financeiro.gerenciar`, `inventario.gerenciar`, `auditoria.ver`.
- **OPERADOR** perdeu `estoque.editar` (regra: operador não altera estoque). Ficou com: `produtos.ver`, `vendas.criar`, `caixa.operar`, `caixa.sangria` (4 permissões).
- **GERENTE**: todas menos `usuarios.gerenciar` e `modulos.gerenciar` (15).
- **ADMIN**: todas (17), dentro da própria empresa.

**Middleware `requirePermissao` aplicado em:**
| Rota | Permissão |
|------|-----------|
| produtos POST/PUT/DELETE | `produtos.editar` |
| produtos/marcas GET | `produtos.ver` |
| estoque/movimentar | `estoque.editar` |
| fornecedores, compras (todas) | `compras.gerenciar` |
| financeiro GET | `financeiro.ver` |
| financeiro POST/PUT (liquidar) | `financeiro.gerenciar` |
| configuracoes, empresa PUT | `config.editar` |
| inventario (todas) | `inventario.gerenciar` |
| auditoria GET | `auditoria.ver` |
| vendas POST | `vendas.criar` |
| vendas cancelar | `vendas.cancelar` |
| relatorios | `relatorios.ver` |
| modulos PUT | `modulos.gerenciar` |

**Testes (todos ✅):** Operador recebe **403** ao tentar criar produto, alterar estoque, criar compra, liquidar financeiro, alterar configurações e acessar auditoria; **PODE** vender. Gerente cria produto e vê financeiro, mas **403** em módulos. Admin acessa auditoria.

---

## Prioridade 2 — Auditoria real ✅

`registrarAuditoria` integrada nos fluxos. Grava `usuario_id`, `empresa_id`, `tipo`, `tabela`, `registro_id`, `acao` e, quando aplicável, `dados_anteriores`/`dados_novos`.

**Eventos cobertos:** `LOGIN`, `VENDA`, `RECEBIMENTO` (compra), `FINANCEIRO` (liquidação), `CAIXA` (abrir/sangria/suprimento/fechar), `INVENTARIO`, e `CREATE`/`UPDATE`/`DELETE` (produtos, fornecedores, compras, contas, configurações, empresa, estoque).

**Testes (todos ✅):** após operações reais a auditoria deixou de ficar vazia; registra LOGIN, VENDA e CREATE. Isolada por empresa (logs da empresa B só contêm registros da empresa B).

---

## Prioridade 3 — Caixa por forma de pagamento ✅

- A venda agora grava **um movimento de caixa por forma de pagamento**, com `forma_pagamento` preenchido.
- **Só DINHEIRO entra no saldo físico** da gaveta. PIX e cartão entram no resumo eletrônico, mas **não** aumentam o dinheiro contado.
- Fechamento separa **esperado em dinheiro** de **eletrônico**; a **diferença é calculada apenas sobre o dinheiro físico**.
- Resumo por forma: `DINHEIRO`, `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO`.

**Teste (✅):** venda mista (R$50 dinheiro + R$30 PIX + R$20 crédito) → saldo físico considerou só o dinheiro; fechamento com `esperadoDinheiro` correto, `eletronico` separado e `diferenca = 0` ao contar o dinheiro esperado; resumo separou as 3 formas.

---

## Prioridade 4 — Inventário completo ✅

- Novo endpoint **`POST /api/inventario/:id/itens`** para registrar a contagem (calcula `quantidade_sistema` e `diferenca` automaticamente; faz upsert por produto).
- **`GET /api/inventario/:id`** retorna o inventário com seus itens.
- **Fechar** agora: exige itens (impede fechar sem contagem), aplica ajustes, gera movimento de estoque com **tipo correto** (`AJUSTE_ENTRADA`/`AJUSTE_SAIDA`), **saldos anterior/posterior** e **auditoria**.

**Testes (todos ✅):** não fecha sem contagem (400); contagem calcula diferença; fechar aplica o ajuste; estoque atualizado; kardex com `AJUSTE_SAIDA` e saldos.

---

## Bugs adicionais encontrados e corrigidos na re-homologação

- 🟠 **`GET /api/auditoria` — coluna `id` ambígua** (existe em `auditoria` e `usuarios` no JOIN). A rota travava a requisição. Corrigido: colunas qualificadas com `a.`, `LEFT JOIN`, `try/catch` e inclusão de `empresa_id` no retorno.

*(O guard de processo adicionado na homologação anterior evitou que esse erro derrubasse o servidor — apenas a requisição específica falhava.)*

---

## Arquivos alterados

```
backend/migration_07_rbac_auditoria.sql      (novo — permissões e papéis)
backend/src/server.js                         (RBAC + auditoria + caixa por forma na venda)
backend/src/routes/produtos.js                (RBAC + auditoria CRUD)
backend/src/routes/marcas.js                  (RBAC)
backend/src/routes/fornecedores.js            (RBAC + auditoria)
backend/src/routes/compras.js                 (RBAC + auditoria)
backend/src/routes/financeiro.js              (RBAC + auditoria)
backend/src/routes/configuracoes.js           (RBAC + auditoria)
backend/src/routes/auditoria.js               (RBAC + fix id ambíguo + empresa_id no retorno)
backend/src/routes/inventario.js              (endpoint de contagem + RBAC + auditoria + saldos)
backend/src/routes/auth.js                     (auditoria de LOGIN)
backend/src/routes/caixa.js                   (RBAC já existia + auditoria + saldo só-dinheiro + conferência)
frontend/src/lib/modules.jsx                  (perms do menu alinhadas às novas chaves)
```

---

## Re-homologação — resultado

```
== RBAC (Prioridade 1) ==            11/11 ✅
== Auditoria (Prioridade 2) ==        4/4  ✅
== Caixa por forma (Prioridade 3) ==  3/3  ✅
== Inventário (Prioridade 4) ==       5/5  ✅
== Multiempresa (re-confirmação) ==   2/2  ✅
==== RESULTADO: 25 passou, 0 falhou ====
```

- ✅ Build frontend sem erro (288.61 kB)
- ✅ Backend sobe sem erro de sintaxe/import
- ✅ Dados de teste preservados (empresa B, gerente, operador)

---

## Situação dos bugs da Fase 3.5

| Severidade | Status |
|------------|--------|
| 🔴 Críticos (3) | Corrigidos na homologação anterior |
| 🟠 Altos (5) | **Todos corrigidos nesta etapa** |
| 🟡 Médios (2) | Corrigidos junto (kardex de venda com `SAIDA_VENDA` + saldos; inventário com saldos e direção) |
| 🔵 Baixos (2) | Pendentes (não bloqueantes) |

**Conclusão:** os bugs ALTOS (e os médios relacionados) estão resolvidos e validados. A base de gestão está consistente, segura (RBAC real no backend) e rastreável (auditoria populada) — pré-requisitos que o módulo Fiscal pressupõe. **Fiscal não foi iniciado**, conforme instrução.
