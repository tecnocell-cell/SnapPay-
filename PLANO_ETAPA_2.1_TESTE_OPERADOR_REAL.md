# 👤 ETAPA 2.1 — TESTE COM OPERADOR REAL

**Objetivo:** Validar usabilidade com operador que NUNCA usou SnapPay  
**Data:** 23 de junho de 2026  
**Duração:** 2-3 horas  
**Participante:** Uma pessoa sem conhecimento prévio do sistema

---

## 📋 PRÉ-TESTE

### Preparação

- [ ] Sistema rodando (backend + frontend)
- [ ] Banco populado com dados reais
- [ ] Operador pronto (sem briefing técnico)
- [ ] Cronômetro ligado
- [ ] Formulário de observação pronto
- [ ] Ninguém ajudando (teste puro)

### Instruções ao Operador

```
"Você é um operador de caixa em um supermercado. 
O sistema SnapPay é novo e você nunca o usou.

Suas tarefas são:
1. Fazer login
2. Abrir o caixa
3. Fazer 20 vendas
4. Cancelar 5 vendas
5. Fazer 3 devoluções
6. Fazer 1 inventário
7. Receber 1 compra
8. Fechar o caixa

Não há instruções — descubra sozinho como fazer.
Se ficar perdido, diga em voz alta o que está tentando fazer.

Vamos começar?"
```

---

## 🎯 TESTE — TAREFAS

### TAREFA 1: LOGIN

**Tempo esperado:** 30 segundos  
**Dificuldade esperada:** BAIXA

```
Operador chega na tela de login.

Deve preencher:
- Usuário: admin
- Senha: admin123

Clicar em "Entrar"

Observar:
☐ Conseguiu encontrar os campos?
☐ Tentou algo diferente?
☐ Conseguiu fazer login na primeira vez?
☐ Quantos cliques foram necessários?
```

**Registrar:**
- Tempo: _____ segundos
- Cliques: _____
- Problemas: ______________________________

---

### TAREFA 2: ABRIR CAIXA

**Tempo esperado:** 1-2 minutos  
**Dificuldade esperada:** MÉDIA

```
Operador está logado. Precisa abrir o caixa.

Passos esperados:
1. Procurar onde abre o caixa
2. Clicar em "Abrir Caixa" ou similar
3. Informar valor inicial (ex: R$ 100)
4. Confirmar

Observar:
☐ Onde ele procurou primeiro?
☐ Conseguiu encontrar?
☐ Perguntou qual era o valor?
☐ Havia informação clara sobre valor inicial?
```

**Registrar:**
- Tempo: _____ minutos
- Cliques: _____
- Dúvidas: ______________________________
- Problemas: ______________________________

---

### TAREFA 3: FAZER 20 VENDAS

**Tempo esperado:** 5-10 minutos  
**Dificuldade esperada:** MÉDIA-ALTA

```
Operador deve vender 20 produtos diferentes.

Passos esperados:
1. Clicar em "Nova Venda"
2. Buscar produtos (por nome/código)
3. Adicionar ao carrinho
4. Repetir para 20 itens
5. Finalizar venda
6. Registrar forma de pagamento

Observar:
☐ Conseguiu encontrar "Nova Venda"?
☐ Como buscou produtos (digitou ou clicou)?
☐ Entendeu como adicionar ao carrinho?
☐ Quantos produtos conseguiu vender?
☐ Errou alguma quantidade?
☐ Entendeu o cálculo de total?
☐ Quantas vezes precisou voltar/refazer?

IMPORTANTE: Contar EXATAMENTE:
- Quantos cliques
- Quantos segundos por venda (primeira vs última)
- Quantas vezes disse "não entendi"
```

**Registrar:**
- Tempo total: _____ minutos
- Produtos vendidos: _____/20
- Cliques totais: _____
- Cliques por venda (média): _____
- Primeira venda: _____ cliques
- Última venda: _____ cliques
- Dúvidas específicas: ______________________________
- Erros: ______________________________

---

### TAREFA 4: CANCELAR 5 VENDAS

**Tempo esperado:** 2-3 minutos  
**Dificuldade esperada:** MÉDIA

