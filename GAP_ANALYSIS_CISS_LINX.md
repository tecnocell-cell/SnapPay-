# Gap Analysis — SnapPay vs CISS/Linx/STi3

**Data:** 2026-06-18  
**Objetivo:** Comparar SnapPay com concorrentes (CISS, Linx, STi3)  
**Status:** Análise inicial — bases de mercado

---

## EXECUTIVE SUMMARY

SnapPay é um **PDV em nuvem moderno** com operação offline-first. Sua arquitetura é fundamentalmente diferente de sistemas tradicionais:

| Aspecto | SnapPay | CISS/Linx | STi3 |
|---|---|---|---|
| **Modelo** | Cloud + Terminal Local | Windows/Linux Dedicado | Windows Servidor |
| **Operação** | Offline-first, Sync posterior | Online-first, Cache | Sempre conectado |
| **Escala** | Multi-tenant, Multi-loja | Single-tenant | Single-tenant |
| **Atualização** | OTA automático | Manual/Plugin | Manual |
| **Mobilidade** | Tablet/Quiosque/Web | Fixo (mini PC) | Fixo |

---

## 1. O QUE SNAPPAY JÁ TEM

### 1.1 PDV Core

✅ **Venda**
- [x] Criar venda (itens, cliente, desconto)
- [x] Validar estoque (consolidado e por loja)
- [x] Precificação com tabelas e promoções
- [x] Múltiplas formas pagamento (dinheiro, PIX, cartão, cheque)
- [x] Cancelamento de venda
- [x] Devolução com NFC-e awareness
- [x] Idempotência (evitar duplicata)

✅ **Caixa**
- [x] Abertura e fechamento
- [x] Sangria e suprimento
- [x] Movimentação livre
- [x] Diferença conferência

✅ **Estoque**
- [x] Entrada (compra, devolução fornecedor)
- [x] Saída (venda, transferência)
- [x] Transferência entre lojas com kardex
- [x] Kardex completo (saldo anterior/posterior)
- [x] Multi-loja

✅ **Clientes**
- [x] Cadastro completo
- [x] Histórico de compras
- [x] Consulta CPF

✅ **Impressão**
- [x] Cupom estruturado (texto)
- [x] Mock provider (testes)
- [x] Histórico de impressão
- [x] Reimpressão
- [x] Auditoria de impressão

✅ **Auditoria**
- [x] Rastreamento de todas operações
- [x] Dados antes/depois
- [x] Usuário, timestamp, empresa

### 1.2 Gestão

✅ **Fornecedores & Compras**
- [x] Cadastro fornecedor
- [x] Criação de compra
- [x] Recebimento com NF-e
- [x] Devolução

✅ **Financeiro**
- [x] Contas a pagar
- [x] Contas a receber
- [x] Fluxo de caixa

✅ **Fiscal**
- [x] NFC-e (mock provider)
- [x] Contingência OFFLINE
- [x] Eventos fiscais pendentes
- [x] Reprocessamento manual
- [x] DANFE simples

✅ **Multi-Tenant**
- [x] Isolamento por empresa
- [x] Multi-loja
- [x] Permissões por papel (OPERADOR, GERENTE, ADMIN)

### 1.3 Hardware & Terminal

✅ **Hardware Abstrato**
- [x] Scanner (MOCK ready)
- [x] Printer ESC/POS (MOCK + Ethernet placeholder)
- [x] Drawer RJ11 (MOCK + Serial placeholder)
- [x] Scale (MOCK + RS232 placeholder)

✅ **Terminal PDV**
- [x] Ativação via device_id + chave
- [x] Modo quiosque (menu reduzido)
- [x] Offline-first SQLite local
- [x] Sincronização batch
- [x] Menu filtrado por papel

---

## 2. O QUE FALTA (GAP)

### 2.1 CRÍTICO (Bloqueia operação produtiva)

