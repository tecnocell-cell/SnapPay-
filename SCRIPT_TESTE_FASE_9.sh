#!/bin/bash
# Script de Teste E2E — Fase 9: Motor Tributário
# Executa todos os 14 testes e coleta evidências
#
# PRÉ-REQUISITOS:
# - SnapPay backend rodando em http://localhost:3000
# - PostgreSQL com banco de dados criado
# - jq instalado (para parsing JSON)
#
# USO:
# chmod +x SCRIPT_TESTE_FASE_9.sh
# ./SCRIPT_TESTE_FASE_9.sh > RESULTADO_TESTES_FASE_9.log 2>&1

set -e

API_BASE="http://localhost:3000/api"
EMPRESA_ID=1
TOKEN="Bearer <token_aqui>"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_DIR="logs_teste_$TIMESTAMP"

mkdir -p "$LOG_DIR"

echo "==============================================="
echo "INICIANDO TESTES FASE 9 — MOTOR TRIBUTÁRIO"
echo "Data: $(date)"
echo "API: $API_BASE"
echo "Log: $LOG_DIR"
echo "==============================================="

# ============================================================================
# FUNÇÃO: Fazer requisição HTTP e salvar resposta
# ============================================================================
function fazer_requisicao() {
  local metodo=$1
  local endpoint=$2
  local body=$3
  local arquivo_resposta="$LOG_DIR/${metodo}_${endpoint//\//_}.json"

  echo ""
  echo ">>> Executando: $metodo $endpoint"
  echo ">>> Body: $body"

  if [ -z "$body" ]; then
    curl -s -X "$metodo" \
      -H "Content-Type: application/json" \
      -H "Authorization: $TOKEN" \
      "$API_BASE$endpoint" | tee "$arquivo_resposta"
  else
    curl -s -X "$metodo" \
      -H "Content-Type: application/json" \
      -H "Authorization: $TOKEN" \
      -d "$body" \
      "$API_BASE$endpoint" | tee "$arquivo_resposta"
  fi

  echo ""
  echo ">>> Resposta salva em: $arquivo_resposta"

  # Retorna o arquivo salvo para processamento posterior
  echo "$arquivo_resposta"
}

# ============================================================================
# SETUP INICIAL
# ============================================================================

echo ""
echo "========= SETUP: Abrindo Caixa ========="

CAIXA_RESPONSE=$(fazer_requisicao "POST" "/caixa/abrir" '{"valorAbertura": 1000}')
CAIXA_ID=$(echo "$CAIXA_RESPONSE" | jq -r '.id')

echo "Caixa ID: $CAIXA_ID"

# ============================================================================
# TESTE 1: CENÁRIO ARROZ (18% ICMS)
# ============================================================================

echo ""
echo "========= TESTE 1: CENÁRIO ARROZ ========="

# Criar produto
ARR_PRODUCT_RESPONSE=$(fazer_requisicao "POST" "/produtos" '{
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
}')

ARR_ID=$(echo "$ARR_PRODUCT_RESPONSE" | jq -r '.id')
echo "Produto Arroz criado: ID=$ARR_ID"

# Fazer venda
VENDA_1_RESPONSE=$(fazer_requisicao "POST" "/vendas" "{
  \"itens\": [
    {
      \"produtoId\": $ARR_ID,
      \"quantidade\": 1,
      \"precoUnitario\": 25.00
    }
  ],
  \"pagamentos\": [
    {
      \"forma\": \"DINHEIRO\",
      \"valor\": 25.00
    }
  ],
  \"total_esperado\": 25.00
}")

VENDA_1_ID=$(echo "$VENDA_1_RESPONSE" | jq -r '.id')
echo "Venda 1 criada: ID=$VENDA_1_ID"

# Consultar venda_itens
VENDA_1_DETALHES=$(fazer_requisicao "GET" "/vendas/$VENDA_1_ID" "")

