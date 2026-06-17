# Relatório Técnico — ERPNext

> Fonte analisada: `referencias/erpnext/src` (clone shallow de `frappe/erpnext`)

## Identidade

- **Repositório:** https://github.com/frappe/erpnext
- **Maturidade:** ERP completo de nível empresarial, open source, usado mundialmente.
- **Foco:** ERP multi-indústria. O POS é **um módulo** dentro de algo muito maior.

---

## Arquitetura

| Item | Detalhe |
|------|---------|
| **Linguagem** | Python (backend) + JS (frontend) |
| **Framework** | **Frappe Framework** (metadata-driven, low-code) |
| **Banco** | MariaDB / PostgreSQL |
| **Modelo de dados** | **DocType** — tudo é um "DocType" declarativo (gera tabela, form, API, permissões automaticamente) |
| **Frontend** | Frappe UI (Desk) + páginas customizadas (ex.: `point_of_sale`) |

### Estrutura de módulos — **referência de "ERP modular"**
Módulos de primeira classe: `accounts` (financeiro), `stock` (estoque), `buying` (compras), `selling` (vendas), `manufacturing` (produção/fichas técnicas), `assets`, `crm`, `projects`, `support`, `maintenance`, `quality_management`, `subcontracting`, `regional` (fiscal por país). Cada módulo é uma pasta com DocTypes.

### Permissões
Sistema de papéis riquíssimo: **Role, Role Profile, Permission Level por campo, User Permissions (escopo por registro)**. Provavelmente o RBAC mais granular dos analisados.

### Relatórios
Motor de **Query Report + Report Builder** + `report_center`. Relatórios financeiros completos: Balanço, **DRE (Profit and Loss)**, Fluxo de Caixa, Razão, Trial Balance, Aging de contas a pagar/receber.

---

## PDV (módulo `selling/page/point_of_sale`)
- **DocTypes de POS:** `pos_profile`, `pos_opening_entry`, `pos_closing_entry`, `pos_invoice`, `pos_invoice_item`, `pos_payment_method`, `pos_invoice_merge_log`.
- **Tela de venda:** página dedicada, busca por item group/search fields configuráveis (`pos_search_fields`).
- **Carrinho/Descontos:** descontos por item e total, múltiplas formas de pagamento.
- **Cancelamentos:** via cancelamento de `pos_invoice` (estorno contábil automático).
- **Caixa:** `pos_opening_entry` / `pos_closing_entry` (abertura/fechamento com conferência por forma de pagamento).

## Estoque (módulo `stock`)
- **Entradas/Saídas:** `stock_entry` (vários tipos: recebimento, transferência, fabricação, baixa).
- **Inventário:** `stock_reconciliation` (ajuste/contagem).
- **Transferências:** `stock_entry` tipo Material Transfer entre `warehouse` (multiestoque nativo).
- **Avançado:** lotes (batch), números de série, validade, múltiplas UoM.

## Financeiro (módulo `accounts`) — **o mais completo de todos**
- **Contas a pagar/receber:** Payment Entry, Payment Request, aging.
- **Fluxo de caixa, DRE, Balanço:** relatórios contábeis nativos.
- **Centros de custo:** `cost_center` + `accounting_dimension` (dimensões contábeis configuráveis).
- **Conciliação bancária:** `bank_reconciliation_tool`, `bank_transaction`, import de extrato.
- **Períodos contábeis, fechamento, multi-moeda.**

## Produção (módulo `manufacturing`) — relevante p/ Padaria/Restaurante
- **Ficha técnica = BOM** (`bom`, `bom_item`, `bom_operation`, `bom_explosion_item`).
- Ordem de produção (work order), consumo de insumos, sub-contratação.

## Experiência do usuário
- Extremamente poderoso, porém **complexo e pesado** — curva de aprendizado alta.
- O POS é rápido, mas o resto do ERP exige treinamento.
- Excesso de cliques em fluxos administrativos (típico de ERP).

---

## Lições para o nosso sistema
- ⭐ **Conceito DocType / metadata-driven** inspira nossa **arquitetura modular** (entidades declarativas + permissões automáticas).
- ⭐ **accounts** é o gabarito de Financeiro completo (DRE, centros de custo, conciliação) — meta de longo prazo.
- ⭐ **BOM (manufacturing)** é a referência direta para **fichas técnicas da Padaria** e ingredientes do Restaurante.
- ⭐ **pos_opening_entry/closing_entry** confirma o padrão de Caixa que devemos seguir.
- ⚠️ **Não copiar a complexidade** — extrair conceitos, manter nosso produto enxuto.
