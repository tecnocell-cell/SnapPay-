# MATRIZ DE REAPROVEITAMENTO — SnapPay × Fome de Que

> **Regra de ouro:** o Fome de Que permanece **isolado** em `referencias/fome-de-que/` (repositório próprio, `.git` próprio — **não tocar**). Aqui ele é apenas **referência técnica**. Nada é importado em massa; padrões são **reescritos e adaptados** para a identidade do SnapPay.

---

## 1. Tabela comparativa (Primeira Missão)

Prioridades: **P0** obrigatório antes de vender · **P1** importante p/ MVP comercial · **P2** melhoria · **P3** futuro
Ação: **Criar** (não existe) · **Evoluir** (existe parcial) · **Manter** (ok) · **Adaptar de FdQ** (usar padrão como referência)

### Núcleo

| Funcionalidade | Existe no SnapPay | Existe no Fome de Que | Ação Recomendada | Prioridade |
|---|---|---|---|---|
| Autenticação (login/JWT) | ❌ | ✅ JWT+refresh | Criar — referência: padrão `auth` do FdQ | **P0** |
| Empresas (multiempresa/tenant) | ❌ | ✅ Tenant/UserTenant | Criar — adaptar conceito de Tenant | **P0** |
| Usuários | 🟡 (admin fixo) | ✅ | Criar gestão real de usuários | **P0** |
| Permissões (RBAC) | ❌ | ✅ roles | Criar — referência: `roles` + `RoleGate` | **P0** |
| Lojas / unidades | ❌ | ✅ | Criar | **P1** |
| Produtos | ✅ CRUD | ✅ | Manter / Evoluir (variações) | — |
| Categorias | ❌ | ✅ Category | Criar | **P0** |
| Estoque | 🟡 mov. simples | ✅ StockMovement | Evoluir | **P1** |
| Clientes | 🟡 CRUD básico | ✅ | Evoluir | **P1** |
| Fornecedores | ❌ | ✅ (compras) | Criar | **P1** |
| PDV | ✅ | ✅ | Evoluir (novo layout) | **P0** |
| Caixa | ❌ | ✅ cash-register | Criar — referência: `cash-register` | **P0** |
| Vendas | ✅ | ✅ Sale/SaleItem | Manter / Evoluir | — |
| Compras | ❌ | 🟡 (via stock) | Criar | **P1** |
| Financeiro (CP/CR) | ❌ | ✅ finance | Criar | **P1** |
| Relatórios | 🟡 básicos | ✅ reports | Evoluir | **P1** |
| Configurações | ❌ (link morto) | ✅ tenant-settings | Criar | **P1** |
| Auditoria/Logs | ❌ | ✅ AuditLog | Criar | **P1** |

### PDV (frente de caixa)

| Funcionalidade | SnapPay | Fome de Que | Ação | Prioridade |
|---|---|---|---|---|
| Busca de produto | ✅ | ✅ | Manter | — |
| Grade de produtos sempre visível | ❌ | ✅ | Evoluir (layout) | **P0** |
| Categorias rápidas | ❌ | ✅ | Criar | **P0** |
| Carrinho | ✅ | ✅ | Manter | — |
| Cliente no carrinho | ✅ | ✅ | Manter | — |
| Desconto (item/total) | ❌ | ✅ | Criar | **P0** |
| Múltiplas formas de pagamento | 🟡 1 forma | ✅ | Evoluir | **P1** |
| Atalhos de teclado (F2–F10) | ❌ | ✅ parcial | Criar | **P0** |
| Status do caixa no PDV | ❌ | ✅ | Criar | **P0** |
| Dashboard no PDV (vendas dia/ticket) | ❌ | ✅ | Criar | **P1** |
| Sangria / suprimento | ❌ | ✅ CashMovement | Criar | **P1** |
| Cancelamento/devolução | 🟡 cancela venda | ✅ | Evoluir | **P1** |
| Venda suspensa (hold) | ❌ | ✅ | Criar | **P2** |
| Validação de estoque na venda | ❌ | ✅ | Criar | **P0** |

### Módulos ativáveis (por segmento)

| Funcionalidade | SnapPay | Fome de Que | Ação | Prioridade |
|---|---|---|---|---|
| Engine de módulos ativáveis | ❌ | ✅ ModuleGate + Plan/Addon | Criar — referência direta | **P0** |
| Mercado (barras/balança/promoções) | ❌ | 🟡 parcial | Criar | **P1** |
| Padaria (produção/ficha técnica) | ❌ | 🟡 (food) | Criar (adaptar) | **P2** |
| Restaurante (mesas/comandas/KDS) | ❌ | ✅ dining/kitchen | Adaptar de FdQ | **P2** |
| Loja (variações/grade/trocas) | ❌ | 🟡 | Criar | **P2** |
| Distribuidora (romaneio/comissão) | ❌ | ❌ | Criar | **P3** |
| Serviços (OS/agenda) | ❌ | ❌ | Criar | **P3** |

