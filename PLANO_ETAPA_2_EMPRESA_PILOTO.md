# 📊 PLANO — ETAPA 2: Empresa Piloto Real

**Duração:** 23 de junho a 29 de junho de 2026 (7 dias)  
**Objetivo:** Validar SnapPay em cenário comercial real com dados genuínos

---

## 🏪 Cenário: SUPERMARKET PILOTO BRASIL

Tipo: Supermercado pequeno/médio (tipo Zona Leste SP)  
Horário: 07:00 - 22:00 (segunda a sábado)  
Caixas: 2 caixas operacionais  
Filiais: Matriz + 1 filial (simulado)

---

## 📋 FASE 1: CADASTROS INICIAIS (23/06 - Dia 1)

### 1.1 Categorias (Reais)

```
├─ 01. MERCEARIA
│  ├─ Arroz/Feijão
│  ├─ Óleo/Azeite
│  ├─ Açúcar/Sal
│  └─ Farinha/Macarrão
│
├─ 02. HIGIENE PESSOAL
│  ├─ Shampoo/Condicionador
│  ├─ Sabonete/Desodorante
│  ├─ Fraldas/Absorventes
│  └─ Escova de dente
│
├─ 03. LIMPEZA
│  ├─ Detergente/Sabão
│  ├─ Desinfetante
│  ├─ Papel Higiênico
│  └─ Pano de Prato
│
├─ 04. BEBIDAS
│  ├─ Refrigerante 2L
│  ├─ Suco Natural
│  ├─ Água Mineral
│  └─ Cerveja
│
├─ 05. ALIMENTOS PERECÍVEIS
│  ├─ Leite
│  ├─ Queijo
│  ├─ Iogurte
│  └─ Manteiga
│
└─ 06. CONGELADOS
   ├─ Carne Vermelha
   ├─ Frango
   ├─ Peixe
   └─ Pizza Congelada
```

**Total: 6 categorias, 24 subcategorias**

### 1.2 Produtos (100-200 reais)

Exemplo de 20 produtos para começar:

| Código | Produto | Categoria | Preço | Estoque |
|--------|---------|-----------|-------|---------|
| P001 | Arroz Integral 5kg | Mercearia | R$ 28.90 | 50 |
| P002 | Feijão Carioca 1kg | Mercearia | R$ 8.50 | 40 |
| P003 | Óleo de Soja 900ml | Mercearia | R$ 5.80 | 60 |
| P004 | Shampoo Neutro 400ml | Higiene | R$ 12.90 | 35 |
| P005 | Detergente 500ml | Limpeza | R$ 2.50 | 100 |
| P006 | Papel Higiênico 4 rolos | Limpeza | R$ 8.90 | 80 |
| P007 | Refrigerante 2L | Bebidas | R$ 6.50 | 70 |
| P008 | Água Mineral 1,5L | Bebidas | R$ 1.99 | 150 |
| P009 | Leite Integral 1L | Perecível | R$ 4.50 | 45 |
| P010 | Queijo Meia Cura 500g | Perecível | R$ 22.90 | 20 |
| P011 | Carne Vermelha 1kg | Congelado | R$ 45.90 | 30 |
| P012 | Frango Inteiro 1,5kg | Congelado | R$ 18.90 | 25 |
| P013 | Açúcar 1kg | Mercearia | R$ 4.20 | 50 |
| P014 | Sal 1kg | Mercearia | R$ 2.80 | 40 |
| P015 | Macarrão Integral 500g | Mercearia | R$ 3.90 | 60 |
| P016 | Sabonete Barra 200g | Higiene | R$ 3.50 | 80 |
| P017 | Desodorante Aerossol | Higiene | R$ 14.90 | 30 |
| P018 | Fraldas Infantis Pacote | Higiene | R$ 35.90 | 15 |
| P019 | Desinfetante 1L | Limpeza | R$ 4.90 | 50 |
| P020 | Iogurte Natural 500g | Perecível | R$ 6.80 | 35 |

**Ação: Cadastrar 100-200 produtos com dados reais**

### 1.3 Fornecedores (5-10 reais)

| Nome | CNPJ | Categoria | Contato | Prazo |
|------|------|-----------|---------|-------|
| Distribuidora ABC | 12.345.678/0001-90 | Mercearia | (11) 3456-7890 | 30 dias |
| Higiene Plus | 98.765.432/0001-10 | Higiene | (11) 9876-5432 | 15 dias |
| Limpeza Total | 55.555.555/0001-99 | Limpeza | (11) 2222-3333 | 20 dias |
| Bebidas Brasil | 11.111.111/0001-11 | Bebidas | (11) 4444-5555 | 30 dias |
| Lacticínios São Paulo | 22.222.222/0001-22 | Perecível | (11) 6666-7777 | 7 dias |
| Carnes Premium | 33.333.333/0001-33 | Congelado | (11) 8888-9999 | 5 dias |

