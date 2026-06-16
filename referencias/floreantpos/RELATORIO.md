# Relatório Técnico — FloreantPOS

> Fonte analisada: `referencias/floreantpos/src` (clone shallow de `fat-tire/floreantpos`, fork do SVN original)

## Identidade

- **Repositório de origem:** code.google.com/p/floreantpos (SourceForge/SVN) — mirrors no GitHub.
- **Natureza:** PDV **desktop para restaurantes** (Java Swing), multi-terminal.
- **Foco:** Restaurante/bar — **a referência direta para o nosso Módulo Restaurante.**

---

## Arquitetura

| Item | Detalhe |
|------|---------|
| **Linguagem** | Java |
| **Framework** | Swing (UI desktop) + **Hibernate** (ORM, mapeamentos `.hbm.xml`) |
| **Banco** | Apache Derby (embarcado), MySQL/MariaDB, PostgreSQL |
| **Arquitetura** | Cliente desktop multi-terminal + `posserver` (servidor central) |
| **Estrutura** | `com.floreantpos`: `model` (entidades), `bo` (business objects/DAO), `ui`/`swing` (telas), `report`, `print`, `services`, `customer`, `table` |

### Permissões
Controle por **função/cargo** (`UserType`, permissões por terminal) — garçom, caixa, gerente, com PIN de acesso.

### Relatórios
Pasta `report/` robusta (JasperReports): vendas, **food cost / labor cost**, fechamento de caixa (Drawer Pull), produtividade por funcionário, vendas por mesa/hora.

---

## PDV — orientado a restaurante
- **Mesas (`Table`/floor layout):** mapa de salão, mesas, junção/divisão de conta.
- **Comandas/Tickets (`Ticket`, `TicketItem`):** pedido por mesa, em aberto, transferível entre garçons.
- **Cozinha (`KitchenTicket`, `KitchenTicketItem`):** impressão/roteamento de itens para a cozinha = **base de KDS**.
- **Busca/Cardápio:** itens por grupo de menu, modificadores (ex.: "sem cebola"), tamanhos.
- **Descontos/Cancelamentos:** void de item/ticket com motivo, autorização por gerente.
- **Caixa (`CashDrawer`, `DrawerPullReport`, `DrawerAssignedHistory`):** gaveta por terminal/usuário, sangria, fechamento (drawer pull).

## Estoque
- **Inventário próprio:** `InventoryItem`, `InventoryGroup`, `InventoryLocation`, `InventoryWarehouse`, `InventoryVendor`, `InventoryTransaction` (entrada/saída/ajuste por tipo).
- **Receitas/consumo:** relaciona item de venda a insumos (food cost).
- **Transferências:** entre warehouses/locations.

## Financeiro
- **Caixa/Drawer:** forte (núcleo do restaurante).
- **Contas a pagar/receber:** limitado — foco operacional, não contábil.
- **DRE/centros de custo:** ❌ não é o foco; usa relatórios de custo (food/labor cost).

## Experiência do usuário
- UI **touch-screen** desktop, botões grandes, fluxo de garçom rápido.
- Multi-terminal: vários caixas/garçons no mesmo servidor.
- Datado visualmente (Swing), mas ergonomia de restaurante é excelente.

---

## Lições para o nosso sistema — base do Módulo Restaurante
- ⭐ **Mesas + Comandas (Ticket)** → modelo direto para Mesas/Comandas/Garçons.
- ⭐ **KitchenTicket** → arquitetura de **KDS (Kitchen Display System)**.
- ⭐ **Modificadores de item** ("sem cebola", "ponto da carne") → essencial p/ restaurante.
- ⭐ **CashDrawer por terminal/usuário + Drawer Pull** → modelo de Caixa multi-operador.
- ⭐ **InventoryItem ligado a receita (food cost)** → conecta com fichas técnicas da Padaria/Restaurante.
- ⭐ **Autorização por gerente** (void com permissão) → controle que falta no nosso sistema.
