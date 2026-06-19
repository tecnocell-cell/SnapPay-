# Auditoria Fiscal Completa — SnapPay

**Data:** 2026-06-18  
**Status:** ✅ AUDITORIA COMPLETA  
**Objetivo:** Validar estrutura fiscal existente e identificar gaps para Fase 9

---

## 1. ESTRUTURA EXISTENTE

### 1.1 Banco de Dados (PostgreSQL)

#### Tabelas Criadas

| Tabela | Columns | Status |
|---|---|---|
| `fiscal_configuracoes` | empresa_id, provider, ambiente, modelo, serie, numero_atual, csc, regime_tributario, uf, ativo | ✅ |
| `fiscal_notas` | id, empresa_id, numero, serie, chave, status, modelo, cliente_id, total, data_emissao | ✅ |
| `fiscal_itens` | id, nota_id, produto_id, descricao, ncm, quantidade, valor_unitario, valor_total | ❌ (vazio) |
| `fiscal_eventos` | id, nota_id, tipo, status_resultante, mensagem, payload, criado_em | ✅ |
| `eventos_fiscais_pendentes` | id, nota_id, tipo, status, tentativas, ultima_tentativa | ✅ (Fase 8) |

**Análise:**
- ✅ Configurações básicas presentes
- ✅ Notas e eventos criados
- ❌ Itens fiscais desconectado de notas

#### Migrations

| Migration | Status | Linhas |
|---|---|---|
| `migration_08_fiscal.sql` | ✅ | ~80 |
| `migration_17_devolucao_fiscal.sql` | ✅ | ~40 |
| `migration_18_terminal_pdv.sql` | ✅ | ~50 |

### 1.2 Backend (Node.js)

#### Routes

**Arquivo:** `backend/src/routes/fiscal.js` (~250 linhas)

| Endpoint | Método | Autenticação | Status |
|---|---|---|---|
| `/api/fiscal/providers` | GET | ✅ | ✅ Lista providers |
| `/api/fiscal/configuracoes` | GET | ✅ | ✅ Retorna config |
| `/api/fiscal/configuracoes` | PUT | ✅ | ✅ Atualiza config |
| `/api/fiscal/configuracoes/validar` | GET | ✅ | ✅ Valida provider |
| `/api/fiscal/notas` | GET | ✅ | ✅ Lista notas |
| `/api/fiscal/emitir` | POST | ✅ | ✅ Emite nota |
| `/api/fiscal/pendentes` | GET | ✅ | ✅ (Fase 8) |
| `/api/fiscal/reprocessar/:notaId` | POST | ✅ | ✅ (Fase 8) |
| `/api/fiscal/eventos/:eventoId/autorizar` | PUT | ✅ | ✅ (Fase 8) |

#### Fiscal Module

**Arquivo:** `backend/src/fiscal/index.js` (abstração de provider)

```javascript
// Suporta providers:
PROVIDERS_DISPONIVEIS = [
  { nome: "MOCK", descricao: "Simulador para testes" },
  { nome: "FOCUS", descricao: "Focus NFe (integração real)" }
]

// Métodos abstratos:
- validarConfiguracao()
- emitirNota(xml)
- consultarNota(chave)
- cancelarNota(chave)
```

**Status:**
- ✅ Abstração criada
- ✅ MockProvider funcional
- ⚠️ FocusProvider estruturado (não integrado ainda)

#### Models

**Não há models explícitos** — SQL direto em routes (anti-pattern, mas funciona).

### 1.3 Frontend

**Arquivo:** `frontend/src/pages/FiscalConfig.jsx` (~150 linhas)

| Funcionalidade | Status |
|---|---|
| Seleção de provider | ✅ |
| Campos de configuração | ✅ |
| Validação provider | ✅ |
| Teste emissão | ❌ (não implementado) |

---

## 2. O QUE JÁ FUNCIONA

### 2.1 Infraestrutura Base

✅ **Configuração Fiscal**
- Seleção de provider (MOCK, FOCUS)
- Armazenamento de credenciais
- Validação básica

✅ **Notas Fiscais**
- Criação de nota
- Armazenamento
- Histórico

✅ **Eventos Fiscais**
- Rastreamento de operações
- Contingência (Fase 8)
- Reprocessamento manual (Fase 8)

✅ **Provider Abstrato**
- Interface MockProvider
- Placeholder FocusProvider

### 2.2 Integração com Vendas

✅ **Devolução com NFC-e** (Fase 8)
- Detecta NFC-e AUTORIZADA
- Cria evento DEVOLUCAO_PENDENTE
- Bloqueia devolução silenciosa

✅ **Auditoria**
- Registra operações fiscais
- Rastreia mudanças

### 2.3 Contingência

✅ **Offline Fiscal**
- Status: CONTINGENCIA_PENDENTE
- Reprocessamento manual
- Auditoria de tentativas

---

## 3. O QUE É MOCK

### 3.1 MockProvider

**Status:** ✅ Funcional para testes

```javascript
// Simula emissão
async emitirNota(xml) {
  return {
    chave: "gerada-fake",
    numero: Math.random(),
    protocolo: "fake-protocolo"
  };
}
```

**Limitação:** Não gera XML real, não valida contra Sefaz.

### 3.2 NFC-e Emitida

**Atualmente:**
```
POST /api/fiscal/emitir
└─ Usa MockProvider (sempre sucesso)
└─ Retorna XML fake
└─ Status = AUTORIZADO (sem validação Sefaz)
```

**Problema:** Nenhuma validação tributária. XML é string vazia.

---

