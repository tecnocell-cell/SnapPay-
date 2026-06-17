# Relatório Técnico — POS Awesome

> Fonte analisada: `referencias/posawesome/src` (clone shallow de `ucraft-com/POS-Awesome`)

## Identidade

- **Repositório:** https://github.com/ucraft-com/POS-Awesome
- **Natureza:** É um **app/frontend de PDV para ERPNext** (não é sistema autônomo). Substitui a tela de POS nativa do ERPNext por uma SPA Vue mais rica.
- **Foco:** Frente de caixa moderna sobre o backend ERPNext.

---

## Arquitetura

| Item | Detalhe |
|------|---------|
| **Linguagem** | Python (camada API Frappe) + JavaScript |
| **Framework** | Frappe App (instala dentro do ERPNext) |
| **Frontend** | **Vue.js + Vuetify** (Material Design) |
| **Banco** | O do ERPNext (MariaDB/Postgres) |
| **API** | `posawesome/api/*.py`: `posapp.py`, `invoice.py`, `customer.py`, `payment_entry.py`, `m_pesa.py` |

### Estrutura de componentes (Vue)
Componentes claros e bem separados em `public/js/posapp/components/`:
- `pos/Pos.vue` (tela principal), `ItemsSelector.vue` (grade de produtos), `Invoice.vue` (carrinho/nota), `Customer.vue` / `UpdateCustomer.vue` (cliente).
- `payments/Pay.vue`, `pos/Payments.vue`, `Mpesa-Payments.vue` (pagamentos, inclusive M-Pesa).
- `pos/OpeningDialog.vue` / `ClosingDialog.vue` (**abertura/fechamento de caixa**).
- `pos/Drafts.vue` (vendas em rascunho/hold), `Returns.vue` (devoluções), `SalesOrders.vue`, `PosCoupons.vue`, `PosOffers.vue` (cupons/promoções), `Variants.vue` (variações de produto).

### Permissões / Relatórios
Herdadas do ERPNext (RBAC e relatórios contábeis nativos). POS Awesome foca **só na experiência de caixa**.

---

## PDV — **referência principal de UX de frente de caixa**
- **Tela de venda:** layout clássico de PDV — grade de produtos à esquerda, nota/carrinho à direita.
- **Busca:** por código, nome, código de barras, grupo de itens; seleção rápida por toque.
- **Carrinho:** quantidade, desconto por item/total, variações, múltiplas UoM.
- **Descontos/Promoções:** `PosCoupons.vue`, `PosOffers.vue`.
- **Cancelamentos/Devoluções:** `Returns.vue`.
- **Caixa:** diálogos de abertura/fechamento (`OpeningDialog`/`ClosingDialog`).
- **Atalhos de teclado:** documentados (ex.: CTRL+S abrir pagamento, CTRL+X submeter) — **valida o requisito de teclas de atalho da nossa missão**.
- **Offline:** cache local parcial para resiliência.

## Estoque / Financeiro
- Delegados ao ERPNext (este projeto não reimplementa; consome a API).

## Experiência do usuário — **o ponto a copiar**
- **Material Design (Vuetify)**, limpo, rápido, pensado para toque.
- Produtos visíveis imediatamente (grade), sem tela vazia exigindo busca — **exatamente a melhoria de layout que a missão pede.**
- Diálogos modais para pagamento/caixa, fluxo com poucos cliques.

---

## Lições para o nosso sistema
- ⭐ **Organização de componentes Vue → mapeável 1:1 para nossos componentes React** (ItemsSelector, Invoice, Customer, Payments, Opening/Closing).
- ⭐ **Grade de produtos sempre visível + categorias** → resolve "tela vazia" do nosso PDV.
- ⭐ **Diálogos de abertura/fechamento de caixa** → modelo de UX para nosso módulo de Caixa.
- ⭐ **Atalhos de teclado** já são padrão de mercado → implementar F2–F8 como a missão pede.
- ⭐ **Drafts (venda em espera)** e **Returns (devolução)** — UX de referência.
