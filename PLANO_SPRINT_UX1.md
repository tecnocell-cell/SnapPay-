# 🎨 SPRINT UX-1 — OPERAÇÃO DE CAIXA

**Objetivo:** Eliminar todos os problemas encontrados no teste real  
**Duração:** 5 dias (segunda a sexta)  
**Meta:** 90%+ sucesso, <20 seg/venda, zero falhas críticas  
**Escopo:** Apenas UX (sem novas funcionalidades, sem alteração de regras)

---

## 📋 PROBLEMAS A RESOLVER

### 🔴 CRÍTICO 1: Recebimento de Compras (Fluxo Guiado)

**Status atual:** ❌ Operador não consegue completar  
**Problema:** Não há fluxo claro para adicionar produtos

**Solução proposta:**

```
ANTES (atual - confuso):
[Selecionar fornecedor] [Data] [???]

DEPOIS (guiado):
┌─────────────────────────────────────┐
│ RECEBER COMPRA                      │
├─────────────────────────────────────┤
│                                     │
│ 1. Selecionar Fornecedor            │
│ [Distribuidora ABC ▼]               │
│                                     │
│ 2. Adicionar Produtos               │
│ [+ Adicionar Produto]               │
│ ┌─────────────────────────────┐     │
│ │ Produto   | Qtd | Valor    │     │
│ │ Arroz 5kg |  50 | R$28.90  │ [x] │
│ │ Feijão 1k |  40 | R$8.50   │ [x] │
│ └─────────────────────────────┘     │
│                                     │
│ 3. Total da Compra: R$ 1.456,00     │
│                                     │
│ [Cancelar] [Confirmar Recebimento]  │
└─────────────────────────────────────┘
```

**Implementação:**
- [ ] Tela com 3 steps claros
- [ ] Modal para adicionar produtos
- [ ] Tabela com itens selecionados
- [ ] Botão "Confirmar" destaca
- [ ] Toast de sucesso

**Validação:**
- [ ] Operador consegue receber compra
- [ ] Estoque aumenta corretamente
- [ ] Sem confusão de fluxo

---

### 🔴 CRÍTICO 2: Cancelamento × Devolução (Separar Visualmente)

**Status atual:** ❌ Operador confundiu e cancelou venda inteira

**Solução proposta:**

```
ANTES (confuso - mesmo visual):
[Cancelar Venda] [Devolução] ← parecem iguais

DEPOIS (diferenciado):

❌ CANCELAR VENDA (Vermelho Escuro)
   "Anula a venda INTEIRA"
   [Ícone: X grande]
   [Confirmação agressiva]: "Tem certeza que quer CANCELAR TUDO?"
   
↩️ DEVOLVER PRODUTO (Laranja/Retorno)
   "Devolve itens ESPECÍFICOS"
   [Ícone: Seta de retorno]
   [Confirmação clara]: "Qual item devolver?"
   [Campo de quantidade]
```

**Implementação:**
- [ ] Cores diferentes (vermelho vs laranja)
- [ ] Ícones diferentes
- [ ] Confirmações diferentes
- [ ] Fluxo de devolução separa item por item

**Validação:**
- [ ] Operador não confunde mais
- [ ] Devoluções parciais funcionam
- [ ] Cancelamento é mais cuidadoso

---

### 🟠 ALTO 1: Busca de Produtos (Campo Dominante)

**Status atual:** ⚠️ Operador não vê o campo de busca

**Solução proposta:**

```
TELA DE VENDAS - Após Abrir Caixa:

┌─────────────────────────────────────────────┐
│ PONTO DE VENDA                      [Menu]  │
├─────────────────────────────────────────────┤
│                                             │
│ 🔍 Buscar Produto (nome, código, barras)   │ ← DOMINANTE
│ [____________________________________________] ← cursor aqui
│                                             │
│ Últimos vendidos:                          │
│ [Leite 1L] [Arroz 5kg] [Pão]              │
│                                             │
├─────────────────────────────────────────────┤
│ CARRINHO                                    │
│ ┌─────────────────────────────────────┐     │
│ │ Leite 1L      x2      R$ 9.00      │     │
│ │ Arroz 5kg     x1      R$ 28.90     │     │
│ └─────────────────────────────────────┘     │
│ TOTAL: R$ 46.90                             │
│                                             │
│ [Limpar] [Cancelar] [FINALIZAR VENDA]       │
└─────────────────────────────────────────────┘
```

**Implementação:**
- [ ] Campo grande no topo
- [ ] Placeholder explicativo
- [ ] Cursor automático
- [ ] Autocomplete enquanto digita
- [ ] Enter adiciona ao carrinho
- [ ] Histórico de últimos produtos

**Validação:**
- [ ] Primeira venda em <1 minuto (vs 2m 30s atual)
- [ ] 20 vendas em <8 minutos (vs 11m 15s atual)
- [ ] Operador não precisa procurar

---

