# Fase 2 — Matriz Comparativa

Legenda de status do **Sistema Atual (SnapPay)**: ✅ Existe · 🟡 Parcial · ❌ Não existe
Prioridade: 🔴 Alta · 🟠 Média · 🟢 Baixa

## Núcleo

| Funcionalidade | EasySAC | Referências | Sistema Atual | Prioridade |
|---|---|---|---|---|
| Autenticação / Login | ✅ | Todas | ❌ | 🔴 |
| Multiempresa / Multiloja | ✅ | NexoPOS, ERPNext | ❌ | 🔴 |
| Usuários e perfis | ✅ | Todas | ❌ | 🔴 |
| Permissões (RBAC) | ✅ | NexoPOS, ERPNext, OSPOS | ❌ | 🔴 |
| Dashboard comercial | 🟡 | NexoPOS, ERPNext | 🟡 (KPIs básicos) | 🟠 |
| Clientes | ✅ | Todas | 🟡 (CRUD básico) | 🟠 |
| Produtos | ✅ | Todas | ✅ (CRUD) | — |
| Categorias de produto | ✅ | Todas | ❌ | 🔴 |
| Estoque | ✅ | Todas | 🟡 (mov. simples) | 🟠 |
| Multiestoque / depósitos | ✅ | OSPOS, ERPNext, NexoPOS | ❌ | 🟠 |
| Compras / Fornecedores | ✅ | NexoPOS, ERPNext, OSPOS | ❌ | 🔴 |
| Vendas (PDV) | ✅ | Todas | ✅ | — |
| Histórico de vendas | ✅ | Todas | ✅ | — |
| Financeiro (CP/CR) | ✅ | ERPNext, NexoPOS | ❌ | 🔴 |
| Fluxo de caixa | ✅ | ERPNext, NexoPOS | ❌ | 🟠 |
| DRE / Centros de custo | ✅ | ERPNext | ❌ | 🟢 |
| Relatórios | ✅ | Todas | 🟡 (básicos) | 🟠 |
| Auditoria / Logs | ✅ | ERPNext, NexoPOS | ❌ | 🟠 |

## PDV (frente de caixa)

| Funcionalidade | EasySAC | Referências | Sistema Atual | Prioridade |
|---|---|---|---|---|
| Busca de produto | ✅ | Todas | ✅ | — |
| Grade de produtos visível | 🟡 | POS Awesome, Floreant | ❌ (tela vazia) | 🔴 |
| Categorias rápidas | ✅ | POS Awesome, Floreant | ❌ | 🔴 |
| Carrinho | ✅ | Todas | ✅ | — |
| Desconto por item/total | ✅ | Todas | ❌ | 🔴 |
| Seleção de cliente no PDV | ✅ | Todas | ✅ | — |
| Múltiplas formas de pagamento | ✅ | Todas | 🟡 (1 forma) | 🟠 |
| Pagamento dividido (split) | ✅ | NexoPOS, ERPNext | ❌ | 🟠 |
| Cancelamento / devolução | ✅ | Todas | 🟡 (cancela venda) | 🟠 |
| Venda suspensa (hold/draft) | ✅ | OSPOS, POS Awesome | ❌ | 🟠 |
| Atalhos de teclado (F2–F8) | ✅ | POS Awesome | ❌ | 🔴 |
| Caixa (abertura/fechamento) | ✅ | Todas | ❌ | 🔴 |
| Sangria / suprimento | ✅ | NexoPOS, Floreant | ❌ | 🟠 |
| Leitor de código de barras | ✅ | Todas | 🟡 (busca por barras) | 🟠 |
| Balança / produto por peso | ✅ | NexoPOS | ❌ | 🟠 |
| Validação de estoque na venda | ✅ | Todas | ❌ (vende negativo) | 🔴 |

## Estoque

| Funcionalidade | EasySAC | Referências | Sistema Atual | Prioridade |
|---|---|---|---|---|
| Entradas | ✅ | Todas | 🟡 (movimentação) | 🟠 |
| Saídas / baixa na venda | ✅ | Todas | ✅ | — |
| Inventário / contagem | ✅ | OSPOS, ERPNext, Floreant | ❌ | 🟠 |
| Transferências entre locais | ✅ | OSPOS, ERPNext | ❌ | 🟢 |
| Lotes / validade / série | ✅ | ERPNext | ❌ | 🟢 |
| Alertas de mínimo | ✅ | Todas | ✅ | — |

## Financeiro

| Funcionalidade | EasySAC | Referências | Sistema Atual | Prioridade |
|---|---|---|---|---|
| Contas a pagar | ✅ | ERPNext, NexoPOS | ❌ | 🔴 |
| Contas a receber / crediário | ✅ | ERPNext, NexoPOS | ❌ | 🔴 |
| Carnê / parcelamento | ✅ | NexoPOS (Instalment) | ❌ | 🟠 |
| Fluxo de caixa | ✅ | ERPNext, NexoPOS | ❌ | 🟠 |
| DRE | ✅ | ERPNext | ❌ | 🟢 |
| Centros de custo | ✅ | ERPNext | ❌ | 🟢 |
| Conciliação bancária | 🟡 | ERPNext | ❌ | 🟢 |

## Fiscal (diferencial Brasil)

| Funcionalidade | EasySAC | Referências | Sistema Atual | Prioridade |
|---|---|---|---|---|
| NFC-e | ✅ | — (nenhuma ref. open BR) | ❌ | 🔴 |
| NF-e | ✅ | — | ❌ | 🟠 |
| SAT / MFE | ✅ | — | ❌ | 🟠 |
| SPED | ✅ | — | ❌ | 🟢 |

## Diferenciais modernos (superar EasySAC)

| Funcionalidade | EasySAC | Referências | Sistema Atual | Prioridade |
|---|---|---|---|---|
| Web / SaaS | ❌ | NexoPOS, ERPNext | ✅ | — |
| PWA / Offline-first | ❌ | TailPOS | ❌ | 🟠 |
| Multi-segmento (módulos) | ❌ | NexoPOS | ❌ | 🔴 |
| Restaurante (mesas/KDS) | 🟡 | Floreant | ❌ | 🟠 |
| Padaria (ficha técnica) | 🟡 | ERPNext (BOM) | ❌ | 🟠 |
| WhatsApp / IA | 🟡 | — | ❌ | 🟢 |
| API pública | 🟡 | NexoPOS, ERPNext | 🟡 (REST interna) | 🟠 |

---

## Leitura da matriz — 3 grandes lacunas críticas (🔴)

1. **Núcleo de gestão ausente:** Auth, Empresas, Usuários, Permissões, Categorias, **Compras**, **Financeiro**. Sem isso não é "sistema comercial".
2. **PDV incompleto:** falta **Caixa**, **descontos**, **grade de produtos + categorias**, **atalhos**, **validação de estoque**.
3. **Fiscal zero:** sem NFC-e não compete no varejo brasileiro real.