```
Operador deve cancelar 5 das 20 vendas que fez.

Passos esperados:
1. Procurar onde vê vendas feitas
2. Encontrar vendas para cancelar
3. Clicar em cancelar
4. Confirmar cancelamento
5. Registrar motivo

Observar:
☐ Conseguiu encontrar as vendas?
☐ Entendeu que estava cancelando?
☐ Pediu motivo do cancelamento?
☐ Houve confirmação?
☐ Voltou ao estoque?
```

**Registrar:**
- Tempo: _____ minutos
- Vendas canceladas: _____/5
- Cliques: _____
- Dúvidas: ______________________________
- Problemas: ______________________________

---

### TAREFA 5: FAZER 3 DEVOLUÇÕES

**Tempo esperado:** 3-5 minutos  
**Dificuldade esperada:** ALTA

```
Operador deve fazer 3 devoluções de itens vendidos.

Passos esperados:
1. Procurar onde faz devolução
2. Selecionar a venda
3. Informar qual item devolver e quantidade
4. Informar motivo
5. Confirmar devolução

Observar:
☐ Conseguiu encontrar devolução?
☐ Confundiu com cancelamento de venda?
☐ Entendeu que era parcial?
☐ Registrou motivo?
☐ Estoque voltou?
```

**Registrar:**
- Tempo: _____ minutos
- Devoluções feitas: _____/3
- Cliques: _____
- Confundiu com cancelamento? SIM/NÃO
- Dúvidas: ______________________________
- Problemas: ______________________________

---

### TAREFA 6: FAZER 1 INVENTÁRIO

**Tempo esperado:** 5-10 minutos  
**Dificuldade esperada:** ALTA

```
Operador deve fazer contagem de 10 produtos.

Passos esperados:
1. Procurar onde faz inventário
2. Selecionar produtos
3. Contar quantidade física
4. Registrar no sistema
5. Registrar divergências

Observar:
☐ Conseguiu encontrar inventário?
☐ Entendeu o fluxo?
☐ Registrou quantidade correta?
☐ Entendeu divergência positiva/negativa?
☐ Conseguiu confirmar?
```

**Registrar:**
- Tempo: _____ minutos
- Produtos inventariados: _____/10
- Cliques: _____
- Entendeu divergências? SIM/NÃO
- Dúvidas: ______________________________
- Problemas: ______________________________

---

### TAREFA 7: RECEBER 1 COMPRA

**Tempo esperado:** 5-10 minutos  
**Dificuldade esperada:** ALTA

```
Operador deve receber uma compra do fornecedor.

Passos esperados:
1. Procurar onde recebe compra
2. Selecionar fornecedor
3. Selecionar itens
4. Registrar quantidade recebida
5. Confirmar recebimento
6. Registrar nota fiscal

Observar:
☐ Conseguiu encontrar compra?
☐ Entendeu como selecionar itens?
☐ Digitou quantidade ou usou padrão?
☐ Entendeu que aumentaria estoque?
☐ Registrou nota fiscal?
```

**Registrar:**
- Tempo: _____ minutos
- Compra recebida? SIM/NÃO
- Cliques: _____
- Entendeu parcialmente? SIM/NÃO
- Dúvidas: ______________________________
- Problemas: ______________________________

---

### TAREFA 8: FECHAR CAIXA

**Tempo esperado:** 2-3 minutos  
**Dificuldade esperada:** MÉDIA

```
Operador deve fechar o caixa.

Passos esperados:
1. Procurar onde fecha caixa
2. Informar valor final (dinheiro em mão)
3. Conferência automática
4. Registrar diferença (se houver)
5. Confirmar fechamento

Observar:
☐ Conseguiu encontrar fechar caixa?
☐ Entendeu o que digitar?
☐ Entendeu a conferência?
☐ Havia diferença? Se sim, entendeu?
☐ Conseguiu confirmar?
```

**Registrar:**
- Tempo: _____ minutos
- Caixa fechou? SIM/NÃO
- Cliques: _____
- Houve diferença? _____ (valor)
- Entendeu? SIM/NÃO
- Dúvidas: ______________________________
- Problemas: ______________________________

---

## 📊 OBSERVAÇÕES DURANTE TESTE

### Geral

```
Hora de início: _____
Hora de término: _____
Tempo total: _____ minutos

Quantas vezes disse "não entendi": _____
Quantas vezes precisa de ajuda: _____
Quantas vezes voltou atrás: _____
Quantas vezes clicou errado: _____
```

### Navegação

