# Fase 5 — Diferenciais Modernos (estudo)

Estudo de viabilidade dos diferenciais que colocam o SnapPay **à frente** do EasySAC e dos open source analisados.

## 1. PWA (Progressive Web App)
- **O quê:** o app web instala como aplicativo (desktop/mobile), tela cheia, ícone.
- **Como:** `manifest.json` + Service Worker (Vite plugin `vite-plugin-pwa`).
- **Esforço:** 🟢 Baixo. **Ganho:** alto (cara de produto, instalável no caixa).

## 2. Offline First
- **Referência:** TailPOS.
- **O quê:** vender mesmo sem internet; sincronizar ao reconectar.
- **Como:** carrinho e catálogo em IndexedDB; fila de vendas pendentes; sync quando online.
- **Esforço:** 🟠 Médio/Alto. **Ganho:** crítico p/ mercado/feira/instabilidade.

## 3. IndexedDB
- **O quê:** banco local no navegador para catálogo + vendas offline.
- **Como:** lib `Dexie.js` sobre IndexedDB; espelha tabelas essenciais (produtos, clientes, fila de vendas).
- **Esforço:** 🟠 Médio.

## 4. Sincronização automática
- **O quê:** reconciliar vendas offline com o servidor sem duplicar.
- **Como:** cada venda recebe `uuid` no cliente; backend faz upsert idempotente; resolução de conflito por timestamp.
- **Esforço:** 🟠 Médio/Alto.

## 5. Multiempresa / Multiunidade / Multiestoque
- **Referência:** NexoPOS, ERPNext.
- **Como:** `empresa_id` (tenant) + `unidade_id` (loja) + `estoque_id` (depósito) em todas as tabelas; escopo por usuário; opcional Postgres RLS.
- **Esforço:** 🔴 Alto (decisão de fundação — quanto antes, melhor).

## 6. Multiusuário
- **O quê:** vários operadores simultâneos, cada um com seu caixa/sessão.
- **Como:** sessões JWT + caixa por usuário (espelho do `CashDrawer` por usuário do Floreant).
- **Esforço:** 🟠 Médio.

## 7. Auditoria completa + Logs
- **Referência:** ERPNext.
- **O quê:** registrar quem fez o quê e quando (vendas, cancelamentos, alteração de preço, sangria).
- **Como:** tabela `audit_log` + interceptor no backend; logs estruturados (pino/winston).
- **Esforço:** 🟢 Baixo/Médio. **Ganho:** compliance e confiança.

## 8. API Pública
- **Referência:** NexoPOS, ERPNext.
- **O quê:** expor REST documentada (OpenAPI/Swagger) para integrações (e-commerce, BI, iFood).
- **Como:** versionar `/api/v1`, auth por API key/token, rate limit, docs Swagger.
- **Esforço:** 🟠 Médio.

---

## Priorização dos diferenciais

| Diferencial | Esforço | Impacto | Quando |
|---|---|---|---|
| PWA | 🟢 | Alto | Cedo (quick win) |
| Auditoria/Logs | 🟢 | Alto | Cedo |
| Multiempresa/tenant | 🔴 | Alto | **Fundação — fazer antes de crescer** |
| Multiusuário + Caixa | 🟠 | Alto | Junto do módulo Caixa |
| API pública | 🟠 | Médio | Médio prazo |
| IndexedDB | 🟠 | Alto | Médio prazo |
| Offline First + Sync | 🔴 | Alto | Depois da fundação tenant |

> **Regra de ouro:** decisões de fundação (multi-tenant, `uuid` em vendas, audit_log) são baratas agora e caríssimas depois. Implementar cedo, mesmo que os módulos venham depois.
