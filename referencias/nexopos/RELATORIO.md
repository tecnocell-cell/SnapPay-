# Relatório Técnico — NexoPOS

> Fonte analisada: `referencias/nexopos/src` (clone shallow de `Blair2004/NexoPOS`)

## Identidade

- **Repositório:** https://github.com/Blair2004/NexoPOS
- **Maturidade:** Muito ativo, moderno, vendido também como produto. É **a referência mais próxima do que queremos** (SaaS-like, modular, multi-segmento leve).
- **Foco:** Varejo, mercado, com módulos extensíveis.

---

## Arquitetura

| Item | Detalhe |
|------|---------|
| **Linguagem** | PHP 8.2+ |
| **Framework** | **Laravel 12** (moderno) |
| **Banco** | MySQL / MariaDB (Eloquent ORM, doctrine/dbal) |
| **Frontend** | Vue.js (SPA dentro do Laravel) + Tailwind |
| **Realtime** | Laravel Reverb + Pusher (websockets — notificações/KDS) |
| **Auth/API** | Laravel Sanctum (tokens) |
| **Extras** | barcode generator, phpspreadsheet (export Excel), Telescope (debug) |

### Estrutura de módulos — **ESTE É O PONTO FORTE**
NexoPOS tem **sistema de módulos ativáveis de verdade**: `app/Services/ModulesService.php`, `Models/Migration` + `ModuleMigration`, pasta `modules/`. Módulos são instaláveis/ativáveis em runtime, com migrations próprias e hooks (`tormjens/eventy` = sistema de eventos/filtros estilo WordPress). **É exatamente a arquitetura modular que a missão pede.**

### Permissões
Modelo completo: `Role`, `Permission`, `RolePermission`, `PermissionAccess`, `UserRoleRelation`, `UserScope`. RBAC granular por permissão.

### Relatórios
`ReportService.php` + models de agregação pré-calculada: `DashboardDay`, `DashboardMonth`, `TransactionBalanceDay/Month`. Dashboards com KPIs, relatórios de vendas, fluxo de caixa, lucro.

---

## PDV
- **Tela de venda:** SPA Vue, rápida, com layout de frente de caixa.
- **Busca:** por código de barras (`BarcodeService`), nome, categoria.
- **Carrinho:** quantidade, desconto por item e total, unidades múltiplas (`ProductUnitQuantity`, `UnitGroup`).
- **Descontos & promoções:** `Coupon`, `CouponCategory`, `CouponProduct`, `RewardSystem`/`RewardSystemRule` (fidelidade).
- **Cancelamentos:** `OrderRefund`, `OrderProductRefund` (devolução parcial/total).
- **Caixa:** `Register`, `RegisterHistory`, `CashRegistersService` — abertura, fechamento, sangria, suprimento, contagem.
- **Balança:** `ScaleRange` (produtos por peso) — relevante p/ Mercado/Padaria.

## Estoque
- **Entradas:** `Procurement` + `ProcurementProduct` (**módulo de Compras de verdade**, com fornecedor `Provider`).
- **Saídas:** baixa na venda + ajustes; histórico `ProductHistory`/`ProductHistoryCombined`.
- **Inventário:** controle de quantidade por unidade, histórico completo.
- **Transferências/Multiestoque:** suportado via histórico de produto.

## Financeiro — **o mais completo dos open source leves**
- `Transaction`, `TransactionAccount`, `TransactionHistory`, `TransactionActionRule`.
- **Contas a pagar/receber:** via Transactions + `OrderInstalment` (parcelamento/crediário).
- **Fluxo de caixa:** `TransactionBalanceDay/Month` (saldos diários/mensais).
- **DRE / centros de custo:** parcial — contas contábeis (`TransactionAccount`) permitem aproximar.

## Experiência do usuário
- Layout **moderno e profissional** (Tailwind, Vue), tema escuro/claro.
- Frente de caixa pensada para velocidade, atalhos.
- Dashboard comercial rico já de fábrica.

---

## Lições para o nosso sistema — **referência nº 1**
- ⭐ **Arquitetura de módulos ativáveis + hooks/eventos** → adotar o conceito (mesmo em outra stack).
- ⭐ **Procurement (Compras)** como módulo do núcleo — falta no nosso.
- ⭐ **Register/RegisterHistory (Caixa)** — falta total no nosso; é prioridade.
- ⭐ **Coupon + RewardSystem** (promoções/fidelidade) para o Módulo Mercado.
- ⭐ **OrderInstalment** = base de crediário real (nosso cliente tem só `limite_credito`).
- ⭐ **ScaleRange** = produto por peso/balança.
