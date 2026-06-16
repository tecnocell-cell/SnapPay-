# ESTUDO TÉCNICO — Fome de Que (referência para o SnapPay)

> **Status do Fome de Que:** projeto **isolado**, em repositório próprio, clonado apenas para estudo em `referencias/fome-de-que/`. **Não é base do SnapPay, não é substituto, não deve ser misturado.** Este documento extrai padrões para reescrever no SnapPay com identidade própria.

---

## 1. Por que estudá-lo

O Fome de Que já implementa, numa stack moderna, **a arquitetura SaaS modular multiempresa** que o SnapPay quer alcançar. Em vez de descobrir os padrões do zero, usamos o FdQ como **referência validada**.

## 2. Stack observada (somente leitura)

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| ORM / Banco | Prisma + PostgreSQL |
| Cache / fila | Redis |
| Auth | JWT + Refresh Token + RBAC |
| Frontend | React + Vite + TypeScript + TailwindCSS + TanStack Query + Zustand |
| Agente local | Node + SQLite (better-sqlite3) — impressão/offline |
| Infra | Docker Compose (Postgres + Redis) |
| Fiscal | Provider plugável (Nuvem Fiscal / Focus NFe / PlugNotas / TecnoSpeed) |

> O SnapPay **não precisa adotar a mesma stack inteira**. Hoje é React+Vite (frontend) e Express+PostgreSQL (backend). A migração de Express→NestJS é uma **decisão de roadmap**, não uma obrigação imediata.

## 3. Padrões-chave a aprender

### 3.1 Módulos ativáveis (`ModuleGate`)
- `frontend/src/components/ModuleGate.tsx` lê o módulo da rota (`moduleForPath`) e bloqueia se o tenant não tiver o módulo habilitado (`useTenantModules`).
- No backend, `Plan`, `Addon`, `PlanModule`, `TenantModuleOverride`, `SaasModuleKey` controlam o que cada empresa enxerga.
- **Lição p/ SnapPay:** criar um registry de módulos + gate de rota + flag por empresa. Reescrever, não copiar.

### 3.2 Multiempresa (Tenant)
- `Tenant` + `UserTenant` + escopo em todas as entidades.
- **Lição p/ SnapPay:** adicionar `empresa_id` em todas as tabelas desde já (barato agora, caro depois).

### 3.3 RBAC
- `roles` no backend + `RoleGate.tsx` no front.
- **Lição p/ SnapPay:** papéis (admin, gerente, operador) + permissões por ação.

### 3.4 Caixa (`cash-register`)
- `CashRegister` + `CashMovement` (enum: abertura, sangria, suprimento, fechamento).
- **Lição p/ SnapPay:** modelar caixa como entidade própria com movimentos tipados.

### 3.5 Fiscal plugável
- `fiscal/providers/fiscal-provider.interface.ts` + `fiscal-provider.resolver.ts` → troca de provider sem reescrever o resto.
- **Lição p/ SnapPay:** definir uma interface `FiscalProvider` e implementar mock primeiro (igual FdQ no MVP).

### 3.6 Offline / PWA
- `OfflineBanner.tsx`, `ConnectionBadge.tsx`, agente local SQLite.
- **Lição p/ SnapPay:** PWA + IndexedDB para resiliência (P2 no roadmap).

### 3.7 Documentação por fluxo
- 34 arquivos `docs/FLUXO_*.md`, um por módulo.
- **Lição p/ SnapPay:** adotar o mesmo formato — cada módulo do SnapPay ganha um `docs/FLUXO_<modulo>.md`.

## 4. O que o SnapPay deve fazer DIFERENTE do FdQ

| Tema | Fome de Que | SnapPay deve |
|---|---|---|
| Foco | Food service (restaurante/padaria) | **Varejo primeiro** (mercado/loja/conveniência), food como módulo |
| Cardápio digital | Quase núcleo | **Opcional** (módulo Restaurante) |
| Mesas/comandas/cozinha | Centrais | **Só no módulo Restaurante**, adaptadas |
| Branding | "Fome de Que" | **SnapPay** (identidade própria) |
| Núcleo obrigatório | Inclui delivery/cardápio | Inclui **Compras/Financeiro/Fornecedores** (varejo) |

## 5. Conclusão

O Fome de Que é o **melhor mapa disponível** do destino do SnapPay. Usá-lo como referência reduz risco e retrabalho. Mas o SnapPay **mantém repositório, banco, identidade e roadmap próprios** — reescrevendo cada padrão, nunca importando o produto food-service inteiro.

- Arquitetura proposta para o SnapPay: [ARQUITETURA_MODULAR_SNAPPAY.md](ARQUITETURA_MODULAR_SNAPPAY.md)
- Tabela de reaproveitamento e listas de arquivos: [MATRIZ_REAPROVEITAMENTO.md](MATRIZ_REAPROVEITAMENTO.md)
- Roadmap e novo PDV: [ROADMAP_SNAPPAY.md](ROADMAP_SNAPPAY.md)
