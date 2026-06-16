# Relatório Técnico — Fome de Que (fomedequeweb)

> Fonte: `referencias/fomedeque/src` (clone de `tecnocell-cell/fomedequeweb`)
> **Conclusão antecipada:** este projeto **não é uma "referência" como os outros — é praticamente a plataforma-alvo do SnapPay já implementada.** A stack e a arquitetura batem quase 1:1 com o que os relatórios 03/05/06 recomendaram construir.

---

## Identidade

- **Nome:** Fome de Que — SaaS multiempresa para panificadoras, lanchonetes, bares, restaurantes, cafeterias e pizzarias.
- **Natureza:** Monorepo profissional (pnpm workspaces + Docker), com backend, frontend e agente local.
- **Maturidade:** **Muito alta.** 137 arquivos TS no backend, 90 no frontend, schema Prisma de **1505 linhas**, **34 documentos de fluxo** em `docs/`.

---

## Arquitetura — espelha a stack recomendada

| Camada | Fome de Que | O que o relatório 03 recomendou | Match |
|---|---|---|---|
| Backend | **NestJS + TypeScript** | "evoluir p/ NestJS modular" | ✅ idêntico |
| ORM/Banco | **Prisma + PostgreSQL** | PostgreSQL | ✅ |
| Cache/Realtime | **Redis** (+ websockets p/ KDS) | Socket.io p/ KDS | ✅ equivalente |
| Auth | **JWT + Refresh + RBAC** | JWT + RBAC | ✅ idêntico |
| Frontend | **React + Vite + TS + Tailwind + TanStack Query + Zustand** | React+Vite (PWA) + Zustand | ✅ idêntico |
| Multi-tenant | **Tenant + UserTenant** em tudo | `empresa_id` em todas as tabelas | ✅ idêntico |
| Fiscal | **Provider plugável** (Nuvem Fiscal/Focus/PlugNotas/TecnoSpeed) | "contrato pronto p/ provider" | ✅ idêntico |
| Offline | `OfflineBanner`, agente local SQLite | Offline-first/PWA | ✅ parcial+ |

### Módulos ativáveis — JÁ IMPLEMENTADO
- `components/ModuleGate.tsx` bloqueia rotas por módulo habilitado no tenant (`useTenantModules` + `moduleForPath`).
- `RoleGate.tsx` faz o mesmo por papel (RBAC).
- Schema tem `Plan`, `Addon`, `PlanModule`, `TenantModuleOverride`, `SaasModuleKey` → **planos e módulos ativáveis por empresa com billing.**
- **Isto é exatamente a "arquitetura modular ativável" da Fase 3 — pronta.**

---

## Cobertura de módulos (backend `src/modules/`)

23 módulos, cobrindo **todo o núcleo + segmento restaurante + transversais**:

| Categoria | Módulos presentes |
|---|---|
| **Núcleo** | `auth`, `users`, `roles` (RBAC), `tenants` (multiempresa), `tenant-settings`, `dashboard`, `products`, `stock`, `finance`, `reports` |
| **SaaS/Billing** | `admin-saas`, `billing` (planos, assinaturas, invoices, pagamentos, webhooks) |
| **PDV/Vendas** | `pdv`, `sales`, `cash-register` (caixa), `orders` |
| **Restaurante** | `dining` (áreas/mesas/sessões), `kitchen` (KDS + KitchenTicket), `cardapio-digital`, `printing` |
| **Transversais** | `fiscal` (provider plugável), `whatsapp` (IA + conversas + draft de pedido), `integrations` (delivery/iFood — ExternalOrder) |

