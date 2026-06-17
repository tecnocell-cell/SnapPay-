# Fase 3 — Arquitetura Modular (SaaS Multi-Segmento)

## Princípio

Inspirado no **NexoPOS** (módulos ativáveis + hooks) e no **ERPNext** (entidades declarativas).
O sistema tem um **Núcleo** sempre ativo e **Módulos de segmento** ligáveis por empresa/plano.

```
┌──────────────────────────────────────────────────────────────┐
│                         NÚCLEO (sempre ativo)                  │
│  Auth · Empresas · Usuários · Permissões · Dashboard          │
│  Clientes · Produtos · Estoque · Compras · Vendas · Financeiro │
│  Relatórios · Auditoria                                        │
└──────────────────────────────────────────────────────────────┘
        ▲ habilita/desabilita por empresa (feature flags)
┌───────────┬───────────┬─────────────┬──────────────┬──────────┐
│  MERCADO  │  PADARIA  │ RESTAURANTE │ DISTRIBUIDORA│ SERVIÇOS │
└───────────┴───────────┴─────────────┴──────────────┴──────────┘
        + módulos transversais: WHATSAPP · FISCAL
```

## Como os módulos são "ativáveis" (modelo técnico)

1. Tabela `empresas` e tabela `modulos` + pivot `empresa_modulos (empresa_id, modulo, ativo)`.
2. Backend: middleware verifica `empresa_modulos` antes de expor rotas do módulo.
3. Frontend: o menu e as telas são renderizados a partir de um **registry de módulos** (`{ id, label, icon, rotas, permissões, ativoSe }`).
4. Cada módulo declara: suas **entidades** (tabelas), **rotas de API**, **telas**, **permissões** e **hooks** (ex.: "ao finalizar venda → gerar comanda" no Restaurante).
5. Sistema de **eventos/hooks** (estilo `eventy` do NexoPOS): `venda.finalizada`, `estoque.baixo`, `caixa.fechado` — módulos se inscrevem sem acoplar.

---

## Núcleo Obrigatório (detalhe)

| Módulo | Entidades-chave | Origem da referência |
|---|---|---|
| **Autenticação** | `usuarios`, `sessoes`, JWT/refresh | NexoPOS (Sanctum), ERPNext |
| **Empresas** | `empresas`, `empresa_config` (impostos, dados fiscais) | NexoPOS multi-tenant |
| **Usuários** | `usuarios`, `usuario_empresa` | Todas |
| **Permissões** | `papeis`, `permissoes`, `papel_permissao` | ERPNext/NexoPOS (RBAC) |
| **Dashboard** | views/agregações `dashboard_dia/mes` | NexoPOS (DashboardDay/Month) |
| **Clientes** | `clientes`, `cliente_endereco`, `cliente_credito` | Todas |
| **Produtos** | `produtos`, `categorias`, `unidades`, `produto_imagem`, variações | ERPNext, NexoPOS |
| **Estoque** | `estoques(depósitos)`, `estoque_saldo`, `estoque_movimentacao` | OSPOS (stock_location) |
| **Compras** | `fornecedores`, `compras`, `compra_itens` | NexoPOS (Procurement) |
| **Vendas** | `vendas`, `venda_itens`, `venda_pagamentos`, `caixas`, `caixa_movimentos` | Todas |
| **Financeiro** | `contas`, `lancamentos`, `parcelas`, `centros_custo` | ERPNext (accounts) |
| **Relatórios** | motor de queries + export | ERPNext, OSPOS |
| **Auditoria** | `audit_log` (quem/o quê/quando) | ERPNext |

## Módulo Mercado
PDV rápido · leitor de barras · balança (`produto.por_peso`, faixas) · frente de caixa · promoções (`cupons`, `ofertas`) · etiquetas (impressão) · inventário.
→ Referências: **NexoPOS** (ScaleRange, Coupon), **POS Awesome** (UX).

## Módulo Padaria
Produção diária · **fichas técnicas** (`receitas`, `receita_insumos` ≈ BOM) · consumo de ingredientes · perdas · produtos por peso.
→ Referência: **ERPNext BOM** (`bom`, `bom_item`).

## Módulo Restaurante
**Mesas** (`mesas`, layout de salão) · **comandas** (`comandas`, `comanda_itens`) · garçons · **cozinha/KDS** (`kds_tickets`) · delivery · iFood · modificadores de item.
→ Referência: **FloreantPOS** (Table, Ticket, KitchenTicket).

## Módulo Distribuidora
Pedido externo · vendedores · **comissão** · romaneio (`romaneios`) · entrega/rota.
→ Referência: ERPNext (selling + delivery), Floreant (vendor).

## Módulo Serviços
**Ordem de serviço** (`os`, `os_itens`) · técnicos · agenda · contratos.
→ Referência: ERPNext (maintenance/projects/support).

## Módulo WhatsApp
Múltiplos números · chat · atendimento · **IA** (Claude) · campanhas.
→ Diferencial próprio (nenhuma ref. open cobre bem).

## Módulo Fiscal
**NFC-e · NFe · SAT · MFE · SPED.** Integração SEFAZ + certificado A1/A3.
→ Referência funcional: **EasySAC** (não há open BR forte).

---

## Stack recomendada (mantendo o que já temos)

| Camada | Escolha | Porquê |
|---|---|---|
| Frontend | **React + Vite** (PWA) | já em uso; vira PWA p/ offline |
| Estado offline | **IndexedDB + Service Worker** (Zustand) | inspirado no TailPOS |
| Backend | **Node + Express** (evoluir p/ NestJS modular) | já em uso; Nest dá modularidade real |
| Banco | **PostgreSQL** | já em uso; robusto, multi-tenant via schema/`empresa_id` |
| Auth | **JWT + refresh** + RBAC | padrão SaaS |
| Realtime (KDS/notif) | **WebSocket (Socket.io)** | espelha Reverb do NexoPOS |
| Multi-tenant | `empresa_id` em todas as tabelas + RLS opcional | simples e escalável |