### 1.4 Clientes (30-50 reais)

Tipos:
- **20x PF (CPF)** — Clientes varejo
- **15x PJ (CNPJ)** — Pequenos negócios, restaurantes, bares
- **5x VIP** — Com limite de crédito e tabela de preço especial

Exemplo:

| Nome | Tipo | CPF/CNPJ | Limite Crédito | Tabela Preço |
|------|------|----------|---|---|
| João Silva | PF | 123.456.789-00 | R$ 500 | VAREJO |
| Maria Santos | PF | 987.654.321-00 | R$ 300 | VAREJO |
| Bar do Zé | PJ | 12.345.678/0001-90 | R$ 2.000 | ATACADO |
| Restaurante Casa Nova | PJ | 98.765.432/0001-10 | R$ 5.000 | ATACADO |
| Supermercadinho Local | PJ | 55.555.555/0001-99 | R$ 10.000 | ESPECIAL |

---

## 💼 FASE 2: OPERAÇÃO (24/06 - 29/06, 6 dias)

### Dia 1 (24/06) — Operação Padrão

**Operações esperadas:**
- 2 caixas × 8h = 16h operacionais
- ~50-100 transações por dia
- 3-5 compras (recebimento)
- 1-2 devoluções
- 1 inventário (verificação de estoque)

**Tarefas:**
- [ ] Abertura de caixa (ambos caixas)
- [ ] 50-100 vendas variadas (mix de clientes PF/PJ)
- [ ] 3-5 compras com recebimento
- [ ] 2 sangrias (retirada de dinheiro)
- [ ] Fechamento de caixa (conferência)
- [ ] Registrar qualquer problema

### Dia 2 (25/06) — Promo + Desconto

**Promoções criadas:**
- 10% desconto em mercearia (segunda de manhã)
- Leve 3 Pague 2 em higiene pessoal
- Preço especial para cliente VIP (restaurante)

**Tarefas:**
- [ ] Aplicar promoções no sistema
- [ ] Executar ~80 vendas com promoções
- [ ] Validar descontos aplicados
- [ ] Verificar se estoque baixa por promo

### Dia 3 (26/06) — Operação Atacado + Filial

**Operações:**
- Venda para cliente PJ (restaurante) — 20+ itens
- Transferência entre lojas (matriz → filial)
- Venda na filial

**Tarefas:**
- [ ] Venda atacado de 20+ itens
- [ ] Aplicar tabela de preço atacado
- [ ] Transferir 30 unidades de produto para filial
- [ ] Fazer venda na filial
- [ ] Validar estoque por loja

### Dia 4 (27/06) — Devoluções + Offline

**Operações:**
- 3-5 devoluções (clientes reclamam)
- Venda offline (simular queda de internet)
- Sincronização

**Tarefas:**
- [ ] Processar devoluções (reajustar estoque)
- [ ] Registrar motivos
- [ ] Desativar internet
- [ ] Fazer 10 vendas offline
- [ ] Reativar internet
- [ ] Sincronizar vendas

### Dia 5 (28/06) — Inventário Real

**Operação:**
- Contagem física de 50 produtos
- Registrar divergências
- Ajustar no sistema

**Tarefas:**
- [ ] Contar 50 produtos
- [ ] Comparar com sistema
- [ ] Registrar perdas/achados
- [ ] Fazer ajuste no inventário
- [ ] Analisar quais produtos têm maior divergência

### Dia 6 (29/06) — Operação Final + Análise

**Operações:**
- Operação normal
- Análise de dados
- Preparar relatório

**Tarefas:**
- [ ] Executar ~80 vendas
- [ ] Análise de vendas por categoria
- [ ] Análise de vendas por cliente
- [ ] Análise de estoque
- [ ] Geração de relatórios

---

## 🔍 AUDITORIA

### Validações

- [ ] **Todas as vendas registradas** — Não deve haver venda sem registro
- [ ] **Estoque consistente** — Venda baixa estoque, compra aumenta
- [ ] **Caixa fecha** — Dinheiro entrado = dinheiro saído + saldo
- [ ] **Clientes com crédito** — Não vender além do limite
- [ ] **Todos os usuários registrados** — Quem fez cada operação
- [ ] **Histórico de devoluções** — Rastreabilidade completa
- [ ] **Logs de sincronização** — Vendas offline sincronizadas
- [ ] **Preços aplicados corretamente** — Varejo vs Atacado vs Promoção

### Queries para validar

