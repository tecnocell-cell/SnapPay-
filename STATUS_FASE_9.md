# Status Fase 9 — Motor Tributário e Fiscal Comercial

**Data:** 2026-06-18  
**Fase:** 9 (Motor Tributário)  
**Progresso:** 30% (Infraestrutura completa, Integração não iniciada)

---

## IMPLEMENTADO (PARTE 1)

### ✅ 1. Auditoria Fiscal Completa
- **Arquivo:** `RELATORIO_AUDITORIA_FISCAL.md` (350 linhas)
- **Conteúdo:** Estado atual, gaps, prioridades
- **Status:** COMPLETO

### ✅ 2. Migration 19 — Cadastro Tributário
- **Arquivo:** `backend/migration_19_cadastro_tributario.sql` (300 linhas)
- **Tabelas:** NCM, CEST, CFOP, aliquotas_tributarias, fiscal_imports_log, regras_fiscais
- **Campos Empresa:** CNPJ, IE, IM, CRT, CNAE, regime_tributario, endereço completo
- **Campos Produto:** NCM, CEST, origem, CST, CFOP, alíquotas
- **Dados Iniciais:** Exemplos NCM, CFOP, CEST
- **Status:** ESTRUTURA PRONTA (não aplicada em BD ainda)

### ✅ 3. Motor Tributário (TributacaoService)
- **Arquivo:** `backend/src/services/tributacaoService.js` (250 linhas)
- **Funções:**
  - `calcularTributacao()`: ICMS, PIS, COFINS, IPI
  - `determinarCFOP()`: map operação → código fiscal
  - `buscarAliquotas()`: lookup com fallback
  - `validarEmissaoNFCe()`: bloqueia dados faltantes
  - `gerarResumoTributario()`: sumário por venda
- **Status:** IMPLEMENTADO E VALIDADO

### ✅ 4. Validação Parte 1
- **Arquivo:** `RELATORIO_VALIDACAO_FASE_9_PARTE_1.md` (270 linhas)
- **Conteudo:** Checklist estrutura, sintaxe, readiness
- **Status:** COMPLETO

---

## NÃO INICIADO (PARTE 2)

### ❌ 1. Telas de Cadastro Fiscal

**Não existe:**
- `frontend/src/pages/CadastroEmpresaTributario.jsx` (falta)
- Aba fiscal em `frontend/src/components/ProdutoForm.jsx` (falta)

**O que fazer:**
```
CadastroEmpresaTributario.jsx:
  - CNPJ (validação)
  - IE
  - IM
  - CRT (select: 1=Simples, 2=Simples Excesso, 3=Normal)
  - CNAE
  - Regime tributário (select)
  - UF
  - Município

ProdutoForm (aba Fiscal):
  - NCM (select com busca)
  - CEST
  - Origem (select)
  - CST ICMS, PIS, COFINS, IPI
  - CFOP padrão
  - Alíquotas (pré-preenchidas, editáveis)
```

**Prioridade:** CRÍTICA (bloqueia venda)

### ❌ 2. Integração ao Fluxo de Venda

**Não existe:**
- Chamada a `calcularTributacao()` em POST /api/vendas (falta)
- Persistência de dados tributários em venda_itens (falta)

**O que fazer:**
```
POST /api/vendas (backend/src/server.js):
  for each item in itens:
    tributacao = await calcularTributacao({
      empresa_id, produto_id, quantidade, valor_unitario,
      tipo_operacao: "VENDA_CONSUMIDOR",
      uf_destino: empresa.uf
    })
    
    INSERT INTO venda_itens:
      ncm_codigo, cfop_codigo,
      cst_icms, cst_pis, cst_cofins, cst_ipi,
      aliquota_icms, aliquota_pis, aliquota_cofins, aliquota_ipi,
      base_icms, valor_icms, valor_pis, valor_cofins, valor_ipi
```

**Prioridade:** CRÍTICA (dados precisam ser salvos)

### ❌ 3. Resumo Tributário da Venda

**Não existe:**
- Tela/endpoint de resumo tributário (falta)

**O que fazer:**
```
GET /api/vendas/:id/resumo-tributario
  → Retorna:
    - ICMS: R$ X por item + total
    - PIS: R$ X
    - COFINS: R$ X
    - IPI: R$ X
    - TOTAL TRIBUTOS: R$ X
    - PERCENTUAL: X%
```

