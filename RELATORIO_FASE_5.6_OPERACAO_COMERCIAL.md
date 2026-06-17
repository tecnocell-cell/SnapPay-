# 🏬 RELATÓRIO FINAL — Fase 5.6: Operação Comercial Avançada

**Data:** 17 de junho de 2026
**Objetivo:** submeter o SnapPay a simulação pesada de operação comercial real, validar regras de negócio, e mapear o que falta para virar **ERP comercial pronto para implantação** (concorrente de EasySAC, STi3, CISS).
**Escopo respeitado:** sem TEF, Tauri, Self-Checkout, App Cliente ou Fiscal Real. Foco em regras de negócio e operação.

---

## Resultado dos 10 cenários

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Mercado (300+ produtos, 100 vendas, 20 compras, cancel/sangria/suprimento) | ✅ 100% — estoque, kardex, caixa, financeiro e auditoria validados |
| 2 | Padaria (venda por quantidade/peso) | ✅ venda fracionada (0,5 kg) funciona |
| 3 | Produtos por peso (carne/queijo/frutas) | ✅ 0,350 kg × R$39,90 = R$13,96; baixa fracionada correta |
| 4 | Código de barras (EAN-8/13/14 + interno) | ✅ todos cadastram e são achados na busca |
| 5 | Promoções | 📋 especificação funcional (abaixo) |
| 6 | Devoluções | ✅ **IMPLEMENTADO** e validado |
| 7 | Trocas | 📋 especificação (composição de devolução + venda) |
| 8 | Tabelas de preço | 📐 arquitetura proposta (abaixo) |
| 9 | Cliente fidelidade | 📋 especificação (abaixo) |
| 10 | Stress (500 prod, 200 vendas, 50 compras, 50 contas) | ✅ desempenho excelente |

### Desempenho medido (Cenário 10)
- **500 produtos** criados em 3,4 s (6,8 ms/produto)
- **200 vendas** a 8,9 ms em média (máx 12 ms)
- **GET /produtos** com 635 produtos: **25 ms**; relatórios em 4–6 ms
- Tempo total da bateria: **8,3 s** — **0 erros**

> Sem lentidão, sem vazamento aparente, sem consulta lenta. O sistema aguenta o volume de uma loja média com folga.

---

## ✅ Cenário 6 — Devoluções (IMPLEMENTADO)

Fluxo entregue: **Venda → Devolução → Retorno de estoque → Kardex → Auditoria.**

- Endpoint `POST /api/vendas/:id/devolver` — devolução **total ou parcial** (`{ itens:[{produto_id, quantidade}], motivo }`).
- Tabelas `devolucoes` + `devolucao_itens` (migration 10).
- Regras validadas:
  - Só devolve de venda **FINALIZADA**.
  - **Não permite devolver mais que o vendido** (considera devoluções anteriores).
  - Retorna estoque + movimento **`DEVOLUCAO`** no kardex (com saldos).
  - Registra **auditoria** `DEVOLUCAO` com valor e motivo.
- Permissão: `vendas.cancelar`.
- **Pendência:** botão de devolução na tela de Vendas (frontend) — backend pronto.

---

## 📋 Cenário 7 — Trocas (especificação)

Troca = **devolução + nova venda + acerto de diferença**. Com a devolução já implementada, a troca é uma composição:
1. Devolver o(s) item(ns) (`/vendas/:id/devolver`) → gera crédito = valor devolvido.
2. Registrar a venda do novo produto.
3. **Diferença financeira:**
   - Novo > devolvido → cliente paga a diferença (forma de pagamento normal).
   - Novo < devolvido → gera crédito/vale-troca (entidade futura `creditos_cliente`).
4. Auditoria liga as duas operações (`troca_id`).
- **Para implementar depois:** uma rota `POST /api/trocas` que orquestra os dois passos numa transação e registra o vale-troca. Classificação: **ALTO** (regra comum no varejo).

---

## 📋 Cenário 5 — Promoções (especificação funcional)

Tabela proposta `promocoes`: `tipo`, `valor`, `escopo` (produto/categoria/geral), `alvo_id`, `data_inicio`, `data_fim`, `hora_inicio`, `hora_fim`, `dias_semana`, `ativo`.

| Tipo | Regra | Aplicação |
|------|-------|-----------|
| `PERCENTUAL` | % sobre item/categoria | no cálculo do item |
| `LEVE_X_PAGUE_Y` | a cada X unidades, cobra Y | no fechamento do item (qtd) |
| `HORARIO` | desconto válido em faixa de hora/dia (happy hour) | valida `hora_inicio/fim` na venda |
| `CATEGORIA` | desconto para toda uma categoria | aplica a itens da categoria |

Motor: ao montar o carrinho, um "**motor de promoções**" percorre os itens e aplica a melhor regra vigente (precedência configurável). O preço **praticado** é gravado na venda (igual à regra offline já existente). Classificação: **ALTO** (diferencial competitivo forte).

---

## 📐 Cenário 8 — Tabelas de preço (arquitetura)

Hoje o produto tem um único `preco_venda`. Proposta:

```
tabelas_preco        (id, empresa_id, nome, tipo: VAREJO/ATACADO/ESPECIAL, ativo)
tabela_preco_itens   (tabela_id, produto_id, preco)
clientes.tabela_id   (cliente vinculado a uma tabela; default = varejo)
```

- No PDV, ao selecionar o cliente, o preço vem da tabela dele (fallback: `preco_venda` padrão).
- Atacado pode ter regra por **quantidade mínima** (ex.: ≥ 12 un usa preço atacado).
- Migração suave: `preco_venda` continua sendo a tabela "varejo" default. Classificação: **ALTO** (essencial para distribuidora/atacarejo — onde STi3/CISS são fortes).

---

## 📋 Cenário 9 — Cliente fidelidade (especificação)

```
fidelidade_config    (empresa_id, pontos_por_real, valor_ponto, cashback_pct, ativo)
cliente_pontos       (cliente_id, saldo_pontos, saldo_cashback)
fidelidade_lancamentos (cliente_id, venda_id, tipo: GANHO/RESGATE, pontos, valor)
```

- A cada venda com cliente identificado: acumula pontos/cashback.
- Resgate: abate pontos como desconto (vira uma "forma de pagamento" PONTOS).
- Histórico por cliente (já temos `/clientes/:id/historico` de vendas — estender com pontos). Classificação: **MÉDIO** (retém cliente; nem todo concorrente tem).

---

## CLASSIFICAÇÃO FINAL

### 1. Problemas operacionais
| Sev | Item | Status |
|-----|------|--------|
| — | **Nenhum problema operacional novo** nesta bateria pesada | sistema estável |
| 🔵 Baixo | Mensagem de estoque negativo ("disponível: -2") confunde | herdado da 5.5 |
| 🔵 Baixo | Dados de teste acumulados poluem dashboard | usar seed separado |

### 2. Regras de negócio ausentes
| Sev | Regra | Situação |
|-----|-------|----------|
| 🟠 Alto | **Devoluções** | ✅ implementado nesta fase |
| 🟠 Alto | **Trocas** | especificado (depende de devolução, já pronta) |
| 🟠 Alto | **Promoções** (leve X pague Y, %, horário, categoria) | especificado |
| 🟠 Alto | **Tabelas de preço** (varejo/atacado/especial) | arquitetado |
| 🟡 Médio | **Fidelidade** (pontos/cashback) | especificado |
| 🟡 Médio | **Vale-troca / crédito de cliente** | parte das trocas |
| 🟡 Médio | **Venda condicional / orçamento** (salvar carrinho sem finalizar) | não existe |

### 3. Melhorias de UX
| Sev | Item |
|-----|------|
| 🟡 Médio | Botão de **devolução** na tela de Vendas (backend pronto) |
| 🟡 Médio | **Balança**: leitura de etiqueta de peso (código que embute peso) no PDV |
| 🔵 Baixo | Tela de **histórico de devoluções** |
| 🔵 Baixo | Atalho de **venda rápida** por teclado para itens frequentes (padaria) |

### 4. Funcionalidades para competir com EasySAC / STi3 / CISS
| Sev | Funcionalidade | Por quê |
|-----|----------------|---------|
| 🟠 Alto | **Tabelas de preço + atacado por quantidade** | STi3/CISS dominam distribuidora/atacarejo |
| 🟠 Alto | **Promoções configuráveis** | padrão de mercado em supermercado |
| 🟠 Alto | **Fiscal real (NFC-e/SAT)** | obrigatório — arquitetura já pronta (Fase 4); **não iniciar antes desta etapa** ✓ |
| 🟠 Alto | **Balança / produto pesável com etiqueta** | essencial em hortifruti/açougue |
| 🟡 Médio | **Fidelidade / CRM** | EasySAC tem; retém cliente |
| 🟡 Médio | **Sangria/suprimento com motivo obrigatório e relatório** | conferência de caixa robusta |
| 🟡 Médio | **Multi-loja com transferência entre unidades** | rede de lojas |
| 🟡 Médio | **Relatório DRE / curva ABC de produtos** | gestão que CISS oferece |

---

## Conclusão

O SnapPay passou na **bateria comercial pesada sem nenhum problema operacional** e com **desempenho excelente** (500 produtos + 300+ vendas em segundos). As bases comerciais (peso, código de barras, fração, caixa, financeiro, auditoria) estão **sólidas**.

Para virar **ERP comercial pronto para implantação** e competir com EasySAC/STi3/CISS, a prioridade de regras de negócio é:
1. **Tabelas de preço (varejo/atacado)** — 🟠 Alto
2. **Promoções configuráveis** — 🟠 Alto
3. **Trocas** (devolução já pronta) — 🟠 Alto
4. **Balança / produto pesável** — 🟠 Alto
5. **Fidelidade** — 🟡 Médio

E, na sequência, o **Fiscal real** (arquitetura já preparada na Fase 4) — que, conforme instrução, **só deve iniciar após concluir esta etapa**.

**Entregue nesta fase:** Devoluções (implementado + validado), especificações funcionais de promoções/tabelas de preço/fidelidade/trocas, e o diagnóstico classificado acima. Build sem erro.
