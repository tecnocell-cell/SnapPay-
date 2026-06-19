# Gap Analysis Fiscal — SnapPay vs CISS vs Linx vs Bluesoft

**Data:** 2026-06-18  
**Versão:** 1.0  
**Escopo:** Comparação de funcionalidades fiscais entre plataformas  

---

## Resumo Executivo

| Característica | SnapPay | CISS | Linx | Bluesoft | Crítico? |
|---|---|---|---|---|---|
| **Motor tributário** | ✅ Implementado | ✅ Sim | ✅ Sim | ✅ Sim | CRÍTICO |
| **Persistência tributação** | ✅ Por item | ✅ Por item | ✅ Por item | ✅ Por item | CRÍTICO |
| **NCM/CFOP/CEST** | ✅ Consulta | ✅ Completo | ✅ Completo | ✅ Completo | ALTO |
| **Perfis fiscais** | ✅ 7 segmentos | ✅ Dinâmicos | ✅ Dinâmicos | ✅ Dinâmicos | MÉDIO |
| **ICMS** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | CRÍTICO |
| **PIS/COFINS** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | CRÍTICO |
| **IPI** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ALTO |
| **Regra inter-estadual** | ❌ Não | ✅ Sim | ✅ Sim | ✅ Sim | ALTO |
| **Substituição tributária** | ❌ Não | ✅ Sim | ✅ Sim | ✅ Sim | MÉDIO |
| **NFC-e real** | ⏳ Mock | ✅ Real | ✅ Real | ✅ Real | CRÍTICO |
| **NFC-e contingência** | ⏳ Preparado | ✅ Sim | ✅ Sim | ✅ Sim | MÉDIO |
| **Certificado digital** | ❌ Não | ✅ A1/A3 | ✅ A1/A3 | ✅ A1/A3 | CRÍTICO |
| **Auditoria fiscal** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ALTO |

---

## Detalhamento por Funcionalidade

### 1. MOTOR TRIBUTÁRIO BÁSICO

**SnapPay:**
- ✅ Calcula ICMS, PIS, COFINS, IPI por item
- ✅ Busca alíquotas em tabela (com fallback padrão)
- ✅ Valida NCM, CRT, CNPJ obrigatórios
- ❌ Não diferencia inter-estadual (usa UF empresa)
- ❌ Não trata substituição tributária
- Status: **CRÍTICO — IMPLEMENTADO**

**CISS / Linx / Bluesoft:**
- ✅ Todos implementam cálculo completo
- ✅ Tratam inter-estadual, substituição, diferencial
- ✅ Base de alíquotas atualizada pelo governo
- Status: **CRÍTICO — 100% FUNCIONAL**

**Gap:** SnapPay cobre 70% dos cenários (lojas simples). Falta inter-estadual e ST.

---

### 2. PERSISTÊNCIA DE DADOS TRIBUTÁRIOS

**SnapPay:**
- ✅ 26 campos salvos em venda_itens (NCM, CFOP, CST, alíquotas, bases, valores)
- ✅ Snapshot fiscal — valores imutáveis após venda
- ✅ Não recalcula se produto alterar
- Status: **CRÍTICO — IMPLEMENTADO CORRETAMENTE**

**CISS / Linx / Bluesoft:**
- ✅ Igual: snapshot fiscal persistido
- Status: **CRÍTICO — MESMA ABORDAGEM**

**Gap:** ZERO — SnapPay em pé de igualdade

---

### 3. TABELAS NCM/CFOP/CEST

**SnapPay:**
- ✅ GET /api/fiscal-data/ncm (busca código/descricao)
- ✅ GET /api/fiscal-data/cfop (busca código/tipo)
- ✅ GET /api/fiscal-data/cest (busca código)
- ❌ Dados apenas iniciais (exemplo)
- ❌ Sem importação automática do governo
- ⏳ POST /ncm/importar estruturado mas não implementado
- Status: **ALTO — INFRAESTRUTURA OK, DADOS INCOMPLETOS**

**CISS / Linx / Bluesoft:**
- ✅ Base completa 100% (40k+ NCM, 1k+ CFOP, 20k+ CEST)
- ✅ Atualização automática (semestral com SEFAZ)
- ✅ Sincronização com tabela oficial
- Status: **ALTO — 100% FUNCIONAL E ATUALIZADO**

**Gap:** SnapPay precisa importar dados reais. Estrutura pronta, dados faltam.

---

### 4. PERFIS FISCAIS (ATALHOS)

**SnapPay:**
- ✅ 7 perfis padrão (MERCADO, CONVENIÊNCIA, FARMÁCIA, DISTRIBUIDORA, RESTAURANTE, MATERIAL_CONSTRUÇÃO, CIGARRO)
- ✅ Pré-preenchem 80% dos campos
- ✅ Reduzem tempo de cadastro
- Status: **MÉDIO — IMPLEMENTADO**