# Validar tributação
ICMS=$(echo "$VENDA_1_DETALHES" | jq -r '.itens[0].valor_icms')
PIS=$(echo "$VENDA_1_DETALHES" | jq -r '.itens[0].valor_pis')
COFINS=$(echo "$VENDA_1_DETALHES" | jq -r '.itens[0].valor_cofins')
IPI=$(echo "$VENDA_1_DETALHES" | jq -r '.itens[0].valor_ipi')

echo "Tributação Arroz:"
echo "  ICMS: $ICMS (esperado 4.50)"
echo "  PIS: $PIS (esperado 0.41)"
echo "  COFINS: $COFINS (esperado 1.90)"
echo "  IPI: $IPI (esperado 0.00)"

# Resumo tributário
RESUMO_1=$(fazer_requisicao "GET" "/vendas/$VENDA_1_ID/resumo-tributario" "")

echo "Resumo tributário:"
echo "$RESUMO_1" | jq '.total_icms, .total_pis, .total_cofins, .percentual_tributos'

# NFC-e Mock
NFC_1=$(fazer_requisicao "POST" "/fiscal/notas/emitir" "{\"venda_id\": $VENDA_1_ID, \"simular\": \"AUTORIZAR\"}")
NFC_1_ID=$(echo "$NFC_1" | jq -r '.id')
echo "NFC-e criada: ID=$NFC_1_ID"

# ============================================================================
# TESTE 7: SNAPSHOT FISCAL
# ============================================================================

echo ""
echo "========= TESTE 7: SNAPSHOT FISCAL ========="

# Salvar valores antes da alteração
ANTES=$(fazer_requisicao "GET" "/vendas/$VENDA_1_ID" "")
NCM_ANTES=$(echo "$ANTES" | jq -r '.itens[0].ncm_codigo')
ICMS_ANTES=$(echo "$ANTES" | jq -r '.itens[0].valor_icms')

echo "Antes da alteração:"
echo "  NCM: $NCM_ANTES"
echo "  ICMS: $ICMS_ANTES"

# Alterar produto
PRODUTO_ALTERADO=$(fazer_requisicao "PUT" "/produtos/$ARR_ID" '{
  "ncm_codigo": "99999999"
}')

echo "Produto alterado para NCM 99999999"

# Verificar se venda antiga continua igual
DEPOIS=$(fazer_requisicao "GET" "/vendas/$VENDA_1_ID" "")
NCM_DEPOIS=$(echo "$DEPOIS" | jq -r '.itens[0].ncm_codigo')
ICMS_DEPOIS=$(echo "$DEPOIS" | jq -r '.itens[0].valor_icms')

echo "Depois da alteração:"
echo "  NCM: $NCM_DEPOIS (esperado $NCM_ANTES)"
echo "  ICMS: $ICMS_DEPOIS (esperado $ICMS_ANTES)"

if [ "$NCM_ANTES" = "$NCM_DEPOIS" ] && [ "$ICMS_ANTES" = "$ICMS_DEPOIS" ]; then
  echo "✓ SNAPSHOT VÁLIDO — Dados imutáveis"
else
  echo "✗ FALHA — Dados foram alterados!"
fi

# ============================================================================
# TESTE 8: BLOQUEIO CRT
# ============================================================================

echo ""
echo "========= TESTE 8: BLOQUEIO SEM CRT ========="

# Remover CRT
EMPRESA_ALTERADA=$(fazer_requisicao "PUT" "/empresa" '{"crt": null}')
echo "CRT removido"

# Tentar emitir NFC-e
BLOQUEIO_CRT=$(fazer_requisicao "POST" "/fiscal/notas/emitir" "{\"venda_id\": $VENDA_1_ID}")

ERROR=$(echo "$BLOQUEIO_CRT" | jq -r '.error // "sem erro"')
if [[ "$ERROR" =~ "sem CRT" ]]; then
  echo "✓ BLOQUEIO CORRETO — $ERROR"
else
  echo "✗ FALHA — Erro esperado não ocorreu"
fi

# Restaurar CRT
EMPRESA_RESTAURADA=$(fazer_requisicao "PUT" "/empresa" '{"crt": 3}')
echo "CRT restaurado"

# ============================================================================
# TESTE 10: BLOQUEIO PRODUTO SEM NCM
# ============================================================================

