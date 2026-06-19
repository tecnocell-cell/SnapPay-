# Relatório de Homologação — Fase 9.2C: Motor Tributário

**Data:** 2026-06-18  
**Status:** ✅ PRONTO PARA VALIDAÇÃO (estrutura e testes preparados)  
**Escopo:** 14 testes E2E com evidências  

---

## OBJETIVO

Homologar e validar **100% operacional** do motor tributário implementado na Fase 9, usando testes reais contra a API e banco de dados.

**Não implementar novas features. Apenas validar o que existe.**

---

## PREPARAÇÃO PARA TESTES

### Ambiente Necessário

```
✓ SnapPay backend rodando (npm start)
✓ PostgreSQL com banco de dados criado
✓ curl instalado (para requisições HTTP)
✓ jq instalado (para parsing JSON)
✓ Empresa teste criada (CNPJ: 12.345.678/0001-90)
✓ Caixa aberto para receber vendas
```

### Comandos de Setup

```bash
# 1. Verificar se backend está rodando
curl http://localhost:3000/api/fiscal-profiles

# 2. Criar empresa teste (se não existir)
curl -X POST http://localhost:3000/api/empresa \
  -H "Content-Type: application/json" \
  -d '{
    "razao_social": "Empresa Teste Ltda",
    "cnpj": "12345678000190",
    "crt": 3,
    "cnae_principal": "4771-3/02",
    "uf": "SP",
    "regime_tributario": "NORMAL"
  }'

# 3. Abrir caixa
curl -X POST http://localhost:3000/api/caixa/abrir \
  -H "Content-Type: application/json" \
  -d '{"valorAbertura": 1000}'
```

---

## PLANO DE TESTES

### 14 Testes Estruturados

```
TESTE 1  — Arroz (18% ICMS)
TESTE 2  — Refrigerante (18% ICMS)
TESTE 3  — Cerveja (18% ICMS)
TESTE 4  — Medicamento (0% isento)
TESTE 5  — Cigarro (25% especial)
TESTE 6  — Livro (0% isento)
TESTE 7  — Snapshot Fiscal (imutabilidade)
TESTE 8  — Bloqueio CRT
TESTE 9  — Bloqueio CNPJ
TESTE 10 — Bloqueio NCM
TESTE 11 — Resumo Tributário
TESTE 12 — XML NFC-e
TESTE 13 — Stress Test (100 vendas)
TESTE 14 — Auditoria Fiscal
```

---

## ROTEIRO DE EXECUÇÃO

### Como Executar os Testes

**Opção 1: Manual (curl)**

Para cada teste, executar os comandos curl conforme em `HOMOLOGACAO_FASE_9_LOG.md`.

**Opção 2: Automático (script)**

```bash
chmod +x SCRIPT_TESTE_FASE_9.sh
./SCRIPT_TESTE_FASE_9.sh > RESULTADO_TESTES_FASE_9.log 2>&1
```

O script:
- ✓ Cria produtos de teste
- ✓ Executa vendas
- ✓ Valida cálculos
- ✓ Testa bloqueios
- ✓ Coleta evidências (JSON responses)
- ✓ Gera log estruturado

---

## EVIDÊNCIAS ESPERADAS

### Teste 1: Arroz (18% ICMS)

**Evidência: Venda Item criado**
```json
{
  "id": 1,
  "venda_id": 1,
  "produto_id": 1,
  "ncm_codigo": "10061000",
  "cfop_codigo": "5101",
  "quantidade": 1,
  "preco_unitario": 25.00,
  "valor_total": 25.00,
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
```

**Validações:**
- ✓ ICMS = 4.50 (25.00 × 18%)
- ✓ PIS = 0.41 (25.00 × 1.65%)
- ✓ COFINS = 1.90 (25.00 × 7.60%)
- ✓ IPI = 0.00

**Classificação:** 🟢 VERDE se todos os valores coincidem

---

### Teste 7: Snapshot Fiscal

**Evidência: Imutabilidade após alteração**

**Antes:**
```json
{ "ncm_codigo": "10061000", "valor_icms": 4.50 }
```

**Alterar produto:**
```bash
PUT /api/produtos/1
{ "ncm_codigo": "99999999" }
```

**Depois:**
```json
{ "ncm_codigo": "10061000", "valor_icms": 4.50 }
```

**Validação:**
- ✓ NCM na venda continua "10061000" (não mudou)
- ✓ ICMS continua "4.50" (não recalculado)

**Classificação:** 🟢 VERDE se valores idênticos

---

### Teste 8: Bloqueio CRT

**Evidência: Erro ao remover CRT**

**Requisição:**
```bash
PUT /api/empresa
{ "crt": null }

POST /api/fiscal/notas/emitir
{ "venda_id": 1 }
```

**Resposta esperada:**
```json
{
  "status": 400,
  "error": "Empresa sem CRT — configure dados tributários"
}
```

**Validação:**
- ✓ Erro 400 retornado
- ✓ Mensagem contém "sem CRT"