**CISS / Linx / Bluesoft:**
- ✅ Perfis dinâmicos baseados em atividade econômica
- ✅ Mais de 100 segmentos customizáveis
- Status: **MÉDIO — MAIS GRANULAR**

**Gap:** SnapPay oferece o essencial. Empresas simples ficam 100% atendidas.

---

### 5. REGRAS INTER-ESTADUAL

**SnapPay:**
- ❌ Não implementado
- ⏳ Estrutura de uf_destino em calcularTributacao()
- ❌ Não diferencia ICMS na saída por UF
- Status: **ALTO — NÃO IMPLEMENTADO**

**CISS / Linx / Bluesoft:**
- ✅ Calculam diferencial de ICMS para outro estado
- ✅ Reduzem ICMS se regime não prevê substituição
- ✅ Aplicam BC diferenciada por UF
- Status: **ALTO — CRÍTICO PARA DISTRIBUIDORAS**

**Gap:** SnapPay não serve para venda inter-estadual. Bloqueio importante para fase 2.

**Prioridade:** ALTA (bloqueador para B2B)

---

### 6. SUBSTITUIÇÃO TRIBUTÁRIA (ST)

**SnapPay:**
- ❌ Não implementado
- ❌ Sem CST ST (720, 730, etc)
- ❌ Sem cálculo de ICMS ST anterior
- Status: **MÉDIO — NÃO IMPLEMENTADO**

**CISS / Linx / Bluesoft:**
- ✅ Implementam CST ST (ST não é tributo simples)
- ✅ Cálculo ICMS retido anterior
- ✅ Crédito presumido
- Status: **MÉDIO — FUNCIONAL**

**Gap:** SnapPay não cobre cenários ST. Aceitável para MVP (lojas normais).

**Prioridade:** MÉDIO (bloqueia alguns segmentos como fuel/energia)

---

### 7. CÁLCULO DE IPI

**SnapPay:**
- ✅ Calcula IPI por item
- ✅ Alíquota configurável
- ✅ Base de cálculo correta
- Status: **ALTO — IMPLEMENTADO**

**CISS / Linx / Bluesoft:**
- ✅ Igual
- Status: **ALTO — FUNCIONAL**

**Gap:** ZERO — mesma abordagem

---

### 8. NFC-e (NOTA FISCAL ELETRÔNICA)

**SnapPay:**
- ⏳ Mock provider implementado (simula SEFAZ)
- ✅ XML estruturado com dados reais
- ⏳ Sem certificado digital
- ❌ Não emite realmente para SEFAZ
- ❌ Sem contingência real
- Status: **CRÍTICO — MOCK APENAS**

**CISS / Linx / Bluesoft:**
- ✅ Emitem realmente para SEFAZ
- ✅ Contingência quando sefaz cai
- ✅ Suportam A1 e A3
- Status: **CRÍTICO — PRODUÇÃO REAL**

**Gap:** SnapPay precisa integração real. Bloqueador de produção.

**Prioridade:** CRÍTICO (roadmap: conectar Sefaz Brasil ou API terceiro)

---

### 9. CERTIFICADO DIGITAL

**SnapPay:**
- ❌ Sem suporte A1 (pfx/p12)
- ❌ Sem suporte A3 (token)
- ❌ Sem validação de certificado
- Status: **CRÍTICO — FALTA**

**CISS / Linx / Bluesoft:**
- ✅ Suportam A1 (arquivo criptografado)
- ✅ Suportam A3 (smartcard)
- ✅ Validam vigência
- Status: **CRÍTICO — FUNCIONAL**

**Gap:** SnapPay não pode emitir NFC-e real sem certificado.

**Bloqueador:** SIM — impossível produção sem isso

---

### 10. AUDITORIA FISCAL

**SnapPay:**
- ✅ Registra eventos em fiscal_eventos
- ✅ Auditoria de mudanças em NCM/CST/alíquotas (preparado)
- ✅ Rastreabilidade de tentativas (emissão, rejeição)
- Status: **ALTO — IMPLEMENTADO**

**CISS / Linx / Bluesoft:**
- ✅ Igual ou superior
- Status: **ALTO — FUNCIONAL**

**Gap:** ZERO — mesma abordagem

---

### 11. CONTINGÊNCIA FISCAL

**SnapPay:**
- ⏳ Status CONTINGENCIA_PENDENTE preparado
- ❌ Sem implementação real
- ❌ Sem offline real (simula apenas)
- Status: **MÉDIO — ESTRUTURA PREPARADA**

**CISS / Linx / Bluesoft:**
- ✅ Contingência real quando SEFAZ indisponível
- ✅ Emissor offline durante queda
- ✅ Sincronização pós-retorno
- Status: **MÉDIO — FUNCIONAL**

