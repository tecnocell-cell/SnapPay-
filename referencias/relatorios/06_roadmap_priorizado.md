# Entrega Final — Roadmap de Evolução + Lista Priorizada

## Lista priorizada (backlog mestre)

Prioridade: 🔴 Alta · 🟠 Média · 🟢 Baixa · Esforço: P/M/G

| # | Item | Módulo | Prioridade | Esforço | Referência |
|---|---|---|---|---|---|
| 1 | Login + JWT + RBAC | Núcleo | 🔴 | M | NexoPOS, ERPNext |
| 2 | Multiempresa (`empresa_id` em tudo) | Núcleo | 🔴 | M | NexoPOS |
| 3 | Categorias de produto | Produtos | 🔴 | P | Todas |
| 4 | PDV: grade default + categorias + layout novo | PDV | 🔴 | M | POS Awesome |
| 5 | Caixa (abertura/fechamento/sangria) | Vendas | 🔴 | M | Floreant, ERPNext |
| 6 | Desconto por item/total no PDV | PDV | 🔴 | P | Todas |
| 7 | Atalhos de teclado F2–F8 | PDV | 🔴 | P | POS Awesome |
| 8 | Validação de estoque na venda | Estoque | 🔴 | P | Todas |
| 9 | Compras + Fornecedores | Compras | 🔴 | M | NexoPOS (Procurement) |
| 10 | Financeiro: contas a pagar/receber | Financeiro | 🔴 | G | ERPNext |
| 11 | Auditoria/Logs | Núcleo | 🟠 | P | ERPNext |
| 12 | Múltiplas formas + split de pagamento | PDV | 🟠 | P | NexoPOS |
| 13 | Devolução/troca | PDV | 🟠 | M | OSPOS |
| 14 | Venda suspensa (hold/draft) | PDV | 🟠 | P | POS Awesome |
| 15 | NFC-e (fiscal) | Fiscal | 🔴 | G | EasySAC |
| 16 | PWA | Plataforma | 🟠 | P | TailPOS |
| 17 | Multiestoque/depósitos | Estoque | 🟠 | M | OSPOS, ERPNext |
| 18 | Crediário real (parcelas/carnê) | Financeiro | 🟠 | M | NexoPOS (Instalment) |
| 19 | Inventário/contagem | Estoque | 🟠 | M | ERPNext |
| 20 | Balança / produto por peso | Mercado | 🟠 | M | NexoPOS (ScaleRange) |
| 21 | Promoções/cupons/fidelidade | Mercado | 🟠 | M | NexoPOS |
| 22 | Restaurante: mesas/comandas/KDS | Restaurante | 🟠 | G | Floreant |
| 23 | Padaria: fichas técnicas | Padaria | 🟠 | M | ERPNext (BOM) |
| 24 | Offline-first + IndexedDB + sync | Plataforma | 🟠 | G | TailPOS |
| 25 | API pública + Swagger | Plataforma | 🟠 | M | NexoPOS |
| 26 | WhatsApp + IA | WhatsApp | 🟢 | G | — |
| 27 | DRE / centros de custo | Financeiro | 🟢 | G | ERPNext |
| 28 | Distribuidora (romaneio/comissão) | Distribuidora | 🟢 | G | ERPNext |
| 29 | Serviços (OS/agenda) | Serviços | 🟢 | G | ERPNext |

---

## Roadmap por fases

### 🟦 Fase A — Fundação (transformar protótipo em produto)
**Objetivo:** virar um sistema multiusuário, seguro e com caixa.
- Login + JWT + RBAC (#1)
- Multiempresa / tenant (#2)
- Auditoria/Logs (#11)
- Categorias de produto (#3)
- **Entregável:** sistema com login, empresas, papéis e trilha de auditoria.

### 🟩 Fase B — PDV profissional
**Objetivo:** frente de caixa de verdade.
- Novo layout + grade + categorias (#4)
- Caixa abertura/fechamento/sangria (#5)
- Descontos (#6), atalhos F2–F8 (#7), validação de estoque (#8)
- Múltiplas formas + split (#12), devolução (#13), venda suspensa (#14)
- **Entregável:** PDV competitivo com EasySAC no balcão.

### 🟨 Fase C — Gestão (estoque + compras + financeiro)
- Compras/Fornecedores (#9)
- Multiestoque (#17), inventário (#19)
- Financeiro CP/CR (#10) + crediário (#18)
- **Entregável:** ciclo completo compra→estoque→venda→financeiro.

### 🟧 Fase D — Fiscal (compete no Brasil)
- NFC-e (#15), depois NF-e/SAT
- **Entregável:** emissão fiscal legal — paridade com EasySAC.

### 🟪 Fase E — Multi-segmento (supera EasySAC)
- Mercado: balança, promoções (#20, #21)
- Restaurante: mesas/comandas/KDS (#22)
- Padaria: fichas técnicas (#23)
- **Entregável:** plataforma multi-segmento ativável.

### 🟥 Fase F — Plataforma moderna
- PWA (#16), Offline-first + sync (#24), API pública (#25)
- WhatsApp + IA (#26)
- DRE/distribuidora/serviços (#27–29)
- **Entregável:** diferenciais que nenhum concorrente local tem junto.