**Classificação:** 🟢 VERDE se erro esperado

---

### Teste 10: Bloqueio NCM

**Evidência: Produto sem NCM bloqueia NFC-e**

**Criar produto sem NCM:**
```bash
POST /api/produtos
{
  "codigo": "SEMNCM",
  "nome": "Produto Sem NCM",
  "preco_venda": 10.00
  // SEM ncm_codigo
}
```

**Venda funciona:**
```bash
POST /api/vendas
{ "itens": [{"produtoId": <SEMNCM>, "quantidade": 1}] }
Response: { "id": 1, "total": 10.00 }
```

**NFC-e bloqueada:**
```bash
POST /api/fiscal/notas/emitir
{ "venda_id": 1 }

Response: {
  "status": 400,
  "error": "Produto SEMNCM sem NCM — não pode emitir NFC-e"
}
```

**Validação:**
- ✓ Venda é criada (sem dados tributários)
- ✓ NFC-e é bloqueada com erro claro

**Classificação:** 🟢 VERDE se comportamento esperado

---

### Teste 13: Stress Test

**Evidência: 100 vendas processadas corretamente**

**Métrica:**
```
Vendas criadas: 100/100 ✓
Tempo total: < 30s
Tempo médio: < 300ms por venda
Erros: 0
Tributação calculada em todas: 100/100 ✓
Inconsistências: 0
```

**Validação:**
- ✓ Todas as 100 vendas criadas
- ✓ Tempos aceitáveis
- ✓ Nenhum erro
- ✓ Consistência garantida

**Classificação:** 🟢 VERDE se métricas atendidas

---

## MATRIZ DE DECISÃO

### Classificação Final por Teste

| Teste | Esperado | Verde | Amarelo | Vermelho |
|---|---|---|---|---|
| 1. Arroz | 27.24% | Valores exatos | ±2% | >2% ou erro |
| 2. Refri | 27.75% | Valores exatos | ±2% | >2% ou erro |
| 3. Cerveja | 27.06% | Valores exatos | ±2% | >2% ou erro |
| 4. Medicamento | 0% | 0.00 | — | >0 |
| 5. Cigarro | 40% | Valores exatos | ±2% | >2% ou erro |
| 6. Livro | 0% | 0.00 | — | >0 |
| 7. Snapshot | Imutável | Antes = Depois | ±1 campo | >1 ou mudou valor |
| 8. Bloqueio CRT | Erro 400 | "sem CRT" | Erro 500 | Sem erro ou 200 |
| 9. Bloqueio CNPJ | Erro 400 | "sem CNPJ" | Erro 500 | Sem erro ou 200 |
| 10. Bloqueio NCM | Erro 400 | "sem NCM" | Erro 500 | Sem erro ou 200 |
| 11. Resumo | Consolidado | Soma correta | ±2% | >2% ou erro |
| 12. XML | Dados reais | NCM/CFOP/valores | Faltam campos | XML fake ou vazio |
| 13. Stress | 100 vendas | <30s, 0 erros | Lento (>1min) | Erros ou tempo >5min |
| 14. Auditoria | Registra mudança | Campo/antes/depois | Sem timestamp | Sem registro |

---

## RESULTADO ESPERADO

### Se TODOS os testes passarem com 🟢 VERDE

```
CLASSIFICAÇÃO FINAL: 🟢 VERDE
Recomendação: Pronto para integração NFC-e real
Bloqueadores: Nenhum identificado
Próximo: Fase 9.3 (NFC-e real + inter-estadual)
```

### Se ALGUNS testes passarem com 🟡 AMARELO

```
CLASSIFICAÇÃO FINAL: 🟡 AMARELO
Recomendação: Ajustes menores necessários
Bloqueadores: Listar quais são amarelo
Próximo: Corrigir amarelos, reteste
```

### Se ALGUM teste com 🔴 VERMELHO

```
CLASSIFICAÇÃO FINAL: 🔴 VERMELHO
Recomendação: NÃO prosseguir para NFC-e real
Bloqueadores: Listar todos os vermelhos
Próximo: Investigar e corrigir raiz
```

---

## CHECKLIST DE EXECUÇÃO

### Antes de Executar

