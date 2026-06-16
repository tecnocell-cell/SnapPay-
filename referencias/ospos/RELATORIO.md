# Relatório Técnico — Open Source POS (OSPOS)

> Fonte analisada: `referencias/ospos/src` (clone shallow do repositório `opensourcepos/opensourcepos`)

## Identidade

- **Repositório:** https://github.com/opensourcepos/opensourcepos
- **Maturidade:** Projeto veterano (mais de 10 anos), comunidade ativa, muito usado por pequeno varejo.
- **Foco:** Loja/varejo geral (não é restaurante, não é ERP completo).

---

## Arquitetura

| Item | Detalhe |
|------|---------|
| **Linguagem** | PHP 8.2+ |
| **Framework** | CodeIgniter 4.7 (MVC clássico) |
| **Banco** | MySQL / MariaDB |
| **Frontend** | Server-side rendering (views PHP) + Bootstrap + jQuery; build via Gulp |
| **PDF/Código de barras** | `dompdf`, `picqer/php-barcode-generator` |
| **Deploy** | Docker compose pronto (nginx, phpmyadmin) |

### Estrutura de módulos
Organização por **Controllers** (cada um é um módulo de tela): `Sales`, `Items`, `Item_kits`, `Customers`, `Suppliers`, `Receivings` (entrada de mercadoria), `Reports`, `Cashups` (fechamento de caixa), `Expenses`, `Giftcards`, `Taxes`, `Employees`. Models espelham as entidades (`Sale`, `Item`, `Inventory`, `Stock_location`, `Customer_rewards`...).

### Permissões
Sistema de **grants por módulo/ação**, com `Secure_Controller` como base — cada controller exige permissão. Há níveis por funcionário (`Employee`) e controle de acesso por menu (`No_access`).

### Relatórios
Pasta dedicada `Models/Reports/` com relatórios prontos: vendas detalhadas/resumidas, por categoria, por cliente, por funcionário, inventário, impostos, lucro. Exportação CSV/PDF.

---

## PDV
- **Tela de venda** (`Sales`): busca por nome/código/barras, suspende e recupera vendas (sales suspend/hold).
- **Busca de produtos:** por item, categoria, item_kit (combo).
- **Carrinho:** quantidade, preço editável, desconto por item e desconto total (percentual ou valor).
- **Cancelamentos:** cancelar venda e **devolução (sale return)** com reentrada em estoque.
- **Caixa:** `Cashups` — abertura/fechamento de caixa com contagem de dinheiro, sangria implícita via despesas.
- **Multi-localização:** `Stock_location` permite estoque por loja/depósito.

## Estoque
- **Entradas:** `Receivings` (recebimento de fornecedor), atualiza custo e quantidade.
- **Saídas:** baixa automática na venda + ajustes manuais (`Inventory`).
- **Inventário:** contagem com histórico de movimentações por item (`Item_quantity`, `Inventory`).
- **Transferências:** entre `Stock_location`.

## Financeiro
- **Contas a pagar:** parcial — via `Expenses` (despesas com categoria).
- **Contas a receber:** limitado — vendas a prazo via giftcard/reward, sem módulo de carnê robusto.
- **Fluxo de caixa:** via Cashups + Expenses.
- **DRE / Centros de custo:** ❌ não possui.

## Experiência do usuário
- Layout funcional, **denso e datado** (Bootstrap 3/4, jQuery), mas operacional.
- Velocidade boa por ser server-side leve; busca de produto rápida.
- Muitos cliques em fluxos administrativos; PDV em si é enxuto.

---

## Lições para o nosso sistema
- ✅ **Modelo de permissões por módulo/ação** é simples e replicável.
- ✅ **Receivings + Stock_location** é um bom espelho para Compras + Multiestoque.
- ✅ **Sale return / suspend** (devolução e venda suspensa) — funcionalidades que faltam no nosso PDV.
- ⚠️ Stack server-side não se alinha ao nosso (React SPA), mas a **modelagem de dados** é ótima referência.
