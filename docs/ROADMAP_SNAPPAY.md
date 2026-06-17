# ROADMAP — SnapPay

> Projeto próprio, isolado do Fome de Que (usado só como referência). Prioridades: **P0** antes de vender · **P1** MVP comercial · **P2** melhoria · **P3** futuro.

---

## 1. Estado atual (baseline)

✅ Já existe: PDV (busca, carrinho, cliente, finalizar) · Produtos (CRUD) · Estoque (mov. simples) · Vendas (histórico + cancelar) · Clientes · Relatórios básicos · backend Express + PostgreSQL.
❌ Falta (núcleo): Auth/RBAC · Multiempresa · Categorias · Caixa · Compras · Fornecedores · Financeiro · Configurações · Auditoria · engine de módulos.

---

## 2. Roadmap por fases

### 🟦 Fase 0 — Fundação (P0) — ✅ CONCLUÍDA
Transformar protótipo em produto multiusuário e seguro.
- [x] Auth (login, JWT) — *refresh token fica para depois*
- [x] Multiempresa (`empresa_id` nas tabelas)
- [x] Usuários + Permissões (RBAC: admin/gerente/operador, 13 permissões)
- [x] Lojas/unidades (schema + escopo) — *UI de gestão pendente*
- [ ] Auditoria/logs — **pendente (movido p/ Fase 2)**
- [x] Engine de módulos ativáveis (`modulos`, `empresa_modulos`, ModuleGate/RoleGate, página Módulos)
- **Entregável:** ✅ sistema com login, empresas, papéis e módulos ligáveis.

### 🟩 Fase 1 — PDV profissional (P0) — ✅ BASE CONCLUÍDA
- [x] Categorias de produto (CRUD + vínculo ao produto)
- [x] Novo layout do PDV — produtos visíveis + categorias + carrinho destacado
- [x] Modos de visualização: **Mercado** (busca/código de barras + lista) e **Loja** (cards)
- [x] Caixa (abertura/fechamento)
- [x] Sangria (F9) e Suprimento (F10)
- [x] Desconto (total) no PDV
- [x] Atalhos de teclado F2–F10 + ESC
- [x] Validação de estoque na venda (bloqueia negativo, HTTP 409)
- [x] Indicadores movidos para Relatórios (PDV mais limpo)
- [ ] Devolução/troca no PDV — pendente
- [ ] Múltiplas formas de pagamento + split — pendente
- **Entregável:** ✅ frente de caixa enxuta e funcional.

### 🟨 Fase 2 — Gestão (P1)
- [ ] Fornecedores + Compras (entrada de mercadoria)
- [ ] Estoque avançado (multiestoque, inventário)
- [ ] Financeiro (contas a pagar/receber, crediário/parcelas)
- [ ] Configurações (impostos, dados fiscais, preferências)
- [ ] Relatórios evoluídos
- [ ] Múltiplas formas de pagamento + split
- **Entregável:** ciclo compra→estoque→venda→financeiro.

### 🟧 Fase 3 — Fiscal (P1)
- [ ] Interface `FiscalProvider` (mock) → NFC-e
- [ ] Depois: NFe / SAT
- **Entregável:** emissão fiscal legal (paridade com EasySAC).

### 🟪 Fase 4 — Módulos de segmento (P2)
- [ ] Mercado (barras, balança, promoções, etiquetas, inventário)
- [ ] Loja (variações, grade, trocas)
- [ ] Restaurante (mesas, comandas, KDS) — adaptar padrões do FdQ
- [ ] Padaria (produção, perdas, ficha técnica, encomendas)
- **Entregável:** plataforma multi-segmento ativável.

### 🟥 Fase 5 — Plataforma moderna (P2/P3)
- [ ] PWA + Offline-first (IndexedDB) + sync
- [ ] Billing SaaS (planos/addons)
- [ ] API pública (Swagger)
- [ ] Distribuidora (romaneio/comissão) · Serviços (OS/agenda)
- [ ] WhatsApp + IA
- **Entregável:** diferenciais que superam o EasySAC.

---

## 3. Proposta de novo layout do PDV