### 🟠 ALTO 2: Produtos Pesáveis (Decimais)

**Status atual:** ❌ Rejeita 10.5 kg

**Solução proposta:**

```
Campo de quantidade:

Antes: [10] ← apenas inteiro
Depois: [10.500] kg ← aceita decimal

Validações:
✓ 0.100 kg
✓ 0.250 kg
✓ 1.500 kg
✓ 10.750 kg
✗ 0 kg (não permite)
✗ -5 kg (não permite)
```

**Implementação:**
- [ ] Campo tipo NUMBER com step 0.001
- [ ] Mínimo: 0.1
- [ ] Máximo: 999.999
- [ ] Label mostra unidade (kg, L, un)
- [ ] Validação em tempo real

**Validação:**
- [ ] Inventário de 10.5 kg funciona
- [ ] Vendas fracionadas funcionam
- [ ] Sem erros de validação

---

### 🟠 ALTO 3: Botão Finalizar (CTA Principal)

**Status atual:** ⚠️ Operador procura 20 segundos

**Solução proposta:**

```
ANTES (pequeno, iguala outros):
[Limpar] [Cancelar] [Finalizar] ← tamanho igual

DEPOIS (destaque primário):
[Limpar]                  [Cancelar]
        
        [✓ FINALIZAR VENDA]  ← Grande, verde, sempre visível
        
Ou em mobile:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Limpar]        [Cancelar]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    [✓ FINALIZAR] ← Full width
```

**Implementação:**
- [ ] Botão 2x maior que outros
- [ ] Cor destaque (verde/azul)
- [ ] Ícone ✓ visível
- [ ] Sempre visível (sticky bottom)
- [ ] Hover efeito claro

**Validação:**
- [ ] Operador encontra em < 5 segundos
- [ ] Clica sem hesitar

---

### 🟡 MÉDIO 1: Toast de Sucesso

**Status atual:** ❌ Sem feedback visual

**Solução proposta:**

```
Após cada operação:

✅ Venda #001 finalizada!
   (desaparece em 3 segundos)

✅ Compra recebida com sucesso!

✅ Inventário concluído!

✅ Devolução registrada!
```

**Implementação:**
- [ ] Toast verde no topo
- [ ] Ícone ✓
- [ ] Mensagem clara
- [ ] Desaparece em 3 seg
- [ ] Som opcional (beep)

**Validação:**
- [ ] Operador sabe que funcionou
- [ ] Confiança aumenta

---

### 🟡 MÉDIO 2: Quantidade (Campo Visível)

**Status atual:** ⚠️ Não é óbvio onde colocar

**Solução proposta:**

```
ANTES (sem label):
[Arroz 5kg]        [_____] [Adicionar]

DEPOIS (com label e destaque):
[Arroz 5kg]
Quantidade: [1] ▲▼  un
            [Adicionar ao carrinho]
```

**Implementação:**
- [ ] Label "Quantidade:" explícita
- [ ] Campo maior
- [ ] Spinner (↑↓) para fácil ajuste
- [ ] Unidade visível (un, kg, L)

**Validação:**
- [ ] Primeira venda não confunde
- [ ] Operador não clica errado

---

## 📅 SCHEDULE

| Dia | Tarefa | Owner | Status |
|-----|--------|-------|--------|
| **Seg** | CRÍTICO 1 + CRÍTICO 2 | Frontend | [ ] |
| **Ter** | ALTO 1 + ALTO 2 | Frontend | [ ] |
| **Qua** | ALTO 3 + MÉDIO 1 | Frontend | [ ] |
| **Qui** | MÉDIO 2 + Testes | QA | [ ] |
| **Sex** | Homologação com operador | QA | [ ] |

---

## 🧪 HOMOLOGAÇÃO FINAL

**Operador novo** executará:

```
☐ Login
☐ Abrir caixa
☐ 20 vendas (com busca, quantidade)
☐ 5 cancelamentos
☐ 3 devoluções (sem confundir)
☐ Inventário (com decimais)
☐ Receber compra (fluxo guiado)
☐ Fechar caixa
```

**Métricas esperadas:**

| Métrica | Alvo | Atual |
|---------|------|-------|
| Taxa de sucesso | 90%+ | 75% |
| Tempo/venda | <20 seg | 34 seg |
| Falhas críticas | 0 | 2 |
| Cancelamento/Devolução confusão | 0% | 33% |
| Receber compra sucesso | 100% | 0% |

---

## ✅ CRITÉRIO DE APROVAÇÃO

- ✅ Taxa de sucesso ≥ 90%
- ✅ Tempo médio/venda < 20 segundos
- ✅ Zero falhas críticas
- ✅ Sem confusão entre operações
- ✅ Operador consegue completar TODAS as tarefas

---

## 🎯 Objetivo Final

Operador novo consegue **trabalhar sozinho** sem dúvidas, sem erros, sem travamento.

---

**Sprint pronto para começar segunda-feira.**
