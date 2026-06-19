# Homologação Fase 9 — Log Detalhado de Testes

**Data Início:** 2026-06-18  
**Objetivo:** Validar 100% operacional do motor tributário  
**Escopo:** 18 cenários + snapshot + bloqueios + stress  

---

## PRÉ-REQUISITOS

### Setup Inicial

**Empresa de Teste:**
- CNPJ: 12.345.678/0001-90
- CRT: 3 (Regime Normal)
- CNAE: 4771-3/02
- UF: SP
- Regime: NORMAL

**Caixa Aberto:**
```bash
POST /api/caixa/abrir
Body: { "valorAbertura": 1000 }
Response: { "id": 1, "status": "ABERTO" }
```

---

## TESTE 1: CENÁRIO ARROZ (18% ICMS)

### Setup

**Criar Produto:**
```bash
POST /api/produtos
Body: {
  "codigo": "ARR001",
  "nome": "Arroz Tipo 1 - 5kg",
  "categoria_id": 1,
  "preco_venda": 25.00,
  "ncm_codigo": "10061000",
  "cfop_padrao": "5101",
  "cst_icms": "000",
  "cst_pis": "01",
  "cst_cofins": "07",
  "cst_ipi": "00",
  "aliquota_icms_padrao": 18.0,
  "aliquota_pis_padrao": 1.65,
  "aliquota_cofins_padrao": 7.60,
  "aliquota_ipi_padrao": 0.0,
  "perfil_fiscal": "MERCADO"
}
```