### Modelos de dados ricos (Prisma, destaques)
- **Mesas/Comandas:** `DiningArea`, `DiningTable`, `TableSession`, `Tab`, `TabItem`, `TabPayment`, `TableTransferLog`.
- **Cardápio:** `MenuCategory`, `MenuItem`, `MenuModifierGroup/Option` (modificadores!), `MenuPromotion`.
- **Caixa:** `CashRegister`, `CashMovement` (sangria/suprimento).
- **Cozinha:** `Order`, `OrderItem`, `KitchenTicket`, enum `KitchenSector`.
- **Fiscal:** `TenantFiscalConfig`, `FiscalDocument` (NFC-e/NFe), `FiscalProviderKind`, ambientes.
- **WhatsApp/IA:** `WhatsAppConversation/Message/Contact`, `WhatsAppOrderDraft` (IA monta pedido).
- **Delivery:** `IntegrationConfig`, `ExternalOrder/Item/Event`.
- **Auditoria:** `AuditLog`.

---

## Comparação direta com o SnapPay (sistema atual)

| Aspecto | SnapPay (atual) | Fome de Que |
|---|---|---|
| Backend | Express + JS, 1 arquivo | NestJS + TS, 23 módulos |
| Banco | PostgreSQL, 6 tabelas | PostgreSQL, ~60 modelos Prisma |
| Auth/RBAC | ❌ Admin fixo | ✅ JWT+refresh+RBAC |
| Multiempresa | ❌ | ✅ tenant em tudo |
| Caixa | ❌ | ✅ |
| Restaurante | ❌ | ✅ completo |
| Fiscal | ❌ | ✅ provider plugável |
| WhatsApp/IA | ❌ | ✅ |
| Billing SaaS | ❌ | ✅ |
| Maturidade | Protótipo/MVP | Produto avançado |

---

## O que dá para aproveitar — recomendação estratégica

> **Mudança de jogo:** o SnapPay foi concebido para *virar* o que o Fome de Que **já é**. Não faz sentido reconstruir do zero o que aqui já existe. A decisão correta é estratégica, não técnica.

### Opção A (recomendada) — Adotar o Fome de Que como base e portar o que o SnapPay tem de específico
- O Fome de Que já entrega Fases A–E do roadmap (fundação, PDV, gestão, fiscal, multi-segmento).
- Trazer do SnapPay/EasySAC apenas o que faltar: ajustes de **varejo/mercado puro** (o foco do Fome de Que é food service) e os 50 produtos/realidade EasySAC.
- **Esforço:** baixo p/ enorme ganho. Pula meses de desenvolvimento.

### Opção B — Manter SnapPay e portar peças do Fome de Que
- Copiar para o SnapPay: `cash-register`, `roles/auth`, `dining/kitchen`, `fiscal` (provider).
- **Problema:** exige migrar Express→NestJS e o modelo de 6 tabelas→Prisma. Na prática é reescrever o SnapPay no formato do Fome de Que → **reinventar o que já está pronto.**

### Itens diretamente reaproveitáveis (qualquer cenário)
| Peça | Caminho | Uso |
|---|---|---|
| **Schema Prisma completo** | `backend/prisma/schema.prisma` | Modelo de dados de referência (60 modelos) |
| **ModuleGate/RoleGate** | `frontend/src/components/` | Padrão de módulos ativáveis + RBAC no front |
| **Contrato fiscal plugável** | `backend/src/modules/fiscal/providers/` | Integração NFC-e sem acoplar a um provider |
| **Módulo cash-register** | `backend/src/modules/cash-register` | Caixa (sangria/suprimento/fechamento) |
| **Módulo dining + kitchen** | idem | Mesas/comandas/KDS |
| **34 docs de fluxo** | `docs/FLUXO_*.md` | Especificação funcional pronta de cada módulo |
| **billing/admin-saas** | `backend/src/modules/` | Planos e cobrança SaaS |

---

## Veredito

O **Fome de Que é a evolução natural do SnapPay já materializada** — mesma stack-alvo, multi-tenant, modular, com caixa, restaurante, fiscal plugável, WhatsApp+IA e billing. 

**Recomendação:** avaliar **adotá-lo como base do produto** (Opção A) em vez de continuar evoluindo o protótipo SnapPay isoladamente. O SnapPay/EasySAC passam a ser **fonte de requisitos de varejo** (mercado/padaria de balcão) para complementar o foco food-service do Fome de Que.
