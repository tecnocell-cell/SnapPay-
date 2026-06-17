# 🧪 RELATÓRIO DE HOMOLOGAÇÃO — Fase 3.5

**Data:** 17 de junho de 2026
**Tipo:** Homologação operacional (sem desenvolvimento de novas features)
**Método:** Execução real dos fluxos contra o backend (API HTTP) + verificação direta no banco PostgreSQL
**Escopo:** 6 cenários. Sem Fiscal, WhatsApp, IA, Restaurante ou Delivery.

---

## Veredito por cenário

| # | Cenário | Veredito |
|---|---------|----------|
| 1 | Venda completa | 🟡 **Aprovado com ressalvas** |
| 2 | Compra completa | 🟢 **Aprovado** (após correção crítica) |
| 3 | Inventário | 🟡 **Aprovado com ressalvas** |
| 4 | Multiempresa | 🟢 **Aprovado** (reprovado inicialmente; corrigido durante a homologação) |
| 5 | Permissões | 🟡 **Aprovado com ressalvas** |
| 6 | Stress | 🟢 **Aprovado** |

---

## Cenário 1 — Venda completa 🟡

**Executado:** abrir caixa (R$100) → cadastrar cliente → venda de 2× Grill (R$519,80) com pagamento misto (Dinheiro R$200 + PIX R$200 + Cartão R$119,80) → fechar caixa com conferência.

**Funcionou:**
- ✅ Venda finalizada, total correto (R$519,80)
- ✅ Baixa de estoque (10 → 8)
- ✅ Pagamentos registrados em `venda_pagamentos` (3 formas)
- ✅ Fechamento de caixa com conferência calcula diferença

**Ressalvas (bugs):**
- 🟠 **ALTO** — O caixa soma **todas as formas** (PIX + cartão) no saldo da gaveta. Fisicamente, só o dinheiro entra no caixa. Saldo de dinheiro fica superestimado.
- 🟠 **ALTO** — `forma_pagamento` não é gravada em `caixa_movimentos`. A conferência "por forma de pagamento" agrupa tudo como DINHEIRO.
- 🟡 **MÉDIO** — O movimento de estoque da venda grava `tipo='SAIDA'` (não `'SAIDA_VENDA'`) e **sem** `saldo_anterior`/`saldo_posterior`. O Kardex exibe sem rótulo e sem saldos.
- 🟠 **ALTO** — Nenhum registro de **auditoria** foi gerado pela venda.

---

## Cenário 2 — Compra completa 🟢

**Executado:** cadastrar fornecedor → criar compra (10× a R$40, venc. +30d) → receber → verificar estoque/kardex/conta a pagar → liquidar conta.

**Bug crítico encontrado e CORRIGIDO durante a homologação:**
- 🔴 **CRÍTICO** — Receber compra falhava com `valor é muito longo para character varying(10)`. A coluna `estoque_movimentacao.tipo` era `VARCHAR(10)`, mas a Fase 3 usa valores de até 18 chars (`ENTRADA_COMPRA`, `CANCELAMENTO_VENDA`…). **Bloqueava todo recebimento de compra e inventário.** → **Corrigido** (coluna ampliada para `VARCHAR(30)` no banco e no `schema.postgres.sql`).

**Após a correção, funcionou ponta a ponta:**
- ✅ Estoque atualizado (20 → 30)
- ✅ Kardex com `ENTRADA_COMPRA`, **saldo_anterior 20 / saldo_posterior 30** (este caminho registra saldos corretamente)
- ✅ Conta a pagar gerada **automaticamente** (R$400, vinculada à compra e ao fornecedor)
- ✅ Liquidação → status PAGA, `pago_mes = 400`

**Ressalva:**
- 🟠 **ALTO** — Recebimento de compra não gera registro de **auditoria**.

---

## Cenário 3 — Inventário 🟡

**Executado:** criar inventário → inserir divergência (produto 7: sistema 40, contado 38, dif −2) → fechar → verificar estoque/kardex.

**Funcionou:**
- ✅ Ajuste aplicado (estoque 40 → 38)
- ✅ Movimento `INVENTARIO` gerado com o motivo

**Ressalvas (bugs):**
- 🟠 **ALTO** — **Não existe endpoint para lançar a contagem** (`inventario_itens`). A rota só tem criar/listar/fechar. A divergência teve de ser inserida via banco. O fluxo de inventário é incompleto via API/tela.
- 🟡 **MÉDIO** — O movimento de inventário grava quantidade **em valor absoluto** e `tipo='INVENTARIO'` sem indicar direção; `saldo_anterior`/`saldo_posterior` ficam nulos. Não dá para saber pelo Kardex se foi entrada ou baixa (o estoque é ajustado corretamente, mas o histórico é ambíguo).
- 🟠 **ALTO** — Ajuste de inventário não gera registro de **auditoria**.

---

## Cenário 4 — Multiempresa 🟢 (reprovado → corrigido)

**Executado:** criar empresa B + usuário + produto exclusivo → login nas duas → verificar isolamento de produtos, fornecedores, clientes, caixa e relatórios.

**Reprovado inicialmente — vazamentos multi-tenant CRÍTICOS encontrados:**
- 🔴 **CRÍTICO** — A empresa B **enxergava o cliente da empresa A** (`clientes` não tinha `empresa_id` no insert nem filtro no select).
- 🔴 **CRÍTICO** — Relatórios (`resumo`, `top-produtos`, `vendas-por-dia`, `pagamentos`), listagem/detalhe de **vendas**, e **alertas de estoque** agregavam dados de **todas as empresas** (rotas legadas no `server.js` sem filtro `empresa_id`).