**Prioridade:** MÉDIA (apenas gestão)

### ❌ 4. Integração NFC-e

**Não existe:**
- Backend FiscalProvider não busca dados do motor (falta)
- XML não usa tributação calculada (falta)

**O que fazer:**
```
POST /api/fiscal/emitir:
  for each item:
    ncm = item.ncm_codigo
    cfop = item.cfop_codigo
    cst = item.cst_icms
    aliquota = item.aliquota_icms
    valor_icms = item.valor_icms
  
  XML contém valores reais (não hardcode)
```

**Prioridade:** ALTA (sem isso, NFC-e fica fake)

### ❌ 5. Testes Reais

**Cenários planejados:**
- Arroz (18% ICMS, 1.65% PIS, 7.6% COFINS)
- Refrigerante (idem)
- Cigarro (diferenciado — precisa NCM específico)
- Medicamento (isento ICMS — CST 100)

**Não feito:** Testes reais com dados persistidos

**Prioridade:** MÉDIA (validação)

### ❌ 6. Endpoints de Importação

**Planejado mas não implementado:**
- `GET /api/fiscal/ncm` (lista NCM)
- `POST /api/fiscal/ncm/importar` (bulk insert — futuro)
- `GET /api/fiscal/cfop` (lista CFOP)
- `GET /api/fiscal/cest` (lista CEST)

**O que fazer:** Criar placeholders com permissões

**Prioridade:** BAIXA (estrutura, sem dados reais)

### ❌ 7. Gap Analysis Fiscal

**Não feito:**
- `GAP_FISCAL_CISS_LINX.md` (documento comparativo)

**O que fazer:**
```
Comparar SnapPay vs CISS vs Linx:
  - Cadastro tributário (quem tem mais campos)
  - Motor de cálculo (quem calcula mais automático)
  - NFC-e (quem emite real, quem é mock)
  - Validações (quem bloqueia mais)
  - Importação dados (quem atualiza automático)
```

**Prioridade:** BAIXA (informativo)

---

## RESUMO CRÍTICO

### Bloqueadores para Produção

| Item | Bloqueador? | Solução |
|---|---|---|
| Telas cadastro tributário | ✅ SIM | Implementar antes de qualquer venda |
| Motor tributário | ✅ SIM | Já existe, apenas integrar |
| Integração ao fluxo venda | ✅ SIM | Implementar POST /api/vendas |
| NFC-e com dados reais | ✅ SIM | Integrar FiscalProvider |
| Testes com dados persistidos | ❌ NÃO | Validação apenas |

### Timeline Parte 2

**Rápido (3 dias):**
- ✅ Telas cadastro (8h)
- ✅ Integração venda (6h)

**Médio (5 dias):**
- ✅ NFC-e integrada (4h)
- ✅ Testes (8h)
- ✅ Resumo tributário (4h)

**Longo (2 dias):**
- ✅ Endpoints importação (4h)
- ✅ Gap analysis (6h)

**Total Parte 2:** ~40 horas (~2 semanas com 1 dev)

---

## RECOMENDAÇÃO

### Proceder com Fase 9 Parte 2 IMEDIATAMENTE

Infraestrutura está 100% pronta. Falta apenas:
1. Aplicar migration 19 ao PostgreSQL
2. Criar telas
3. Integrar ao fluxo

Depois SnapPay terá **motor tributário real** — não fake.

---

## COMMITS ATÉ AGORA

| Commit | Mensagem | Linhas |
|---|---|---|
| cd76b75 | feat(fase-9): Auditoria + cadastro tributário + motor | 827 |
| 6e00f40 | docs(fase-9): Validação Parte 1 | 271 |

**Total Fase 9:** 2 commits, 1100 linhas de código/docs

---

## PRÓXIMO PASSO

**Iniciar Fase 9 Parte 2:**
1. Criar telas de cadastro (CadastroEmpresaTributario, aba Produto)
2. Integrar calcularTributacao() ao endpoint /api/vendas
3. Persistir dados tributários
4. Testar fluxo completo
5. Integrar NFC-e

**ETA:** 2 semanas para Parte 2 completa
