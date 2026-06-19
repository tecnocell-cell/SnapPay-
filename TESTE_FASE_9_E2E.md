# Testes E2E Fase 9 — Motor Tributário

**Data:** 2026-06-18  
**Objetivo:** Validar fluxo completo de venda com tributação real  
**Escopo:** 6 cenários obrigatórios

---

## Pré-requisitos

### 1. Empresa Cadastrada
```
CNPJ: 12.345.678/0001-90
CRT: 3 (Normal)
CNAE: 4771-3/02
UF: SP
Regime: NORMAL
```

### 2. Caixa Aberto
```
POST /api/caixa/abrir
Body: { valorAbertura: 500 }
```

---

## Cenários de Teste

### CENÁRIO 1: ARROZ (Normal — 18% ICMS)

**Produto:**
```json
{
  "codigo": "ARR001",
  "nome": "Arroz Tipo 1 - 5kg",
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

**Venda:**
```
POST /api/vendas
Body: {
  "itens": [
    { "produtoId": <ARR001>, "quantidade": 1, "precoUnitario": 25.00 }
  ],
  "pagamentos": [{ "forma": "DINHEIRO", "valor": 25.00 }],
  "total_esperado": 25.00
}
```

**Validações Esperadas:**

| Ponto | Validação | Esperado |
|---|---|---|
| venda_itens.ncm_codigo | Persistido | 10061000 |
| venda_itens.cfop_codigo | Persistido | 5101 |
| venda_itens.cst_icms | Persistido | 000 |
| venda_itens.base_icms | Calculado | 25.00 |
| venda_itens.valor_icms | Calculado | 4.50 |
| venda_itens.valor_pis | Calculado | 0.41 |
| venda_itens.valor_cofins | Calculado | 1.90 |
| venda_itens.valor_ipi | Calculado | 0.00 |
| Resumo tributário | GET /vendas/:id/resumo-tributario | ICMS: 4.50, PIS: 0.41, COFINS: 1.90, IPI: 0.00 |
| NFC-e XML | POST /fiscal/notas/emitir | `<ncm>10061000</ncm><cfop>5101</cfop><icms><cst>000</cst>...` |

**Resultado:** ___________

---

### CENÁRIO 2: REFRIGERANTE (Normal — 18% ICMS)

**Produto:**
```json
{
  "codigo": "REFRI01",
  "nome": "Refrigerante 2L",
  "preco_venda": 10.00,
  "ncm_codigo": "22021000",
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

**Venda:**
```
POST /api/vendas
Body: {
  "itens": [
    { "produtoId": <REFRI01>, "quantidade": 2, "precoUnitario": 10.00 }
  ],
  "pagamentos": [{ "forma": "PIX", "valor": 20.00 }],
  "total_esperado": 20.00
}
```

**Validações Esperadas:**

| Ponto | Validação | Esperado |
|---|---|---|
| quantidade | Persistida | 2 |
| valor_total | Calculado | 20.00 |
| valor_icms | Calculado | 3.60 |
| valor_pis | Calculado | 0.33 |
| valor_cofins | Calculado | 1.52 |
| Forma pagamento | PIX (não abre gaveta) | Sem erro |
| NFC-e | Emitida com tributação | Ok |

**Resultado:** ___________

---

### CENÁRIO 3: CERVEJA (Normal — 18% ICMS)

**Produto:**
```json
{
  "codigo": "CERV01",
  "nome": "Cerveja Premium 350ml",
  "preco_venda": 8.50,
  "ncm_codigo": "22030000",
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

**Venda:**
```
POST /api/vendas
Body: {
  "itens": [
    { "produtoId": <CERV01>, "quantidade": 6, "precoUnitario": 8.50 }
  ],
  "pagamentos": [{ "forma": "CARTAO", "valor": 51.00 }],
  "total_esperado": 51.00
}
```

**Validações Esperadas:**

| Ponto | Validação | Esperado |
|---|---|---|
| quantidade | Persistida | 6 |
| valor_total | Calculado | 51.00 |
| valor_icms | Calculado | 9.18 |
| valor_pis | Calculado | 0.84 |
| valor_cofins | Calculado | 3.88 |
| Forma pagamento | CARTAO (não abre gaveta) | Sem erro |

**Resultado:** ___________

---

### CENÁRIO 4: MEDICAMENTO (Isento — CST 100)

**Produto:**
```json
{
  "codigo": "MED001",
  "nome": "Medicamento Dipirona 500mg",
  "preco_venda": 12.50,
  "ncm_codigo": "30019010",
  "cfop_padrao": "5101",
  "cst_icms": "100",
  "cst_pis": "09",
  "cst_cofins": "09",
  "cst_ipi": "50",
  "aliquota_icms_padrao": 0.0,
  "aliquota_pis_padrao": 0.0,
  "aliquota_cofins_padrao": 0.0,
  "aliquota_ipi_padrao": 0.0,
  "perfil_fiscal": "FARMACIA"
}
```

**Venda:**
```
POST /api/vendas
Body: {
  "itens": [
    { "produtoId": <MED001>, "quantidade": 1, "precoUnitario": 12.50 }
  ],
  "pagamentos": [{ "forma": "DINHEIRO", "valor": 12.50 }],
  "total_esperado": 12.50
}
```

**Validações Esperadas:**

| Ponto | Validação | Esperado |
|---|---|---|
| cst_icms | CST isento | 100 |
| base_icms | Zero (CST 100) | 0.00 |
| valor_icms | Zero | 0.00 |
| valor_pis | Zero | 0.00 |
| valor_cofins | Zero | 0.00 |
| valor_ipi | Zero | 0.00 |
| Total tributos | Resumo | 0.00 |
| Percentual tributário | Calculado | 0% |

**Resultado:** ___________

---

### CENÁRIO 5: CIGARRO (Alíquota Especial — 25% ICMS)

**Produto:**
```json
{
  "codigo": "CIG001",
  "nome": "Cigarro Premium Importado",
  "preco_venda": 35.00,
  "ncm_codigo": "24021000",
  "cfop_padrao": "5101",
  "cst_icms": "900",
  "cst_pis": "01",
  "cst_cofins": "07",
  "cst_ipi": "00",
  "aliquota_icms_padrao": 25.0,
  "aliquota_pis_padrao": 1.65,
  "aliquota_cofins_padrao": 7.60,
  "aliquota_ipi_padrao": 0.0,
  "perfil_fiscal": "CIGARRO"
}
```

**Venda:**
```
POST /api/vendas
Body: {
  "itens": [
    { "produtoId": <CIG001>, "quantidade": 1, "precoUnitario": 35.00 }
  ],
  "pagamentos": [{ "forma": "DINHEIRO", "valor": 35.00 }],
  "total_esperado": 35.00
}
```

**Validações Esperadas:**

| Ponto | Validação | Esperado |
|---|---|---|
| cst_icms | CST especial | 900 |
| aliquota_icms | Aumentada | 25.0 |
| valor_icms | Calculado (25%) | 8.75 |
| valor_pis | Calculado | 0.58 |
| valor_cofins | Calculado | 2.66 |
| Percentual tributário | Total | (8.75 + 0.58 + 2.66) / 35.00 = 40% |

**Resultado:** ___________

---

### CENÁRIO 6: PRODUTO ISENTO (CST 100 — 0% tudo)

**Produto:**
```json
{
  "codigo": "ISO001",
  "nome": "Livro Educativo",
  "preco_venda": 50.00,
  "ncm_codigo": "49019900",
  "cfop_padrao": "5101",
  "cst_icms": "100",
  "cst_pis": "09",
  "cst_cofins": "09",
  "cst_ipi": "00",
  "aliquota_icms_padrao": 0.0,
  "aliquota_pis_padrao": 0.0,
  "aliquota_cofins_padrao": 0.0,
  "aliquota_ipi_padrao": 0.0
}
```

**Venda:**
```
POST /api/vendas
Body: {
  "itens": [
    { "produtoId": <ISO001>, "quantidade": 1, "precoUnitario": 50.00 }
  ],
  "pagamentos": [{ "forma": "DINHEIRO", "valor": 50.00 }],
  "total_esperado": 50.00
}
```

**Validações Esperadas:**

| Ponto | Validação | Esperado |
|---|---|---|
| Todos CST | Isentos | 100, 09, 09, 00 |
| Todos tributos | Zero | 0.00 cada |
| Total tributário | Zero | 0.00 |
| Percentual | Zero | 0% |

**Resultado:** ___________

---

## TESTES DE BLOQUEIO (Validações Negativas)

### Teste 1: Produto Sem NCM — Deve Bloquear NFC-e

**Setup:**
```
POST /api/produtos
{
  "codigo": "SEMNCM",
  "nome": "Produto Sem NCM",
  "preco_venda": 10.00
  // sem ncm_codigo
}
```

**Venda:**
```
POST /api/vendas
{ venda com SEMNCM }
```

**NFC-e:**
```
POST /api/fiscal/notas/emitir
Body: { venda_id: <venda> }
```

**Esperado:** Erro 400 "Produto sem NCM — não pode emitir NFC-e"  
**Resultado:** ___________

---

### Teste 2: Empresa Sem CRT — Deve Bloquear NFC-e

**Setup:**
```
Zerar CRT da empresa (NULL ou vazio)
```

**Venda:**
```
POST /api/vendas
{ venda normal }
```

**NFC-e:**
```
POST /api/fiscal/notas/emitir
```

**Esperado:** Erro 400 "Empresa sem CRT — configure dados tributários"  
**Resultado:** ___________

---

### Teste 3: Empresa Sem CNPJ — Deve Bloquear NFC-e

**Setup:**
```
Zerar CNPJ da empresa
```

**Venda e NFC-e:**
```
Mesma sequência acima
```

**Esperado:** Erro 400 "Empresa sem CNPJ — configure dados tributários"  
**Resultado:** ___________

---

## TESTES DE PERSISTÊNCIA (Snapshot Fiscal)

### Teste 4: Alterar NCM Após Venda Não Altera Snapshot

**Setup:**
```
1. Venda com ARR001 (NCM 10061000) → vendaId = 123
2. GET /api/vendas/123 → confirma NCM 10061000 em venda_itens
3. PUT /api/produtos/ARR001 { ncm_codigo: "99999999" }
4. GET /api/vendas/123 → deve CONTINUAR com 10061000, não mudar
```

**Esperado:** venda_itens.ncm_codigo = 10061000 (imutável)  
**Resultado:** ___________

---

### Teste 5: Alterar Alíquota Após Venda Não Altera Cálculo

**Setup:**
```
1. Venda com CIG001 (25% ICMS) → valor_icms = 8.75
2. PUT /api/produtos/CIG001 { aliquota_icms_padrao: 18.0 }
3. GET /api/vendas/123 → valor_icms deve CONTINUAR 8.75
```

**Esperado:** valor_icms = 8.75 (imutável, snapshot)  
**Resultado:** ___________

---

## TESTES DE NFC-e XML

### Teste 6: XML Mock Contém Dados Tributários Reais

**Setup:**
```
Venda com ARR001
POST /api/fiscal/notas/emitir
GET /api/fiscal/notas/:id
```

**Validar XML:**
```xml
<nfeProc>
  <det nItem="1">
    <produto>Arroz Tipo 1 - 5kg</produto>
    <ncm>10061000</ncm>
    <cfop>5101</cfop>
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
    ...
  </det>
</nfeProc>
```

**Esperado:** 
- NCM, CFOP, CST vêm de venda_itens
- valores ICMS, PIS vêm de venda_itens
- NÃO são recalculados do cadastro atual

**Resultado:** ___________

---

## Resumo Execução

| Cenário | Status | Tempo | Notas |
|---|---|---|---|
| 1. Arroz | ⏳ | | |
| 2. Refrigerante | ⏳ | | |
| 3. Cerveja | ⏳ | | |
| 4. Medicamento | ⏳ | | |
| 5. Cigarro | ⏳ | | |
| 6. Isento | ⏳ | | |
| Bloqueio NCM | ⏳ | | |
| Bloqueio CRT | ⏳ | | |
| Bloqueio CNPJ | ⏳ | | |
| Persistência NCM | ⏳ | | |
| Persistência Alíquota | ⏳ | | |
| XML Tributária | ⏳ | | |

---

## Resultado Final

**Status:** PENDENTE  
**Data Conclusão:** ___________  
**Testador:** ___________  
**Observações:**

___________________________________________________________________________

___________________________________________________________________________

___________________________________________________________________________

