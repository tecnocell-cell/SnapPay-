# Fase 4 — Melhorias de Layout + Wireframes

## Diagnóstico da tela atual do PDV

| # | Problema observado | Causa no código atual | Correção proposta |
|---|---|---|---|
| 1 | Muito espaço vazio | Grade só aparece após buscar | Carregar produtos/categorias por padrão |
| 2 | Pouca informação operacional | Header só tem Admin/Loja/Online | Barra com caixa, hora, meta, operador |
| 3 | Falta cara de sistema comercial | Layout "app", não "frente de caixa" | Densidade, painel de caixa, atalhos visíveis |
| 4 | Carrinho pouco destacado | Sidebar fina, sem ênfase no total | Total gigante, botão finalizar destacado |
| 5 | Nenhum indicador de caixa | Não há módulo de caixa | Widget "Caixa: R$ X · Aberto às HH:MM" |
| 6 | Nenhum painel de produtividade | Não existe | Mini-dashboard no topo do PDV |
| 7 | Nenhum produto sem pesquisar | `resultados=[]` inicial | Grade + categorias rápidas sempre visíveis |

---

## Novo padrão de layout — Wireframe (desktop)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TOPO: 👤 João (Operador) │ 🏪 Loja 001 │ 🧾 Caixa #3 Aberto │ 🟢 Online │ 14:32 │ 🔔 3 │
├───────────────────────────────────────────────────────────────────────────┤
│ DASHBOARD: Vendas hoje R$ 4.230 │ 28 vendas │ Ticket R$ 151 │ Meta ▓▓▓▓░ 84% │ Caixa R$ 1.120 │
├──────────────┬──────────────────────────────────────────┬───────────────────┤
│              │ [Todos][Bebidas][Alimentos][Limpeza]...   │  🛒 CARRINHO        │
│  CATEGORIAS  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │  Cliente: Consumidor│
│  (atalhos)   │ │foto│ │foto│ │foto│ │foto│ │foto│         │  ┌─────────────────┐│
│  🥤 Bebidas  │ │R$ 5│ │R$ 9│ │R$12│ │R$ 3│ │R$ 8│         │  │ Coca 2L  2x  18 ││
│  🍞 Alimentos│ │est7│ │est3│ │est9│ │est2│ │est5│         │  │ Pão     10x  15 ││
│  🧽 Limpeza  │ └────┘ └────┘ └────┘ └────┘ └────┘         │  └─────────────────┘│
│  🧴 Higiene  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │  Subtotal    R$ 33  │
│              │ │ ... │                                    │  Desconto    R$  0  │
│              │ 🔍 [ buscar / ler código de barras ]       │  ╔═══════════════╗  │
│              │                                            │  ║ TOTAL  R$ 33  ║  │
│              │                                            │  ╚═══════════════╝  │
│              │                                            │  💳 [Forma pgto ▾]  │
│              │                                            │  ┌───────────────┐  │
│              │                                            │  │ ✓ FINALIZAR   │  │
│              │                                            │  │   (F5)        │  │
│              │                                            │  └───────────────┘  │
├──────────────┴──────────────────────────────────────────┴───────────────────┤
│ AÇÕES: [F2 Cliente] [F3 Produto] [F4 Desconto] [F5 Pagamento] [F6 Cancelar] [F7 Caixa] [F8 Fechamento] │
└───────────────────────────────────────────────────────────────────────────┘
```

### Especificação por região

**Topo (barra de status operacional)**
Operador · Loja · Caixa (nº + status) · Online · Hora (relógio ao vivo) · Notificações.

**Dashboard comercial (faixa fina)**
Vendas do dia · Qtd de vendas · Ticket médio · Meta diária (barra de progresso) · Saldo do caixa.

**Categorias (coluna esquerda)**
Botões rápidos: Todos, Bebidas, Alimentos, Limpeza, Higiene (vindos de `categorias`). Clicar filtra a grade.

**Área central (grade de produtos)**
Produtos visíveis **imediatamente** (sem busca). Cada card: foto · código · preço · estoque. Busca/scanner fixos no rodapé da área.

**Painel direito (carrinho sempre visível)**
Cliente · itens (qtd editável) · desconto · subtotal · **total em destaque** · forma de pagamento · **botão Finalizar grande**.

**Barra de ações rápidas (rodapé) + atalhos de teclado**
| Tecla | Ação |
|---|---|
| F2 | Selecionar/!cadastrar Cliente |
| F3 | Buscar Produto |
| F4 | Aplicar Desconto |
| F5 | Pagamento / Finalizar |
| F6 | Cancelar item/venda |
| F7 | Abrir/operar Caixa |
| F8 | Fechamento de caixa |

---

## Wireframe — Restaurante (Módulo)

```
┌─────────────── SALÃO ───────────────┐   ┌──── COMANDA Mesa 7 ────┐
│ [M1✓] [M2 ] [M3●] [M4✓] [M5 ]        │   │ 2x Picanha     ponto    │
│ [M6 ] [M7●] [M8 ] [M9✓] [M10]        │   │ 1x Refri lata           │
│  ● ocupada  ✓ conta aberta            │   │ 3x Pão de alho          │
│                                       │   │ ─────────────────────── │
│ [+ Nova comanda]  [Delivery] [Balcão] │   │ Total          R$ 184   │
└───────────────────────────────────────┘   │ [Enviar Cozinha→KDS]    │
                                             └─────────────────────────┘
```

> Implementação inicial sugerida: aplicar o novo layout de PDV no SnapPay reaproveitando os componentes React atuais (a grade já existe; falta torná-la default + categorias + barra de caixa + atalhos).