- [ ] Backend está rodando (curl http://localhost:3000/api/fiscal-profiles retorna 200)
- [ ] PostgreSQL está acessível
- [ ] Banco de dados criado e com migrations aplicadas (19, 20)
- [ ] Empresa teste criada com CRT e CNPJ
- [ ] Caixa aberto
- [ ] curl e jq instalados

### Durante a Execução

- [ ] Copiar HOMOLOGACAO_FASE_9_LOG.md e preencher "Resultado Obtido"
- [ ] Executar SCRIPT_TESTE_FASE_9.sh ou comandos manuais
- [ ] Salvar respostas JSON para análise
- [ ] Comparar com "Esperado"
- [ ] Registrar qualquer diferença
- [ ] Anotar tempos de execução
- [ ] Documentar erros (se houver)

### Após Execução

- [ ] Compilar resultados em RESULTADO_TESTES_FASE_9.log
- [ ] Classificar cada teste (VERDE/AMARELO/VERMELHO)
- [ ] Gerar relatório final
- [ ] Decidir: prosseguir para Fase 9.3?

---

## ARTEFATOS ENTREGÁVEIS

### Documentos Criados (Esta Sessão)

1. ✅ **HOMOLOGACAO_FASE_9_LOG.md** (640 linhas)
   - Estrutura detalhada de 14 testes
   - Payloads e respostas esperadas
   - Validações por teste

2. ✅ **SCRIPT_TESTE_FASE_9.sh** (350 linhas)
   - Script bash automatizado
   - Coleta de evidências JSON
   - Log estruturado

3. ✅ **RELATORIO_HOMOLOGACAO_FASE_9.md** (este arquivo)
   - Guia de execução
   - Matriz de decisão
   - Checklist

### Artefatos a Serem Gerados (Após Execução)

4. **RESULTADO_TESTES_FASE_9.log** (preenchido com resultados reais)
5. **logs_teste_TIMESTAMP/** (diretório com respostas JSON)
6. **EVIDENCIAS_HOMOLOGACAO.md** (compilação com prints/payloads)

---

## TIMELINE ESTIMADA

| Fase | Tarefa | Tempo | Status |
|---|---|---|---|
| 1 | Setup ambiente | 10 min | ⏳ |
| 2 | Executar 6 cenários | 15 min | ⏳ |
| 3 | Executar 4 bloqueios | 10 min | ⏳ |
| 4 | Executar snapshot | 5 min | ⏳ |
| 5 | Stress test (100 vendas) | 2 min | ⏳ |
| 6 | Compilar resultados | 15 min | ⏳ |
| 7 | Gerar relatório final | 10 min | ⏳ |
| **TOTAL** | | **67 min** | **⏳** |

---

## CRITÉRIO DE SUCESSO

### Homologação VERDE (Pronto)

✅ **Todos os testes com VERDE:**
- 6 cenários com tributação correta
- 3 bloqueios funcionando
- Snapshot imutável
- Stress test < 30s
- Auditoria registrando
- XML com dados reais

### Homologação AMARELO (Ajustar)

⚠️ **Alguns testes com AMARELO (< 20%):**
- Pequenas diferenças em cálculos (±2%)
- Campos opcionais faltando
- Performance levemente abaixo do esperado

→ **Ação:** Corrigir, reteste, reclassificar

### Homologação VERMELHO (Bloquear)

❌ **Qualquer teste com VERMELHO:**
- Cálculo completamente errado
- Bloqueios não funcionando
- Snapshot não é imutável
- Stress test com erros
- XML sem dados tributários

→ **Ação:** Investigar, corrigir código, reteste completo

---

## PRÓXIMAS AÇÕES

### Imediato (Hoje)

1. [ ] Executar HOMOLOGACAO_FASE_9 (manual ou script)
2. [ ] Preencher resultados em HOMOLOGACAO_FASE_9_LOG.md
3. [ ] Classificar cada teste
4. [ ] Gerar RESULTADO_TESTES_FASE_9.log

### Se VERDE

4. [ ] Aprovar para Fase 9.3
5. [ ] Iniciar integração NFC-e real
6. [ ] Planejar inter-estadual

### Se AMARELO/VERMELHO

4. [ ] Investigar raiz de cada falha
5. [ ] Corrigir código (se necessário)
6. [ ] Reteste (se mudou código)
7. [ ] Reclassificar

---

## PERGUNTAS FREQUENTES

**P: E se um teste falhar?**  
R: Não é bloqueador de mercado. Investigar, corrigir, reteste. Homologação é iterativa.

**P: Preciso rodar manualmente ou posso usar o script?**  
R: Ambos válidos. Script é mais rápido. Manual é mais intuitivo. Escolha sua preferência.

**P: E se a performance for lenta (stress test > 30s)?**  
R: Amarelo. Pode prosseguir para Fase 9.3, mas investigar depois (indexação DB, etc).

**P: Posso parar uma vez que todos os testes forem VERDE?**  
R: Sim! Homologação concluída. Próximo: Fase 9.3.

**P: E se faltar dados iniciais (NCM, CFOP, CEST)?**  
R: Esperado. Importação é roadmap. Testes funcionam com dados de exemplo.

---

## CONCLUSÃO

**Homologação Fase 9.2C estruturada e pronta para execução.**

Todos os testes estão documentados, payloads esperados estão listados, e um script automatizado está pronto para coletar evidências.

**Próximo passo:** Executar testes e preencher HOMOLOGACAO_FASE_9_LOG.md com resultados reais.

---

**Status:** ✅ PRONTO PARA HOMOLOGAÇÃO  
**Data:** 2026-06-18  
**Responsável:** Teste Local  
**Bloqueador para Produção:** Sim (até validação completa)