### Plataforma / Fiscal

| Funcionalidade | SnapPay | Fome de Que | Ação | Prioridade |
|---|---|---|---|---|
| Fiscal NFC-e (provider plugável) | ❌ | ✅ fiscal/providers | Criar — referência: contrato de provider | **P1** |
| PWA / OfflineBanner | ❌ | ✅ | Criar | **P2** |
| Billing SaaS (planos/assinaturas) | ❌ | ✅ billing | Criar | **P2** |
| WhatsApp + IA | ❌ | ✅ whatsapp | Criar | **P3** |
| Integrações delivery (iFood) | ❌ | ✅ integrations | Criar | **P3** |
| API pública (Swagger) | 🟡 REST interna | ✅ | Evoluir | **P2** |

---

## 2. Plano de reaproveitamento seguro

**Princípio:** copiar **padrões e conceitos**, nunca arquivos com branding/nomes/regras de food-service do FdQ.

| Etapa | O que fazer | Como (seguro) |
|---|---|---|
| 1 | Estudar padrão no FdQ | Ler o arquivo em `referencias/fome-de-que/src/...` (somente leitura) |
| 2 | Extrair o conceito | Anotar a ideia (ex.: "ModuleGate bloqueia rota por módulo do tenant") |
| 3 | Reescrever no SnapPay | Implementar com nomes/identidade SnapPay, sem importar o arquivo |
| 4 | Remover acoplamento food | Tirar referências a mesa/cardápio/cozinha quando não for o módulo Restaurante |
| 5 | Validar isolamento | Garantir que nada do `.git` do FdQ foi alterado |

**Nunca:** mover o repo do FdQ para dentro do SnapPay · alterar o `.git` do FdQ · copiar `package.json`/deps inteiros · herdar branding.

---

## 3. Arquivos que PODEM ser adaptados (referência → reescrever)

> Caminhos relativos a `referencias/fome-de-que/src/`. **Ler para aprender o padrão; reimplementar no SnapPay.**

| Padrão a aprender | Arquivo de referência (somente leitura) |
|---|---|
| Modelo de dados completo | `backend/prisma/schema.prisma` (mapa de ~60 entidades) |
| Módulos ativáveis (front) | `frontend/src/components/ModuleGate.tsx`, `RoleGate.tsx`, `ModuloNaoHabilitado.tsx` |
| Mapa rota→módulo | `frontend/src/lib/modules.ts` |
| RBAC backend | `backend/src/modules/roles/`, `backend/src/modules/auth/` |
| Multiempresa | `backend/src/modules/tenants/`, `tenant-settings/` |
| Caixa | `backend/src/modules/cash-register/` |
| Fiscal plugável | `backend/src/modules/fiscal/providers/fiscal-provider.interface.ts`, `fiscal-provider.resolver.ts` |
| Planos/módulos | `backend/src/modules/billing/`, `admin-saas/` |
| Offline/PWA | `frontend/src/components/OfflineBanner.tsx`, `ConnectionBadge.tsx` |
| Estrutura de docs de fluxo | `docs/FLUXO_*.md` (formato de especificação) |
| Restaurante (quando for o módulo) | `backend/src/modules/dining/`, `kitchen/` |

## 4. Arquivos que NÃO devem ser tocados / copiados cegamente

| Item | Motivo |
|---|---|
| **`referencias/fome-de-que/src/.git/`** | Repositório isolado — **proibido alterar** |
| `frontend/src/modules/cardapio/`, `comandas/`, `mesas/`, `cozinha/`, `salao/` | Regras food-service; só no módulo Restaurante e ainda assim **adaptadas** |
| Qualquer branding/identidade visual | `docs/IDENTIDADE_VISUAL.md`, logos, nomes "Fome de Que" |
| `package.json` / `pnpm-workspace.yaml` do FdQ | Deps específicas; SnapPay tem stack própria |
| Rotas/strings com nome "Fome de Que" | Identidade diferente |
| `whatsapp/` e `integrations/` (iFood) como núcleo | São P3; não são núcleo obrigatório do SnapPay |
| `cardapio-digital` como obrigatório | No SnapPay é opcional (módulo), nunca núcleo |

---

## 5. Resumo executivo da matriz

- **18 itens P0** concentram-se em: **Auth/RBAC/Multiempresa**, **Caixa**, **Categorias**, **novo PDV (layout+atalhos+desconto+validação de estoque)** e **engine de módulos ativáveis**.
- O Fome de Que **encurta o caminho como referência** (padrões prontos e testados), mas o SnapPay **continua projeto próprio**, reescrevendo cada padrão com sua identidade.
- Próximo passo natural: implementar os **P0** na ordem do [ROADMAP_SNAPPAY.md](ROADMAP_SNAPPAY.md).
