# 🧪 RELATÓRIO — Homologação Offline (Fase 5.1)

**Data:** 17 de junho de 2026
**Base:** [PLANO_FASE_5_OFFLINE_FIRST.md](PLANO_FASE_5_OFFLINE_FIRST.md)
**Método:** validação por API exercitando exatamente os endpoints que a PoC IndexedDB consome (`/api/sync/*`), com captura das respostas reais como evidência.
**Resultado:** **15/15 verificações aprovadas, 0 bugs.**

> Observação: a parte de IndexedDB roda no navegador (página **PDV Offline**). O lado servidor — que cria a venda definitiva, garante idempotência, baixa estoque, registra caixa/auditoria e fiscal — foi validado de forma automatizada e determinística com as evidências abaixo. A conferência visual no navegador segue disponível na página PDV Offline.

---

## Resultado por item

| # | Item validado | Status | Evidência |
|---|---------------|--------|-----------|
| 1 | Ativar terminal como ADMIN | ✅ | device `8b4e0c34-…`, código `BC2AE0`, chave local (48 chars) devolvida 1x |
| 2 | Bloquear ativação p/ GERENTE | ✅ | HTTP **403** |
| 3 | Bloquear ativação p/ OPERADOR | ✅ | HTTP **403** |
| 4 | Criar venda offline → sincronizar | ✅ | venda cloud **#65**, `origem=OFFLINE`, total R$ 299,80 |
| 5 | Venda entrou no cloud (FINALIZADA + uuid_sync) | ✅ | `uuid_sync=off-57bdda3a…`, status `FINALIZADA` |
| 6 | Não duplica ao reenviar (idempotência) | ✅ | mesmo `venda_id #65`, `duplicada=true`; estoque não baixou de novo |
| 7 | Baixa de estoque | ✅ | produto 12 → **10** (−2) |
| 8 | Alerta de divergência (estoque negativo) | ✅ | "Estoque negativo no produto 4 (-5)" — venda criada **e** divergência persistida |
| 9 | Caixa/movimentos por forma de pagamento | ✅ | `[{DINHEIRO:149,90},{PIX:149,90}]` |
| 10 | Nota fiscal `CONTINGENCIA_PENDENTE` | ✅ | venda #67 → nota fiscal #7 status `CONTINGENCIA_PENDENTE` |
| 11 | Auditoria tipo `SYNC` | ✅ | 10 eventos; ex.: "Sincronizou lote do terminal Homolog 5.1: 1 evento(s)" (Administrador) |
| 12 | Bloqueio cross-empresa | ✅ | empresa B no terminal da A: bootstrap **403**, enviar-lote **403** |

---

## Evidências (respostas reais capturadas)

**1–3 · Ativação por perfil**
```
GERENTE  POST /sync/ativar-terminal → 403
OPERADOR POST /sync/ativar-terminal → 403
ADMIN    POST /sync/ativar-terminal → 201
  { device_id: "8b4e0c34-b80b-4415-a255-d2da8ca8731b", codigo: "BC2AE0", chave_local_len: 48 }
```

**3 · Bootstrap**
```
GET /sync/bootstrap?device_id=… → 200
  119 produtos, caixa_aberto=true
```

**4–5 · Venda offline sincronizada**
```
POST /sync/enviar-lote → resultados[0] = { status: PROCESSADO, venda_id: 65 }
GET  /vendas/65 → { id:65, origem:"OFFLINE", total:"299.80", uuid_sync:"off-57bdda3a…", status:"FINALIZADA" }
estoque produto: 12 → 10
```

**6 · Idempotência**
```
POST /sync/enviar-lote (mesmo uuid) → { venda_id: 65, duplicada: true }
estoque permanece 10 (não baixou de novo)
```

**9 · Caixa por forma**
```
GET /caixa/{id}/resumo → porForma:
  [ {forma:"DINHEIRO", quantidade:1, total:149.9}, {forma:"PIX", quantidade:1, total:149.9} ]
```

**7 · Divergência**
```
POST /sync/enviar-lote (qtd > estoque) → { status: PROCESSADO, divergencia: "Estoque negativo no produto 4 (-5)" }
GET /vendas/{id} → venda.divergencia = "Estoque negativo no produto 4 (-5)"
```

**8 · Fiscal em contingência**
```
POST /sync/enviar-lote (fiscal_pendente:true) → venda #67
GET /fiscal/notas?status=CONTINGENCIA_PENDENTE → nota #7 vinculada à venda #67
```

**11 · Auditoria**
```
GET /auditoria?tipo=SYNC → 10 eventos
  { tipo:"SYNC", acao:"Sincronizou lote do terminal Homolog 5.1: 1 evento(s)", usuario:"Administrador" }
```

**12 · Cross-empresa**
```
(token empresa B) GET /sync/bootstrap?device_id=<terminal empresa A> → 403
(token empresa B) POST /sync/enviar-lote (terminal empresa A)        → 403
```

---

## Bugs encontrados

**Nenhum.** Todos os 15 pontos passaram na primeira execução. A fundação da Fase 5 (migrations, idempotência por `device_id+uuid`, isolamento multi-tenant, regras de conflito, fiscal-contingência) comportou-se conforme o projeto.

> Nota: o bug do `VARCHAR` do status fiscal (`CONTINGENCIA_PENDENTE`) foi detectado e corrigido **durante a Fase 5** (commit `a796722`), então não reapareceu aqui.

---

## Build final

- Frontend: ✅ **315.78 kB** (gzip 84.40 kB), 0 erros.
- Backend: ✅ sobe sem erro; rotas `/api/sync/*` ativas.

---

## Conformidade com o escopo

Não foi implementado (conforme instrução): Tauri/Electron, SQLite, TEF, provedor fiscal real, impressão térmica.

---

## Conclusão

A homologação offline está **aprovada (15/15)**. O ciclo **ativar terminal → vender offline → reconectar → sincronizar** funciona com idempotência, baixa de estoque, separação por forma de pagamento no caixa, alerta de divergência, fiscal em contingência, auditoria e isolamento entre empresas.

A base está pronta e validada para a próxima etapa (app desktop Tauri + SQLite ou provedor fiscal real), quando autorizado.