**Resposta Esperada:**
```json
{
  "id": 1,
  "codigo": "ARR001",
  "nome": "Arroz Tipo 1 - 5kg",
  "ncm_codigo": "10061000",
  "preco_venda": 25.00
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

### Venda

**Executar Venda:**
```bash
POST /api/vendas
Body: {
  "itens": [
    {
      "produtoId": 1,
      "quantidade": 1,
      "precoUnitario": 25.00
    }
  ],
  "pagamentos": [
    {
      "forma": "DINHEIRO",
      "valor": 25.00
    }
  ],
  "total_esperado": 25.00
}
```

**Resposta Esperada:**
```json
{
  "id": 1,
  "total": 25.00,
  "caixaId": 1
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

### Validação

**Consultar venda_itens:**
```bash
GET /api/vendas/1
```

**Esperado:**
```json
{
  "venda": { "id": 1, "valor_total": 25.00, "status": "FINALIZADA" },
  "itens": [
    {
      "id": 1,
      "venda_id": 1,
      "produto_id": 1,
      "quantidade": 1,
      "preco_unitario": 25.00,
      "desconto": 0,
      "valor_total": 25.00,
      "ncm_codigo": "10061000",
      "cfop_codigo": "5101",
      "cst_icms": "000",
      "aliquota_icms": 18.0,
      "base_icms": 25.00,
      "valor_icms": 4.50,
      "cst_pis": "01",
      "aliquota_pis": 1.65,
      "valor_pis": 0.41,
      "cst_cofins": "07",
      "aliquota_cofins": 7.60,
      "valor_cofins": 1.90,
      "cst_ipi": "00",
      "aliquota_ipi": 0.0,
      "valor_ipi": 0.00
    }
  ]
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

### Resumo Tributário

**Consultar Resumo:**
```bash
GET /api/vendas/1/resumo-tributario
```

**Esperado:**
```json
{
  "venda_id": 1,
  "valor_total": 25.00,
  "total_icms": 4.50,
  "total_pis": 0.41,
  "total_cofins": 1.90,
  "total_ipi": 0.00,
  "total_tributos": 6.81,
  "percentual_tributos": "27.24",
  "total_itens": 1
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

### NFC-e XML

**Emitir NFC-e:**
```bash
POST /api/fiscal/notas/emitir
Body: {
  "venda_id": 1,
  "simular": "AUTORIZAR"
}
```

**Esperado XML contém:**
```xml
<det nItem="1">
  <produto>Arroz Tipo 1 - 5kg</produto>
  <ncm>10061000</ncm>
  <cfop>5101</cfop>
  <qCom>1</qCom>
  <vUnCom>25.00</vUnCom>
  <vItem>25.00</vItem>
  <icms>
    <cst>000</cst>
    <aliq>18.00</aliq>
    <vBC>25.00</vBC>
    <v>4.50</v>
  </icms>
  <pis>
    <cst>01</cst>
    <aliq>1.65</aliq>
    <v>0.41</v>
  </pis>
  <cofins>
    <cst>07</cst>
    <aliq>7.60</aliq>
    <v>1.90</v>
  </cofins>
</det>
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

### Resultado Final Cenário 1

| Validação | Esperado | Obtido | Status |
|---|---|---|---|
| Produto criado com NCM | ✓ | | ⏳ |
| Venda registrada | ✓ | | ⏳ |
| 26 campos tributários em venda_itens | ✓ | | ⏳ |
| ICMS = 4.50 | 4.50 | | ⏳ |
| PIS = 0.41 | 0.41 | | ⏳ |
| COFINS = 1.90 | 1.90 | | ⏳ |
| IPI = 0.00 | 0.00 | | ⏳ |
| Percentual tributário = 27.24% | 27.24% | | ⏳ |
| XML contém dados corretos | ✓ | | ⏳ |

**STATUS CENÁRIO 1:** ⏳ PENDENTE EXECUÇÃO

**Classificação:** 🟢 VERDE se todos ✓

---

## TESTE 2-6: OUTROS CENÁRIOS

### TESTE 2: REFRIGERANTE (18% ICMS)

**Dados:**
- Código: REFRI01
- NCM: 22021000
- Quantidade: 2 unidades a R$ 10.00 = R$ 20.00
- ICMS Esperado: 3.60
- PIS Esperado: 0.33
- COFINS Esperado: 1.52

**STATUS:** ⏳ PENDENTE EXECUÇÃO

---

### TESTE 3: CERVEJA (18% ICMS)

**Dados:**
- Código: CERV01
- NCM: 22030000
- Quantidade: 6 unidades a R$ 8.50 = R$ 51.00
- ICMS Esperado: 9.18
- PIS Esperado: 0.84
- COFINS Esperado: 3.88

**STATUS:** ⏳ PENDENTE EXECUÇÃO

---

### TESTE 4: MEDICAMENTO (ISENTO)

**Dados:**
- Código: MED001
- NCM: 30019010
- CST ICMS: 100 (isento)
- Quantidade: 1 a R$ 12.50
- Todos Tributos Esperados: 0.00
- Percentual: 0%

**STATUS:** ⏳ PENDENTE EXECUÇÃO

---

### TESTE 5: CIGARRO (25% ICMS)

**Dados:**
- Código: CIG001
- NCM: 24021000
- CST ICMS: 900 (especial)
- Alíquota: 25%
- Quantidade: 1 a R$ 35.00
- ICMS Esperado: 8.75
- Percentual: 40%

**STATUS:** ⏳ PENDENTE EXECUÇÃO

---

### TESTE 6: LIVRO (ISENTO)

**Dados:**
- Código: LIV001
- NCM: 49019900
- CST ICMS: 100
- Quantidade: 1 a R$ 50.00
- Todos Tributos: 0.00

**STATUS:** ⏳ PENDENTE EXECUÇÃO

---

## TESTE 7: SNAPSHOT FISCAL (IMUTABILIDADE)

### Setup

**Venda com Arroz (do Teste 1):**
- vendaId = 1
- produto_id = 1
- ncm_codigo = "10061000"
- valor_icms = 4.50

### Alteração Maliciosa

**Tentar alterar NCM do produto:**
```bash
PUT /api/produtos/1
Body: {
  "ncm_codigo": "99999999"
}
```

**Resposta Esperada:**
```json
{ "id": 1, "ncm_codigo": "99999999" }
```

**Status:** ⏳ PENDENTE EXECUÇÃO

### Validação — Venda Antiga Intacta

**Consultar venda_itens novamente:**
```bash
GET /api/vendas/1
```

**Esperado:**
```json
{
  "itens": [
    {
      "ncm_codigo": "10061000",  // CONTINUA IGUAL, não mudou
      "valor_icms": 4.50          // CONTINUA IGUAL
    }
  ]
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

### Resultado Snapshot

| Validação | Esperado | Obtido | Status |
|---|---|---|---|
| Produto alterado para NCM 99999999 | ✓ | | ⏳ |
| Venda antiga continua com NCM 10061000 | ✓ | | ⏳ |
| Valor ICMS não mudou (4.50) | ✓ | | ⏳ |
| Imutabilidade garantida | ✓ | | ⏳ |

**STATUS SNAPSHOT:** ⏳ PENDENTE EXECUÇÃO

**Classificação:** 🟢 VERDE se todos ✓

---

## TESTE 8: BLOQUEIO — EMPRESA SEM CRT

### Setup

**Remover CRT da empresa:**
```bash
PUT /api/empresa
Body: {
  "crt": null
}
```

### Tentar Emitir NFC-e

**Executar:**
```bash
POST /api/fiscal/notas/emitir
Body: {
  "venda_id": 1
}
```

**Resposta Esperada:**
```json
{
  "status": 400,
  "error": "Empresa sem CRT — configure dados tributários"
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

## TESTE 9: BLOQUEIO — EMPRESA SEM CNPJ

### Setup

**Remover CNPJ da empresa:**
```bash
PUT /api/empresa
Body: {
  "cnpj": null
}
```

### Tentar Emitir NFC-e

**Resposta Esperada:**
```json
{
  "status": 400,
  "error": "Empresa sem CNPJ — configure dados tributários"
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

## TESTE 10: BLOQUEIO — PRODUTO SEM NCM

### Setup

**Criar produto sem NCM:**
```bash
POST /api/produtos
Body: {
  "codigo": "SEMNCM",
  "nome": "Produto Sem NCM",
  "preco_venda": 10.00
  // SEM ncm_codigo
}
```

### Venda com Produto Sem NCM

```bash
POST /api/vendas
Body: {
  "itens": [
    {
      "produtoId": <SEMNCM>,
      "quantidade": 1,
      "precoUnitario": 10.00
    }
  ],
  "pagamentos": [{ "forma": "DINHEIRO", "valor": 10.00 }]
}
```

**Resposta Esperada:** Venda é criada (sem dados tributários)

```bash
GET /api/vendas/:id
```

**Esperado:**
```json
{
  "itens": [
    {
      "ncm_codigo": null,  // NULL porque produto não tem
      "valor_icms": null,  // NULL
      "valor_pis": null
    }
  ]
}
```

### Tentar Emitir NFC-e

```bash
POST /api/fiscal/notas/emitir
Body: { "venda_id": <id> }
```

**Resposta Esperada:**
```json
{
  "status": 400,
  "error": "Produto SEMNCM sem NCM — não pode emitir NFC-e"
}
```

**Status:** ⏳ PENDENTE EXECUÇÃO

---

## TESTE 11: CARGA TRIBUTÁRIA — RESUMO CONSOLIDADO

### Executar Todas as 6 Vendas

Após testes 1-6, consultar resumos:

```bash
GET /api/vendas/1/resumo-tributario  # Arroz
GET /api/vendas/2/resumo-tributario  # Refri
GET /api/vendas/3/resumo-tributario  # Cerveja
GET /api/vendas/4/resumo-tributario  # Medicamento
GET /api/vendas/5/resumo-tributario  # Cigarro
GET /api/vendas/6/resumo-tributario  # Livro
```

### Consolidado

| Venda | Total | ICMS | PIS | COFINS | IPI | Percentual |
|---|---|---|---|---|---|---|
| Arroz | 25.00 | 4.50 | 0.41 | 1.90 | 0.00 | 27.24% |
| Refri | 20.00 | 3.60 | 0.33 | 1.52 | 0.00 | 27.75% |
| Cerveja | 51.00 | 9.18 | 0.84 | 3.88 | 0.00 | 27.06% |
| Medicamento | 12.50 | 0.00 | 0.00 | 0.00 | 0.00 | 0% |
| Cigarro | 35.00 | 8.75 | 0.58 | 2.66 | 0.00 | 40% |
| Livro | 50.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0% |
| **TOTAL** | **193.50** | **26.03** | **2.16** | **9.96** | **0.00** | **20.76%** |

**Status:** ⏳ PENDENTE EXECUÇÃO

---

## TESTE 12: VALIDAÇÃO XML NFC-e

### Para Cada Venda, Verificar XML

**Exemplo Arroz (Venda 1):**
```bash
GET /api/fiscal/notas/1
```

**Esperado — XML contém:**
```
- produto: Arroz Tipo 1 - 5kg
- ncm: 10061000
- cfop: 5101
- cst (icms): 000
- aliq (icms): 18.00
- v (icms): 4.50
- cst (pis): 01
- aliq (pis): 1.65
- v (pis): 0.41
```

**Validação Crítica:**
- ✓ Valores vêm de venda_itens (persistidos)
- ✓ NÃO vêm de cadastro atual do produto
- ✓ Se alterar produto, XML continua igual

**Status:** ⏳ PENDENTE EXECUÇÃO

---

## TESTE 13: STRESS TEST — 100 VENDAS TRIBUTADAS

### Cenário

**Criar 100 vendas com tributação:**
- 20x Arroz
- 20x Refri
- 20x Cerveja
- 20x Medicamento
- 20x Cigarro

**Medir:**
- Tempo total
- Tempo médio por venda
- Erros (se houver)
- Consistência de cálculos

### Execução

```bash
# Loop 100 vendas
for i in {1..100}; do
  POST /api/vendas { item: ARR001, qtd: 1 }
  # Registrar tempo e resposta
done
```

### Resultados Esperados

| Métrica | Esperado | Obtido |
|---|---|---|
| Total vendas criadas | 100 | |
| Tempo total | < 30s | |
| Tempo médio/venda | < 300ms | |
| Erros | 0 | |
| Tributação calculada | 100/100 | |
| Inconsistências | 0 | |

**Status:** ⏳ PENDENTE EXECUÇÃO

---

## TESTE 14: AUDITORIA FISCAL

### Registrar Mudança em Produto

**Alterar alíquota:**
```bash
PUT /api/produtos/1
Body: {
  "aliquota_icms_padrao": 20.0  // 18% → 20%
}
```

### Consultar Auditoria

```bash
GET /api/fiscal-audit?produto_id=1
```

**Esperado:**
```json
{
  "auditoria": [
    {
      "usuario_id": 1,
      "produto_id": 1,
      "campo": ["aliquota_icms_padrao"],
      "valor_antes": "18.0",
      "valor_depois": "20.0",
      "atualizado_em": "2026-06-18T10:30:00"
    }
  ]
}
```

### Detectar Anomalia

```bash
GET /api/fiscal-audit/anomalias
```

**Esperado:**
```json
{
  "total_anomalias": 0,
  "aviso": "✓ Nenhuma anomalia"
}
```

(Aumento de alíquota não é anomalia, redução é)

**Status:** ⏳ PENDENTE EXECUÇÃO

---

## RESUMO TESTES

| # | Teste | Status | Classificação |
|---|---|---|---|
| 1 | Arroz (18%) | ⏳ | ⏳ |
| 2 | Refri (18%) | ⏳ | ⏳ |
| 3 | Cerveja (18%) | ⏳ | ⏳ |
| 4 | Medicamento (0%) | ⏳ | ⏳ |
| 5 | Cigarro (25%) | ⏳ | ⏳ |
| 6 | Livro (0%) | ⏳ | ⏳ |
| 7 | Snapshot Fiscal | ⏳ | ⏳ |
| 8 | Bloqueio CRT | ⏳ | ⏳ |
| 9 | Bloqueio CNPJ | ⏳ | ⏳ |
| 10 | Bloqueio NCM | ⏳ | ⏳ |
| 11 | Resumo Tributário | ⏳ | ⏳ |
| 12 | XML NFC-e | ⏳ | ⏳ |
| 13 | Stress 100 vendas | ⏳ | ⏳ |
| 14 | Auditoria | ⏳ | ⏳ |

**STATUS GLOBAL:** ⏳ PENDENTE EXECUÇÃO

---

**PRÓXIMO PASSO:** Executar cada teste e preencher resultados reais