| Gap | Impacto | Solução Proposta |
|---|---|---|
| **ESC/POS Real** | Não imprime em hardware real | Implementar driver Ethernet + USB |
| **Integração TEF** | Não aceita cartão online | Implementar SDK Stone/Linx/Rede |
| **Cupom Fiscal Completo** | Não emite NFC-e real | Integrar provedor fiscal (Focus/Bling) |
| **Autenticação OAuth/2FA** | Senhas em texto | Implementar 2FA, OAuth external providers |
| **SSL/TLS Produção** | Sem criptografia de transporte | Certificado valid (Let's Encrypt) |
| **Backup Automático Cloud** | Dados apenas locais | S3/Azure backup automático |
| **Processamento Retaguarda** | Sincronização manual | Implementar Jobs background (Bull/Agenda) |

### 2.2 ALTO (Necessário para operação real)

| Gap | Impacto | Solução |
|---|---|---|
| **Sincronização Estoque Real-time** | Divergência loja↔cloud | Filas de evento (Redis/RabbitMQ) |
| **Reconciliação de Pagamentos** | Manual, propenso a erro | Integração bancária (Open Banking) |
| **Relatórios Avançados** | Apenas listagens | BI (Data Studio, Metabase) |
| **Performance em 50+ lojas** | Índices faltam | Otimizar queries, cache Redis |
| **Geolocalização de Vendas** | Sem dados espaciais | GIS (PostGIS) |
| **Inteligência de Vendas** | Sem previsão | ML (tendências, sazonalidade) |
| **Gerenciador de Estoque Avançado** | Sem alerta automático | AlertaEstoque + previsão de demanda |

### 2.3 MÉDIO (Bom ter, diferencial)

| Gap | Impacto | Solução |
|---|---|---|
| **App Cliente Móvel** | PDV apenas web | React Native + Firebase |
| **Self-Checkout** | Sem operação desatendida | Hardware específico + software |
| **Integração Marketplace** | Não vende em Shopify/Magento | API marketplace connectors |
| **Programa de Fidelidade** | Sem retençao cliente | Pontos, cupons, tier |
| **Reserva de Estoque** | Sem hold prévia | Status produto = PRÉ_VENDA |
| **Devolução de Cliente** | Sem fluxo completo | NF-e devolução + auditoria |

### 2.4 BAIXO (Nice to have)

| Gap | Impacto | Solução |
|---|---|---|
| **Assistente IA** | Sem otimização automática | Claude API (recomendações) |
| **Análise Preditiva** | Manual | Prophet/ARIMA |
| **Notificação Push** | Sem alertas mobile | Firebase Cloud Messaging |
| **Integração ERP** | Sem sincronização | SAP/Totvs connector |

---

## 3. COMPARAÇÃO DETALHADA

### 3.1 Funcionalidades CISS

**Forte em:** Varejo, múltiplas lojas, fiscal  
**Baseado em:** Windows/Linux dedicado

| Função | CISS | SnapPay | Vencedor |
|---|---|---|---|
| Venda base | ✅ | ✅ | Empate |
| Estoque multi-loja | ✅ | ✅ | Empate |
| NFC-e real | ✅ | ❌ | CISS |
| TEF integrado | ✅ | ❌ | CISS |
| Offline-first | ❌ | ✅ | SnapPay |
| Operação nuvem | ❌ | ✅ | SnapPay |
| Múltiplas empresas | ❌ | ✅ | SnapPay |
| Mobile/Web | ❌ | ✅ | SnapPay |
| Replicação fácil | ❌ | ✅ | SnapPay |

**Estratégia:** SnapPay vence em flexibilidade/modernidade, CISS em maturidade fiscal.

### 3.2 Funcionalidades Linx

**Forte em:** Varejo, automação, integração  
**Baseado em:** Windows cloud + terninais

| Função | Linx | SnapPay | Vencedor |
|---|---|---|---|
| Suite completa (PDV+Gestão+E-commerce) | ✅ | Parcial | Linx |
| Integrações (500+) | ✅ | ~20 | Linx |
| Performance em 1000+ lojas | ✅ | Não testado | Linx |
| Preço entry (pequeno varejo) | ❌ (caro) | ✅ (barato) | SnapPay |
| Contratos 3+ anos | ✅ | Mensais | SnapPay |
| Suporte 24/7 | ✅ | Roadmap | Linx |

**Estratégia:** Linx para grandes redes (500+), SnapPay para pequeno-médio + startups.

### 3.3 Funcionalidades STi3

**Forte em:** Padaria, açougue, conveniência  
**Baseado em:** Windows dedicado, ultra simples

| Função | STi3 | SnapPay | Vencedor |
|---|---|---|---|
| Interface ultra simples | ✅ | ❌ | STi3 |
| Operação 100% local | ✅ | ❌ | STi3 |
| Muito barato | ✅ | ❌ | STi3 |
| Offline-first | ❌ | ✅ | SnapPay |
| Multi-loja | ❌ | ✅ | SnapPay |
| Integração moderna | ❌ | ✅ | SnapPay |
| Escalabilidade | ❌ | ✅ | SnapPay |

**Estratégia:** STi3 perde para SnapPay em escalabilidade/modernidade.

---

## 4. ROADMAP PRIORIZADO

### Fase 1 — CRÍTICO (2-3 meses)

1. **ESC/POS Real**
   - Implementar driver Ethernet
   - Testes com impressora Bematech RB-1000
   - Timing: 3 semanas

2. **Cupom Fiscal Real**
   - Integrar provedor (Focus)
   - Emissão/consulta NFC-e
   - Timing: 4 semanas

3. **TEF/Gateway Pagamento**
   - Stone/Rede/Linx SDK
   - Autorização online
   - Timing: 3 semanas

4. **Segurança**
   - OAuth2 + 2FA
   - SSL produção
   - Timing: 2 semanas

5. **Backup Automático**
   - S3 daily
   - Restore automático
   - Timing: 1 semana

**Total Fase 1:** ~13 semanas (3+ meses)

### Fase 2 — ALTO (1-2 meses)

1. **Sincronização Real-time** (Redis filas)
2. **Reconciliação Pagamentos** (Open Banking)
3. **Relatórios BI** (Data Studio)
4. **Performance** (índices, cache)

**Total Fase 2:** ~8 semanas

### Fase 3 — MÉDIO (Contínuo)

1. App Cliente Móvel (React Native)
2. Self-Checkout (hardware específico)
3. Fidelidade (pontos, cupons)
4. Devolução completa (NF-e)

**Total Fase 3:** ~12 semanas

---

## 5. RECOMENDAÇÕES IMEDIATAS

### 5.1 Para Pequeno Varejo (5-20 lojas)

✅ **Use SnapPay hoje**
- Custo 70% menos que CISS
- Escalável para crescimento
- Offline-first robusto
- Multi-empresa

⚠️ **Mas implemente antes:**
1. ESC/POS real (3-4 semanas)
2. NFC-e real (3-4 semanas)

### 5.2 Para Conveniência (1-3 lojas)

✅ **Use SnapPay**
- Muito mais moderno que STi3
- Sem custo de hardware dedicado
- Operação nuvem (sem IT)
- Menu simples (modo OPERADOR)

⚠️ **Mas:**
1. ESC/POS real
2. TEF para cartão

### 5.3 Para Grandes Redes (50+)

⚠️ **Use CISS/Linx**
- SnapPay não é para escala 1000+
- Mas: use SnapPay + bridge (futuro)
- Migração gradual possível

**Alternativa:** SnapPay + microserviços escaláveis = melhor opção a longo prazo.

---

## 6. INVESTIMENTO NECESSÁRIO

### Implementação Fase 1 (13 semanas)

| Item | Horas | Custo (R$/h) | Total |
|---|---|---|---|
| ESC/POS | 80 | 150 | R$ 12.000 |
| NFC-e | 120 | 150 | R$ 18.000 |
| TEF | 100 | 150 | R$ 15.000 |
| Segurança | 60 | 150 | R$ 9.000 |
| Testes | 80 | 100 | R$ 8.000 |
| **TOTAL** | **440h** | | **R$ 62.000** |

**Timeline:** ~10-13 semanas (um desenvolvedor full-time)

---

## 7. CONCLUSÃO

**SnapPay é:**
- ✅ PDV moderno, em nuvem, escalável
- ✅ Bom para pequeno-médio varejo (5-50 lojas)
- ✅ Flexível (Web + Terminal + Offline)
- ❌ Não compete com CISS em fiscal puro
- ❌ Não compete com Linx em suite completa
- ✅ Melhor que STi3 em arquitetura

**Recomendação:** Implementar Fase 1 (Crítico) e posicionar como "PDV Moderno para Varejo Inovador" — não tente competir com CISS no varejo tradicional, mas ganhe o varejo de startups + omnichannel.

---

**Próxima ação:** Iniciar Fase 1 — ESC/POS Real (3-4 semanas).