```
☐ Conseguiu encontrar facilmente os menus?
☐ Os menus fazem sentido?
☐ Havia opções escondidas?
☐ O fluxo era lógico?
☐ Faltavam instruções?
```

### Linguagem

```
☐ Entendeu o que cada botão faz?
☐ Havia termos técnicos confusos?
☐ Faltaram confirmações?
☐ Havia mensagens de erro?
☐ Se havia erro, entendia o que fazer?
```

### Velocidade

```
☐ O sistema respondeu rápido?
☐ Houve travamento?
☐ Houve timeout?
☐ Houve perda de dados?
```

---

## 📋 CLASSIFICAÇÃO DE PROBLEMAS

### UX CRÍTICA (Bloqueia completamente)

Exemplo: Operador não consegue fazer login, ou não encontra como fazer venda.

```
Problema 1: _________________________________________
  - Localização: ________________
  - Impacto: Impossível continuar
  - Sugestão de fix: _________________________________

Problema 2: _________________________________________
  ...
```

### UX ALTA (Atrasa muito)

Exemplo: Operador leva 5 minutos para encontrar como fazer devolução.

```
Problema 1: _________________________________________
  - Localização: ________________
  - Impacto: Trabalho muito lento
  - Sugestão de fix: _________________________________

Problema 2: _________________________________________
  ...
```

### UX MÉDIA (Confunde às vezes)

Exemplo: Operador confunde "Cancelar Venda" com "Devolução".

```
Problema 1: _________________________________________
  - Localização: ________________
  - Impacto: Possível erro operacional
  - Sugestão de fix: _________________________________

Problema 2: _________________________________________
  ...
```

### UX BAIXA (Detalhe menor)

Exemplo: Botão deveria ter mais contraste, ou falta tooltip.

```
Problema 1: _________________________________________
  - Localização: ________________
  - Impacto: Estético/Minor
  - Sugestão de fix: _________________________________

Problema 2: _________________________________________
  ...
```

---

## 📈 MÉTRICAS

### Tempo por Tarefa

| Tarefa | Esperado | Obtido | Desvio |
|--------|----------|--------|--------|
| 1. Login | 30 seg | ___ seg | +/- ___ |
| 2. Abrir Caixa | 1-2 min | ___ min | +/- ___ |
| 3. 20 Vendas | 5-10 min | ___ min | +/- ___ |
| 4. 5 Cancelamentos | 2-3 min | ___ min | +/- ___ |
| 5. 3 Devoluções | 3-5 min | ___ min | +/- ___ |
| 6. 1 Inventário | 5-10 min | ___ min | +/- ___ |
| 7. 1 Compra | 5-10 min | ___ min | +/- ___ |
| 8. Fechar Caixa | 2-3 min | ___ min | +/- ___ |
| **TOTAL** | **25-45 min** | **___ min** | **+/- ___** |

### Taxa de Sucesso

| Tarefa | Esperado | Obtido | Taxa |
|--------|----------|--------|------|
| Login | 1/1 | ___ | __% |
| Abrir Caixa | 1/1 | ___ | __% |
| Vendas | 20/20 | ___ | __% |
| Cancelamentos | 5/5 | ___ | __% |
| Devoluções | 3/3 | ___ | __% |
| Inventário | 10/10 | ___ | __% |
| Compra | 1/1 | ___ | __% |
| Fechar Caixa | 1/1 | ___ | __% |

---

## 🎯 CONCLUSÃO

### Resumo Executivo

```
Operador conseguiu executar todas as tarefas? SIM / NÃO / PARCIAL

Tempo total: _____ minutos (esperado: 25-45)

Problemas críticos encontrados: _____

Recomendações principais:

1. _________________________________________________
2. _________________________________________________
3. _________________________________________________
```

### Próximos Passos

- [ ] Corrigir UX crítica
- [ ] Melhorar UX alta
- [ ] Documentar melhorias UX média
- [ ] Testar novamente com outro operador
- [ ] Validar que correções funcionam

---

## 📝 NOTAS LIVRES DO OBSERVADOR

```
[Espaço para anotar observações gerais, comentários do operador, 
comportamentos inesperados, etc.]

_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________
```

---

**Teste completado em:** _____ de __________ de 2026

**Observador:** _______________________________

**Operador:** _______________________________

---

**Objetivo atingido:** Descobrir o que um operador real não consegue fazer sozinho ✓
