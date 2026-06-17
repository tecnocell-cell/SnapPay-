# 📌 STATUS DO SNAPPAY — Feito × Falta

> Atualizado em **17/06/2026** · Branch ativa: `fase0-fundacao`
> Roadmap completo e fases: [ROADMAP_SNAPPAY.md](ROADMAP_SNAPPAY.md) · Estudo de referência: [ESTUDO_FOME_DE_QUE.md](ESTUDO_FOME_DE_QUE.md)

Legenda: ✅ feito · 🟡 parcial · ⬜ não iniciado

---

## ✅ O que já foi feito

### Plataforma / base
- ✅ Backend Node + Express + PostgreSQL (migrado de SQL Server)
- ✅ Frontend React + Vite, organizado em páginas e `lib/` (api, auth, modules)
- ✅ Banco `easysac_pdv` com schema Fase 0 aplicado e seed (admin + empresa demo)

### Fase 0 — Fundação
- ✅ **Autenticação** JWT + bcrypt (login, `/auth/me`, guard global em `/api`)
- ✅ **RBAC**: papéis (ADMIN/GERENTE/OPERADOR) + 13 permissões + `requirePermissao`
- ✅ **Multiempresa**: `empresa_id` em produtos/clientes/vendas; empresas + unidades
- ✅ **Engine de módulos ativáveis**: tabelas `modulos`/`empresa_modulos`, `ModuleGate`/`RoleGate`, página **Módulos** (núcleo travado, segmentos ligáveis)
- ✅ **Categorias** de produto (CRUD com cor/ícone, escopo por empresa)
- ✅ **Base de caixa**: abrir, fechar, sangria, suprimento; saldo calculado; venda vinculada ao caixa

### Fase 1 — PDV
- ✅ Novo layout do PDV (topbar com operador/empresa/relógio, sidebar dinâmica por módulo/permissão)
- ✅ **Modos Mercado e Loja** (busca/código de barras + lista compacta vs. cards + categorias)
- ✅ Carrinho limpo: cliente opcional, total destacado, finalizar sempre visível, desconto/pagamento recolhidos
- ✅ **Atalhos F2–F10 + ESC**
- ✅ **Validação de estoque** na venda (bloqueia negativo)
- ✅ Indicadores (vendas/ticket/caixa) movidos para Relatórios — PDV sem poluição

### Páginas funcionais
- ✅ PDV · Produtos (com categoria) · Categorias · Estoque · Caixa · Vendas (histórico + cancelar) · Clientes · Relatórios · Módulos

---

## 🟡 Parcial / a melhorar
- 🟡 **Lojas/unidades** — existem no schema, falta UI de gestão e seleção de unidade
- 🟡 **Relatórios** — KPIs básicos; faltam filtros por período e gráficos melhores
- 🟡 **Pagamento** — só 1 forma por venda; falta múltiplas formas + split
- 🟡 **Cancelamento** — cancela venda inteira; falta devolução/troca parcial

---

## ⬜ O que ainda falta

### Fase 2 — Gestão (P1)
- ⬜ Fornecedores + Compras (entrada de mercadoria com custo)
- ⬜ Financeiro (contas a pagar/receber, crediário/parcelas)
- ⬜ Estoque avançado (multiestoque, inventário/contagem)
- ⬜ Configurações (impostos, dados da empresa, preferências)
- ⬜ **Auditoria/logs** (quem fez o quê) — trazido da Fase 0
- ⬜ Gestão de usuários pela UI

### Fase 3 — Fiscal (P1)
- ⬜ Interface `FiscalProvider` (mock) → NFC-e → NFe/SAT

### Fase 4 — Módulos de segmento (P2)
- ⬜ Mercado (balança, promoções, etiquetas, inventário)
- ⬜ Loja (variações/grade/trocas)
- ⬜ Padaria (produção, perdas, ficha técnica, encomendas)
- ⬜ Restaurante (mesas, comandas, KDS)

### Fase 5 — Plataforma moderna (P2/P3)
- ⬜ PWA + Offline-first (IndexedDB) + sync
- ⬜ Billing SaaS (planos/addons) · API pública (Swagger)
- ⬜ Distribuidora · Serviços · WhatsApp + IA

> **Fora de escopo agora (por ordem):** fiscal, restaurante, delivery, WhatsApp, IA.

---

## 🗺️ Roteiro dos próximos passos (ordem sugerida)

1. **Fechar a Fase 1** (curto)
   - Devolução/troca no PDV
   - Múltiplas formas de pagamento + split
   - UI de gestão de Caixa do dia (já há base) e seleção de unidade

2. **Fase 2 — Gestão** (núcleo comercial)
   - Fornecedores → Compras (entrada que alimenta estoque/custo)
   - Financeiro: contas a pagar/receber + crediário
   - Configurações (impostos hoje hardcoded → por empresa)
   - Auditoria/logs

3. **Fase 3 — Fiscal**
   - `FiscalProvider` mock → integração NFC-e

4. **Fase 4 — Segmentos** (ativáveis por módulo)
   - Mercado e Loja primeiro; Padaria e Restaurante depois

5. **Fase 5 — Plataforma**
   - PWA/offline, billing, API pública

---

## ▶️ Como rodar
```bash
# backend
cd backend && npm install && npm run dev      # http://localhost:3001
# (1ª vez) aplicar schema + seed:
#   psql -U postgres -d easysac_pdv -f schema.postgres.sql
#   psql -U postgres -d easysac_pdv -f schema.fase0.postgres.sql
#   node seed-fase0.js

# frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
```
**Login demo:** `admin@snappay.local` / `admin123`