## 4. O QUE ESTÁ INCOMPLETO

### 4.1 Cadastro Tributário da Empresa

❌ **Faltam:**
- CNPJ da empresa
- IE (Inscrição Estadual)
- IM (Inscrição Municipal)
- CRT (Código Regime Tributário)
- CNAE (Classificação Nacional)
- CEP/Endereço completo

**Impacto:** XML de NFC-e sem dados obrigatórios.

### 4.2 Cadastro Fiscal de Produtos

❌ **Faltam:**
- NCM (Nomenclatura Comum Mercosul)
- CEST (Código Especificação Substituição Tributária)
- Origem Mercadoria
- CST ICMS (Código Situação Tributária)
- CST PIS
- CST COFINS
- CST IPI
- CFOP (Código Fiscal Operação)
- Unidade Fiscal (UN)

**Impacto:** Produto sem tributação — NFC-e não pode emitir.

### 4.3 Tabelas de Referência

❌ **Faltam:**
- Tabela NCM (1000+ valores)
- Tabela CEST (~600 valores)
- Tabela CFOP (200+ valores)
- Tabela Alíquotas por estado

**Impacto:** Sem base de dados, impossível calcular tributação.

### 4.4 Motor Tributário

❌ **Não existe:**
- Serviço de cálculo de tributos
- Regras por regime tributário
- Regras por operação (venda, devolução, transferência)
- Cálculo de ICMS, PIS, COFINS, IPI

**Impacto:** NFC-e não calcula tributos — usa valores hardcoded.

### 4.5 XML Real de NFC-e

❌ **Não implementado:**
- Geração real de XML conforme leiaute Sefaz
- Validação contra XSD
- Assinatura com certificado
- Envio real para Sefaz

**Impacto:** Todas NFC-e emitidas atualmente são fake.

### 4.6 Validações

❌ **Faltam:**
- Bloquear se empresa sem CNPJ
- Bloquear se empresa sem CRT
- Bloquear se produto sem NCM
- Bloquear se produto sem tributação mínima

**Impacto:** Sistema permite emitir notas inválidas.

---

## 5. CHECKLIST FISCAL

| Item | Status | Crítico? |
|---|---|---|
| Configuração provider | ✅ | ❌ |
| Nota base | ✅ | ❌ |
| Eventos fiscais | ✅ | ❌ |
| MockProvider | ✅ | ❌ |
| **CNPJ empresa** | ❌ | ✅ |
| **CRT empresa** | ❌ | ✅ |
| **NCM produto** | ❌ | ✅ |
| **Motor tributário** | ❌ | ✅ |
| **XML real** | ❌ | ✅ |
| **Certificado digital** | ❌ | ✅ |
| **Envio Sefaz** | ❌ | ✅ |

---

## 6. PRÓXIMAS AÇÕES (FASE 9)

### Ordem de Implementação

1. **Cadastro Tributário Empresa** (1 semana)
   - Migração: adicionar CNPJ, IE, IM, CRT, CNAE
   - Tela: FiscalEmpresa.jsx
   - Validações obrigatórias

2. **Cadastro Fiscal Produtos** (2 semanas)
   - Migração: adicionar NCM, CEST, CST, CFOP
   - Tela: editar produto com aba fiscal
   - Importador NCM (estrutura, sem dados ainda)

3. **Tabelas Fiscais** (2 semanas)
   - Criar tabelas: ncm, cest, cfop, aliquotas
   - Importador (estrutura)
   - Sem dados reais (futuro)

4. **Motor Tributário** (3 semanas)
   - Service: tributacaoService.js
   - Calcular ICMS, PIS, COFINS, IPI
   - Regras básicas: venda, devolução, compra

5. **Integração NFC-e** (2 semanas)
   - NFC-e busca tributação de tributacaoService
   - Gera XML real (estrutura)
   - Assina (mock, sem certificado real)

6. **Validações** (1 semana)
   - Bloquear emissão se dados faltam
   - Mensagens claras

---

## 7. ESTIMATIVA FASE 9

| Tarefa | Horas | Timeline |
|---|---|---|
| Auditoria (esta) | 4 | ✅ Feito |
| Cadastro Tributário | 20 | 1 semana |
| Cadastro Fiscal Produtos | 30 | 2 semanas |
| Tabelas Fiscais | 25 | 1.5 semanas |
| Motor Tributário | 40 | 2.5 semanas |
| Integração NFC-e | 30 | 2 semanas |
| Validações | 15 | 1 semana |
| Testes | 20 | 1 semana |
| **TOTAL** | **184 horas** | **~11 semanas** |

---

## 8. CONCLUSÃO

### Status

✅ **Base fiscal estruturada** — infraestrutura existe  
❌ **Cadastros incompletos** — faltam dados tributários  
❌ **Motor tributário ausente** — sem cálculo de tributos  
❌ **XML real não existe** — tudo é MOCK  

### Bloqueadores para Produção

1. Cadastro tributário completo (empresa + produto)
2. Motor tributário funcional
3. XML real + Sefaz integration (futuro, não Fase 9)
4. Certificado digital (futuro)

### Readiness para Fase 9

✅ **Sim, pronto para:**
- Implementar cadastros tributários
- Criar motor tributário inicial
- Estruturar tabelas fiscais
- Gerar XML estruturado (sem Sefaz real)

---

**Recomendação:** Iniciar Fase 9 imediatamente. Arquitetura base é sólida, faltam dados e motor de cálculo.

**Próximo passo:** Implementar Cadastro Tributário da Empresa (CNPJ, IE, IM, CRT, CNAE).