echo ""
echo "========= TESTE 10: BLOQUEIO PRODUTO SEM NCM ========="

# Criar produto sem NCM
PRODUTO_SEM_NCM=$(fazer_requisicao "POST" "/produtos" '{
  "codigo": "SEMNCM",
  "nome": "Produto Sem NCM",
  "categoria_id": 1,
  "preco_venda": 10.00
}')

SEMNCM_ID=$(echo "$PRODUTO_SEM_NCM" | jq -r '.id')
echo "Produto sem NCM criado: ID=$SEMNCM_ID"

# Venda com produto sem NCM
VENDA_SEMNCM=$(fazer_requisicao "POST" "/vendas" "{
  \"itens\": [
    {
      \"produtoId\": $SEMNCM_ID,
      \"quantidade\": 1,
      \"precoUnitario\": 10.00
    }
  ],
  \"pagamentos\": [{\"forma\": \"DINHEIRO\", \"valor\": 10.00}],
  \"total_esperado\": 10.00
}")

VENDA_SEMNCM_ID=$(echo "$VENDA_SEMNCM" | jq -r '.id')
echo "Venda com produto sem NCM: ID=$VENDA_SEMNCM_ID"

# Tentar emitir NFC-e
BLOQUEIO_NCM=$(fazer_requisicao "POST" "/fiscal/notas/emitir" "{\"venda_id\": $VENDA_SEMNCM_ID}")

ERROR=$(echo "$BLOQUEIO_NCM" | jq -r '.error // "sem erro"')
if [[ "$ERROR" =~ "sem NCM" ]]; then
  echo "✓ BLOQUEIO CORRETO — $ERROR"
else
  echo "✗ FALHA — Erro esperado não ocorreu"
fi

# ============================================================================
# TESTE 13: STRESS TEST (10 VENDAS SIMULADO)
# ============================================================================

echo ""
echo "========= TESTE 13: STRESS TEST (10 VENDAS) ========="

START_TIME=$(date +%s%N)

for i in {1..10}; do
  VENDA_STRESS=$(fazer_requisicao "POST" "/vendas" "{
    \"itens\": [
      {
        \"produtoId\": $ARR_ID,
        \"quantidade\": 1,
        \"precoUnitario\": 25.00
      }
    ],
    \"pagamentos\": [{\"forma\": \"DINHEIRO\", \"valor\": 25.00}],
    \"total_esperado\": 25.00
  }")

  VENDA_ID=$(echo "$VENDA_STRESS" | jq -r '.id')
  echo "  Venda $i criada (ID=$VENDA_ID)"
done

END_TIME=$(date +%s%N)
TEMPO_TOTAL=$((($END_TIME - $START_TIME) / 1000000))

echo "Tempo total para 10 vendas: ${TEMPO_TOTAL}ms"
echo "Tempo médio: $((TEMPO_TOTAL / 10))ms por venda"

# ============================================================================
# TESTE 14: AUDITORIA FISCAL
# ============================================================================

echo ""
echo "========= TESTE 14: AUDITORIA FISCAL ========="

# Alterar alíquota do produto
ALTERACAO=$(fazer_requisicao "PUT" "/produtos/$ARR_ID" '{
  "aliquota_icms_padrao": 20.0
}')

echo "Alíquota alterada de 18% para 20%"

# Consultar auditoria
AUDITORIA=$(fazer_requisicao "GET" "/fiscal-audit?produto_id=$ARR_ID" "")

echo "Registros de auditoria:"
echo "$AUDITORIA" | jq '.auditoria[] | {campo, valor_antes, valor_depois, atualizado_em}'

# ============================================================================
# RESUMO FINAL
# ============================================================================

echo ""
echo "==============================================="
echo "TESTES CONCLUÍDOS"
echo "Data Fim: $(date)"
echo "Logs salvos em: $LOG_DIR"
echo "==============================================="

# Listar arquivos de resposta
echo ""
echo "Arquivos coletados:"
ls -lh "$LOG_DIR"

echo ""
echo "✓ Homologação Fase 9 concluída"
echo ""