```sql
-- Total de vendas
SELECT COUNT(*) FROM vendas;

-- Vendas por cliente
SELECT cliente_id, COUNT(*), SUM(valor_total) 
FROM vendas GROUP BY cliente_id;

-- Estoque negativo (nunca deve existir)
SELECT produto_id, estoque_atual 
FROM produtos WHERE estoque_atual < 0;

-- Devoluções
SELECT COUNT(*) FROM devolucoes;

-- Auditoria (todas as operações)
SELECT tipo, COUNT(*) FROM auditoria GROUP BY tipo;

-- Caixa (aberto + fechado)
SELECT status, COUNT(*) FROM caixas GROUP BY status;
```

---

## 🏪 MULTI-LOJA

### Configuração

**Matriz:**
- ID: 1
- Nome: "Supermarket Piloto - Matriz"
- Gerente: Admin

**Filial:**
- ID: 2
- Nome: "Supermarket Piloto - Filial"
- Gerente: Operador 2

### Operações

1. **Transferência de estoque**
   - [ ] Transferir 30 un de Arroz (P001) Matriz → Filial
   - [ ] Validar baixa na Matriz
   - [ ] Validar entrada na Filial
   - [ ] Registrar no kardex

2. **Venda na Filial**
   - [ ] Fazer 20-30 vendas na filial
   - [ ] Verificar se estoque da filial baixa
   - [ ] Verificar se estoque global também baixa

3. **Relatório por Loja**
   - [ ] Total vendido Matriz
   - [ ] Total vendido Filial
   - [ ] Estoque por loja

---

## 🔄 OFFLINE FIRST

### Cenário

**Dia 27/06 — 14:00 a 15:00**

1. **Online (antes)**
   - [ ] 10 vendas normais
   - [ ] Sistema respondendo

2. **Offline (simular)**
   - [ ] Desligar internet
   - [ ] Sistema continua em modo local
   - [ ] 10 vendas armazenadas localmente
   - [ ] Listar vendas pendentes

3. **Sync (depois)**
   - [ ] Religar internet
   - [ ] Sincronizar automaticamente
   - [ ] Validar que 10 vendas foram para servidor
   - [ ] Validar estoque atualizado

---

## 📊 ENTREGA

### Relatório: RELATORIO_EMPRESA_PILOTO.md

Deve conter:

1. **Dados Cadastrados**
   - Total de produtos
   - Total de fornecedores
   - Total de clientes
   - Total de categorias

2. **Operações Executadas**
   - Total de vendas
   - Valor total vendido
   - Vendas por dia
   - Ticket médio
   - Vendas por cliente (top 10)
   - Vendas por categoria (top 5)

3. **Auditoria**
   - Todos os eventos registrados ✓
   - Nenhuma venda sem registro ✓
   - Caixa sempre fechado ✓
   - Estoque nunca negativo ✓
   - Crédito respeitado ✓

4. **Multi-loja**
   - Transferências realizadas
   - Vendas por loja
   - Estoque por loja

5. **Offline**
   - Vendas offline criadas
   - Sincronização bem-sucedida
   - Dados consistentes pós-sync

6. **Problemas Operacionais** (Críticos/Altos)
   - Enumerar cada problema encontrado
   - Passos para reproduzir
   - Impacto no negócio

7. **Melhorias UX**
   - O que faltou no interface
   - O que foi confuso
   - O que poderia ser mais rápido

8. **Melhorias Comerciais**
   - Funcionalidades ausentes
   - Fluxos que não existem
   - Necessidades não atendidas

9. **Melhorias Fiscais**
   - Documentação não gerada
   - Cálculos que faltam
   - Validações ausentes

10. **Classificação Final**
    - Pronto para produção? SIM/NÃO
    - Se não, o que falta?
    - Plano de correção

---

## ✅ Checklist Diário

Cada dia, responder:

- [ ] Aplicação rodou sem crashes?
- [ ] Nenhuma perda de dados?
- [ ] Performance aceitável?
- [ ] Logs sendo gerados?
- [ ] Backup feito?
- [ ] Nenhuma inconsistência de estoque?
- [ ] Caixa fechou?
- [ ] Nenhum erro de permissão?

---

## 📅 Timeline

| Data | Atividade | Responsável |
|------|-----------|-------------|
| 23/06 | Cadastros iniciais | — |
| 24/06 | Dia 1 operação | — |
| 25/06 | Dia 2 com promoções | — |
| 26/06 | Dia 3 atacado + filial | — |
| 27/06 | Dia 4 devoluções + offline | — |
| 28/06 | Dia 5 inventário | — |
| 29/06 | Dia 6 análise final | — |

---

**Objetivo:** Validar que SnapPay aguenta operação real, com dados genuínos, por dias consecutivos, sem problemas.