**Corrigido durante a homologação** — todas as rotas legadas passaram a filtrar por `empresa_id`. Reteste:
- ✅ Produtos: A vê 15 (sem B001), B vê só B001
- ✅ Fornecedores: isolados
- ✅ Clientes: B não vê mais o cliente da A; novo cliente da B nasce com `empresa_id=2`
- ✅ Relatórios: A vê R$519,80 / B vê zero
- ✅ Caixa: isolado por empresa

**Conclusão:** isolamento total **validado após correção**.

---

## Cenário 5 — Permissões 🟡

**Executado:** criar Gerente e Operador → validar permissões e enforcement no backend.

**Funcionou:**
- ✅ Permissões diferenciadas: ADMIN (13), GERENTE (11), OPERADOR (5)
- ✅ Ativação de módulo corretamente bloqueada: Operador 403, Gerente 403, Admin 200 (`requirePermissao` funciona onde está aplicado)

**Ressalva (bug):**
- 🟠 **ALTO** — As rotas de escrita de **produtos, clientes e vendas** usam apenas `requireAuth`, **sem `requirePermissao`**. Um Operador conseguiu **criar produto via API (HTTP 200)**. O menu do frontend esconde as opções, mas a API aceita. O RBAC só é efetivamente aplicado em `caixa` e `modulos`.

---

## Cenário 6 — Stress 🟢

**Executado:** 100 produtos + 50 vendas + 20 compras recebidas + 20 contas a pagar, via API, com leituras sob carga.

| Operação | Resultado | Tempo |
|----------|-----------|-------|
| 100 produtos | 100 criados | 496 ms |
| 50 vendas | 50 ok | 331 ms (~6,6 ms/venda) |
| 20 compras recebidas (transacional) | 20 ok | 275 ms |
| 20 contas a pagar | 20 ok | 65 ms |
| Leituras (116 produtos + resumo + top) | — | 22 ms |
| **Total** | **0 erros** | **2,0 s** |

- ✅ Zero erros sob carga
- ✅ Servidor permaneceu estável (o tratamento de erro adicionado segurou)
- ✅ Desempenho excelente para o volume testado

---

## Bugs encontrados — classificação

### 🔴 Críticos — CORRIGIDOS nesta homologação
1. **`estoque_movimentacao.tipo` VARCHAR(10)** bloqueava recebimento de compra e inventário. → `VARCHAR(30)`.
2. **Vazamento multi-tenant** em clientes, vendas (lista/detalhe/cancelar), alertas de estoque e todos os relatórios. → `empresa_id` aplicado em todas.
3. **Servidor caía** quando uma rota async dava erro (unhandled rejection matava o processo). → error handler do Express + `unhandledRejection`/`uncaughtException` guards. Também corrigida a query com `id` ambíguo em `financeiro` (gatilho da queda).

### 🟠 Altos — DOCUMENTADOS (recomendado corrigir antes do Fiscal)
4. **Auditoria nunca é populada** — `registrarAuditoria` não é chamada em nenhum fluxo (venda, compra, caixa, inventário). O módulo de auditoria está vazio.
5. **RBAC não aplicado no backend** em produtos/clientes/vendas (só `requireAuth`).
6. **Caixa mistura PIX/cartão no saldo de dinheiro** — saldo da gaveta incorreto.
7. **`forma_pagamento` não gravada** em `caixa_movimentos` — conferência por forma agrupa tudo como dinheiro.
8. **Inventário sem endpoint de contagem** (`inventario_itens`) — fluxo incompleto.

### 🟡 Médios — DOCUMENTADOS
9. Movimento de estoque da **venda** usa `tipo='SAIDA'` sem saldos (inconsistente com a compra, que grava `SAIDA_VENDA`/`ENTRADA_COMPRA` + saldos).
10. Movimento de **inventário** sem saldos e sem sinal de direção.

### 🔵 Baixos — DOCUMENTADOS
11. `caixas.usuario_abertura_id` fica nulo (abertura grava só `usuario_id`).
12. Cliente órfão com `empresa_id` nulo (criado antes da correção) — limpo durante a homologação.

---

## Correções aplicadas (arquivos)

```
backend/schema.postgres.sql              (tipo VARCHAR(10) → VARCHAR(30))
backend/src/server.js                    (empresa_id em clientes/vendas/estoque/relatórios + error handler + process guards)
backend/src/routes/financeiro.js         (id ambíguo qualificado + try/catch nas listagens)
```
*(O banco local também recebeu `ALTER TABLE estoque_movimentacao ALTER COLUMN tipo TYPE VARCHAR(30)` e `UPDATE clientes SET empresa_id=1 WHERE empresa_id IS NULL`.)*

---

## Recomendação para a Fase Fiscal

✅ **Os 3 bugs críticos foram corrigidos** — o sistema está estável, com isolamento multi-tenant íntegro e os fluxos transacionais (venda, compra→financeiro, inventário) funcionando.

⚠️ **Antes de avançar para o Fiscal, recomenda-se fortemente** resolver os itens ALTOS, em especial:
- **Auditoria** (item 4): o Fiscal exige rastreabilidade; hoje nada é logado.
- **RBAC no backend** (item 5): segurança real das operações.
- **Caixa por forma de pagamento** (itens 6 e 7): correção contábil do caixa.

Esses itens não bloqueiam tecnicamente o início do Fiscal, mas comprometem rastreabilidade e segurança — pilares que o módulo Fiscal pressupõe.

---

**Status final:** Homologação concluída. 6/6 cenários executados. 3 críticos corrigidos. 5 altos + 2 médios + 2 baixos documentados.
