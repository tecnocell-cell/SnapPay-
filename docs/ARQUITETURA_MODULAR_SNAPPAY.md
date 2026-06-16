# ARQUITETURA MODULAR — SnapPay

> SnapPay é um **PDV/ERP web modular, SaaS, multiempresa e multi-segmento**, inspirado no EasySAC (escopo) e no Fome de Que (padrões técnicos), com **identidade, banco e roadmap próprios**.

Segmentos atendidos: **Mercados · Lojas · Padarias · Conveniências · Restaurantes · Distribuidoras · Serviços.**

---

## 1. Visão geral

```
┌──────────────────────────────────────────────────────────────────────┐
│                       BASE COMUM (sempre ativa)                        │
│  Auth · Empresas · Usuários · Permissões · Lojas/Unidades             │
│  Clientes · Fornecedores · Produtos · Categorias · Estoque            │
│  PDV · Caixa · Vendas · Compras · Financeiro · Relatórios · Config    │
│  Dashboard · Auditoria                                                 │
└──────────────────────────────────────────────────────────────────────┘
        ▲ habilitação por empresa (engine de módulos ativáveis)
┌─────────┬─────────┬─────────────┬────────┬───────────────┬──────────┐
│ MERCADO │ PADARIA │ RESTAURANTE │  LOJA  │ DISTRIBUIDORA │ SERVIÇOS │
└─────────┴─────────┴─────────────┴────────┴───────────────┴──────────┘
        + transversal: FISCAL (NFC-e/NFe/SAT)
```

---

## 2. Núcleo obrigatório (base comum)

Sempre ativo, independentemente do segmento.

| Módulo | Entidades principais | Observações |
|---|---|---|
| **Auth** | `usuarios`, `sessoes`, `refresh_tokens` | JWT + refresh |
| **Empresas** | `empresas`, `empresa_config` | tenant raiz (multiempresa) |
| **Usuários** | `usuarios`, `usuario_empresa` | vínculo usuário↔empresa |
| **Permissões** | `papeis`, `permissoes`, `papel_permissao` | RBAC (admin/gerente/operador) |
| **Lojas/Unidades** | `unidades` | uma empresa, várias lojas |
| **Clientes** | `clientes`, `cliente_endereco`, `cliente_credito` | crediário/limite |
| **Fornecedores** | `fornecedores` | usado em Compras |
| **Produtos** | `produtos`, `produto_imagem` | base do catálogo |
| **Categorias** | `categorias` | usadas no PDV (botões rápidos) |
| **Estoque** | `estoques`, `estoque_saldo`, `estoque_movimentacao` | multiestoque opcional |
| **PDV** | (consome produtos/vendas/caixa) | frente de caixa |
| **Caixa** | `caixas`, `caixa_movimentos` | abertura/sangria/suprimento/fechamento |
| **Vendas** | `vendas`, `venda_itens`, `venda_pagamentos` | já existe (evoluir) |
| **Compras** | `compras`, `compra_itens` | entrada de mercadoria |
| **Financeiro** | `contas`, `lancamentos`, `parcelas` | contas a pagar/receber |
| **Relatórios** | views/agregações | vendas, caixa, estoque |
| **Configurações** | `empresa_config` | impostos, dados fiscais, preferências |
| **Dashboard** | agregações dia/mês | KPIs comerciais |
| **Auditoria** | `audit_log` | quem/o quê/quando |

> Em todas as tabelas: **`empresa_id`** (tenant) + **`unidade_id`** quando aplicável. Decisão de fundação — adotar já.

---

## 3. Engine de módulos ativáveis

Inspirado no `ModuleGate` do Fome de Que, **reescrito** para o SnapPay.

### Modelo de dados
- `modulos` (catálogo: `mercado`, `padaria`, `restaurante`, `loja`, `distribuidora`, `servicos`, `fiscal`).
- `empresa_modulos (empresa_id, modulo_key, ativo)` — habilitação por empresa.

### Backend
- Middleware/guard verifica `empresa_modulos` antes de expor rotas do módulo.
- Eventos/hooks: `venda.finalizada`, `caixa.fechado`, `estoque.baixo` — módulos assinam sem acoplar.

### Frontend
- `registry de módulos`: `{ key, label, icon, rotas, permissoes, ativoSe }`.
- `ModuleGate` (a criar): bloqueia rota se o módulo não estiver ativo para a empresa.
- `RoleGate` (a criar): bloqueia por permissão.
- Menu lateral renderizado a partir do registry + módulos ativos.

---

## 4. Módulos por segmento

### Base comum (sempre ativo)
Cadastro · Produtos · Estoque · PDV · Caixa · Financeiro · Relatórios.

### 🛒 Módulo Mercado
Código de barras · balança (`produto.por_peso`, faixas de peso) · promoções (`promocoes`) · etiquetas (impressão) · inventário (`inventarios`, `inventario_itens`) · fiscal (NFC-e).

### 🍞 Módulo Padaria
Produção diária (`producoes`) · perdas (`perdas`) · produtos por peso · **ficha técnica** (`receitas`, `receita_insumos`) · encomendas (`encomendas`).

### 🍽️ Módulo Restaurante
Mesas (`mesas`) · comandas (`comandas`, `comanda_itens`) · cozinha/KDS (`kds_tickets`) · garçons · delivery. *(Padrões de referência: `dining`/`kitchen` do FdQ — adaptados.)*

### 👕 Módulo Loja
Variações de produto · grade (tamanho/cor) · trocas (`trocas`) · vendas balcão.

### 🚚 Módulo Distribuidora
Pedido externo (`pedidos`) · vendedor (`vendedores`) · comissão (`comissoes`) · romaneio (`romaneios`) · entrega/rota.

### 🔧 Módulo Serviços
Ordem de serviço (`os`, `os_itens`) · técnicos · agenda (`agenda`) · garantia.

### 🧾 Transversal — Fiscal
NFC-e · NFe · SAT · (futuro: MFE/SPED). Interface `FiscalProvider` plugável (mock no MVP), referência do contrato no FdQ.

---

## 5. Stack do SnapPay (estado atual e evolução)

| Camada | Hoje | Evolução planejada |
|---|---|---|
| Frontend | React + Vite (JS) | + TypeScript, + PWA, + Zustand (carrinho/offline) |
| Backend | Node + Express (JS) | → NestJS modular (quando os módulos crescerem) ou Express modularizado |
| Banco | PostgreSQL (6 tabelas) | esquema multiempresa + módulos (ver núcleo acima) |
| Auth | inexistente | JWT + refresh + RBAC |
| Realtime | inexistente | WebSocket (KDS/notificações) — quando entrar Restaurante |

> A migração Express→NestJS é **opcional e gradual**. O que é inadiável é o **modelo de dados multiempresa + engine de módulos + auth/RBAC**.

---

## 6. Princípios inegociáveis

1. **Multiempresa desde a fundação** (`empresa_id` em tudo).
2. **Módulos ativáveis** — núcleo sempre ativo, segmentos ligáveis por empresa.
3. **Identidade própria** — SnapPay nunca herda branding/nomes do Fome de Que.
4. **Fome de Que isolado** — apenas referência em `referencias/fome-de-que/`.
5. **Documentação por fluxo** — cada módulo ganha `docs/FLUXO_<modulo>.md`.
