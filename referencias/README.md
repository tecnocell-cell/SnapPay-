# 📚 Estudo de Referências — Evolução do PDV (SnapPay)

Estudo técnico dos principais sistemas de PDV/ERP open source para guiar a evolução do SnapPay em uma **plataforma moderna, modular, SaaS e multi-segmento**.

> Status: ✅ Concluído · Data: 16/06/2026 · 6 projetos analisados a partir do código-fonte clonado.

---

## 🗂️ Estrutura

```
referencias/
├── easysac_estudo/RELATORIO.md      Sistema legado de referência (escopo BR + fiscal)
├── ospos/         RELATORIO.md + src/   Open Source POS (PHP/CodeIgniter)
├── nexopos/       RELATORIO.md + src/   NexoPOS (Laravel) ⭐ ref. modular
├── erpnext/       RELATORIO.md + src/   ERPNext (Frappe) ⭐ ref. financeiro/BOM
├── posawesome/    RELATORIO.md + src/   POS Awesome (Vue) ⭐ ref. UX de caixa
├── tailpos/       RELATORIO.md + src/   TailPOS (React Native) ⭐ ref. offline
├── floreantpos/   RELATORIO.md + src/   FloreantPOS (Java) ⭐ ref. restaurante
├── fome-de-que/     RELATORIO.md + src/   🏆 Fome de Que — PLATAFORMA-ALVO JÁ PRONTA
└── relatorios/
    ├── 01_visao_geral_referencias.md   Fase 1 — comparativo cruzado
    ├── 02_matriz_comparativa.md        Fase 2 — matriz EasySAC×Refs×Atual×Prioridade
    ├── 03_arquitetura_modular.md       Fase 3 — núcleo + módulos ativáveis + stack
    ├── 04_layout_e_wireframes.md       Fase 4 — novo PDV + wireframes + atalhos
    ├── 05_diferenciais_modernos.md     Fase 5 — PWA, offline, multi-tenant, API
    ├── 06_roadmap_priorizado.md        Entrega — backlog + roadmap por fases
    └── 07_competir_e_superar.md        Entrega — competir vs superar EasySAC
```

---

## 🎯 Conclusões em 7 pontos

1. **Nenhuma referência cobre tudo.** A oportunidade do SnapPay é **combinar** o melhor de cada uma.
2. **NexoPOS** é o norte de **arquitetura modular SaaS** (módulos ativáveis, RBAC, hooks, caixa, compras, fidelidade).
3. **ERPNext** é o norte de **profundidade** (financeiro/DRE, centros de custo, BOM/fichas técnicas).
4. **POS Awesome** é o norte de **UX de frente de caixa** (grade visível, atalhos, modais de caixa).
5. **TailPOS** é o norte de **offline-first/PWA** (banco local + sync).
6. **FloreantPOS** é o norte de **restaurante** (mesas, comandas, KDS, drawer).
7. O **EasySAC** define o **escopo a igualar** (gestão + fiscal BR) — e o que **superar** (web, modular, multi-segmento, IA).

## 🏆 Descoberta importante — Fome de Que
O repositório **[Fome de Que](fome-de-que/RELATORIO.md)** (também clonado) **já implementa a plataforma-alvo** descrita nas Fases 3/5/6: NestJS + Prisma + PostgreSQL + Redis + JWT/RBAC, multi-tenant, **módulos ativáveis (ModuleGate)**, caixa, mesas/comandas/KDS, fiscal plugável, WhatsApp+IA e billing SaaS. São 23 módulos e ~60 modelos Prisma prontos. **Isso muda o próximo passo.**

## 🚦 Próximo passo recomendado (revisado)
A decisão deixou de ser "construir do zero" e passou a ser **estratégica**:
- **Opção A (recomendada):** adotar o **Fome de Que** como base do produto e usar SnapPay/EasySAC como fonte de requisitos de varejo (mercado/padaria de balcão). Pula meses de desenvolvimento.
- **Opção B:** continuar evoluindo o SnapPay pela [Fase A do roadmap](relatorios/06_roadmap_priorizado.md) (Login+RBAC+Multiempresa+Auditoria) — mas isso é reconstruir o que o Fome de Que já tem.

Ver análise completa em [fome-de-que/RELATORIO.md](fome-de-que/RELATORIO.md).

---

## Stack recomendada (evolução do que já existe)
**Frontend:** React + Vite → PWA · **Backend:** Node/Express → NestJS modular · **Banco:** PostgreSQL (multi-tenant via `empresa_id`) · **Auth:** JWT + RBAC · **Realtime:** Socket.io (KDS/notif).