Objetivo: parecer **sistema comercial profissional**, sem tela vazia.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: 👤 João │ 🏪 Loja 001 │ 🧾 Caixa #3 Aberto │ 🟢 Online │ 14:32 │ 🔔 │
├───────────────────────────────────────────────────────────────────────────┤
│ FAIXA KPI: Vendas hoje R$ 4.230 │ 28 vendas │ Ticket R$ 151 │ Caixa R$ 1.120 │
├────────────┬──────────────────────────────────────────┬─────────────────────┤
│            │ [Todos][Bebidas][Alimentos][Limpeza]...   │ 🛒 CARRINHO          │
│  SIDEBAR   │ ┌────┐┌────┐┌────┐┌────┐┌────┐            │ Cliente: Consumidor  │
│  moderna   │ │card││card││card││card││card│            │ ┌──────────────────┐ │
│  (ícones)  │ │R$ 5││R$ 9││R$12││R$ 3││R$ 8│            │ │ Coca 2L  2x   18 │ │
│  PDV       │ │est7││est3││est9││est2││est5│            │ │ Pão     10x   15 │ │
│  Produtos  │ └────┘└────┘└────┘└────┘└────┘            │ └──────────────────┘ │
│  Estoque   │ ┌────┐┌────┐┌────┐ ...                    │ Subtotal     R$ 33   │
│  Vendas    │                                           │ Desconto     R$  0   │
│  Caixa     │ 🔍 [ busca global / código de barras ]    │ ╔══════════════════╗ │
│  Clientes  │                                           │ ║ TOTAL    R$ 33   ║ │
│  Financeiro│                                           │ ╚══════════════════╝ │
│  Relatórios│                                           │ 💳 [Forma pgto ▾]    │
│            │                                           │ ┌──────────────────┐ │
│            │                                           │ │ ✓ FINALIZAR (F5) │ │
│            │                                           │ └──────────────────┘ │
├────────────┴──────────────────────────────────────────┴─────────────────────┤
│ [F2 Cliente][F3 Produto][F4 Desconto][F5 Pagar][F6 Cancelar][F7 Abrir Caixa] │
│ [F8 Fechar Caixa][F9 Sangria][F10 Suprimento][ESC Limpar]                    │
└───────────────────────────────────────────────────────────────────────────┘
```

### Checklist do novo PDV (15 itens da ordem)
1. ✅ Sidebar mais moderna (ícones, ativo destacado)
2. ✅ Topbar compacta (operador, loja, caixa, online, hora, notificações)
3. ✅ Busca global com atalho (F3 / foco automático)
4. ✅ Produtos visíveis em cards (sem precisar buscar)
5. ✅ Categorias rápidas (botões)
6. ✅ Carrinho sempre visível
7. ✅ Cliente opcional no carrinho
8. ✅ Desconto visível
9. ✅ Forma de pagamento visível
10. ✅ Botão Finalizar destacado
11. ✅ Status do caixa
12. ✅ Vendas do dia
13. ✅ Últimas vendas
14. ✅ Ticket médio
15. ✅ Atalhos de teclado

---

## 4. Atalhos de teclado (obrigatórios)

| Tecla | Ação |
|---|---|
| **F2** | Cliente |
| **F3** | Produto (foco na busca) |
| **F4** | Desconto |
| **F5** | Pagamento / Finalizar |
| **F6** | Cancelar item |
| **F7** | Abrir caixa |
| **F8** | Fechar caixa |
| **F9** | Sangria |
| **F10** | Suprimento |
| **ESC** | Limpar / cancelar ação |

> Implementação: hook global de teclado no componente do PDV, com `preventDefault` nas teclas F* (evitar ações do navegador).

---

## 5. Próximo passo imediato sugerido

Dado que o PDV já existe e os componentes React estão prontos, o **maior impacto visual com menor esforço** é a **Fase 1 (novo layout do PDV + categorias + caixa + atalhos)**. A **Fase 0 (fundação)** é pré-requisito para virar produto vendável — recomenda-se rodar Fase 0 e Fase 1 em paralelo curto, começando pela engine de módulos + categorias (destravam o resto).