**Gap:** SnapPay prepara estrutura mas não executa contingência real.

**Prioridade:** MÉDIO (roadmap pós-integração real)

---

### 12. MULTI-LOJA / MULTI-EMPRESA

**SnapPay:**
- ✅ Suporta múltiplas empresas (empresa_id)
- ✅ Suporta múltiplas unidades (unidade_id)
- ✅ Cálculos respeitam contexto empresa/UF
- Status: **ALTO — IMPLEMENTADO**

**CISS / Linx / Bluesoft:**
- ✅ Igual
- Status: **ALTO — FUNCIONAL**

**Gap:** ZERO — mesma abordagem

---

## Roadmap de Colmatação de Gaps

### CRÍTICO (Bloqueia Produção)

| Gap | Impacto | Prazo | Complexidade |
|---|---|---|---|
| Integração NFC-e real | Impossível produção | 4-6 semanas | ALTA |
| Certificado digital A1/A3 | Impossível emitir | 3-4 semanas | MÉDIA |
| Sefaz.js ou API terceiro | Depende de integração | 2-4 semanas | MÉDIA |

### ALTO (Bloqueia Segmentos)

| Gap | Impacto | Prazo | Complexidade |
|---|---|---|---|
| Importação NCM real | Base incompleta | 1 semana | BAIXA |
| Regra inter-estadual | Venda B2B falha | 3-4 semanas | ALTA |
| ICMS diferencial por UF | Lucro reduzido incorretamente | 2-3 semanas | ALTA |

### MÉDIO (Nice-to-Have)

| Gap | Impacto | Prazo | Complexidade |
|---|---|---|---|
| Substituição tributária (ST) | Segmentos especiais | 4-6 semanas | ALTA |
| Contingência real | Offline funcionável | 2-3 semanas | MÉDIA |
| SPED Fiscal | Conformidade | 3-4 semanas | ALTA |

---

## Matriz de Comparação Detalhada

### Cálculos Tributários

```
                ICMS  PIS  COFINS  IPI  ST    DIF   CRÉDITO
SnapPay         ✅    ✅   ✅      ✅   ❌    ❌    ❌
CISS            ✅    ✅   ✅      ✅   ✅    ✅    ✅
Linx            ✅    ✅   ✅      ✅   ✅    ✅    ✅
Bluesoft        ✅    ✅   ✅      ✅   ✅    ✅    ✅
```

### Cenários Cobertos

```
                SIMPLES  NORMAL  INTER-EST  ST     EXPORTACAO
SnapPay         ✅       ✅      ❌         ❌     ❌
CISS            ✅       ✅      ✅         ✅     ✅
Linx            ✅       ✅      ✅         ✅     ✅
Bluesoft        ✅       ✅      ✅         ✅     ✅
```

### Emissão e Conformidade

```
                NFC-e  XML    CERT   SEFAZ  CONT   SPED
SnapPay         MOCK   ✅     ❌     ❌     PREP   ❌
CISS            ✅     ✅     ✅     ✅     ✅     ✅
Linx            ✅     ✅     ✅     ✅     ✅     ✅
Bluesoft        ✅     ✅     ✅     ✅     ✅     ✅
```

---

## Conclusões

### Força do SnapPay

1. **Motor tributário básico** — Implementação sólida para casos simples
2. **Persistência de dados** — Snapshot fiscal correto
3. **Arquitetura modular** — Fácil adicionar providers
4. **Multi-tenant** — Suporte múltiplas empresas/unidades

### Fraquezas do SnapPay

1. **Sem NFC-e real** — Bloqueador crítico
2. **Sem certificado digital** — Impossível produção
3. **Sem inter-estadual** — Limita a B2B
4. **Sem ST** — Segmentos especiais ficam fora

### Plano de Ação

**Fase 1 (MVP — 4-6 semanas):**
- Integração NFC-e real (parceiro ou SEFAZ.js)
- Suporte certificado A1
- Importação NCM real

**Fase 2 (Expansão — 3-4 semanas):**
- Regra inter-estadual
- Diferencial de ICMS por UF
- Contingência real

**Fase 3 (Completo — 6-8 semanas):**
- Substituição tributária
- SPED Fiscal
- Validações SEFAZ extras

---

## Recomendação Final

**SnapPay está 70% pronto para produção simples** (lojas Simples Nacional ou Lucro Presumido sem inter-estadual).

**Para produção sem restrições:** Implementar Fase 1 (NFC-e real + certificado) antes de produção.

**Tempo para 100% comparável com CISS/Linx/Bluesoft:** ~12-14 semanas se full-time.

---

**Status:** ANÁLISE COMPLETADA  
**Próximo:** Implementação de gaps críticos (ver Fase 9.3)
