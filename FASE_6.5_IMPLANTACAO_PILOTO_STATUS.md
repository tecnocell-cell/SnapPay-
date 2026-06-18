# 🚀 FASE 6.5 — IMPLANTAÇÃO PILOTO
**Status:** ⏳ **PARCIALMENTE INICIADA**

**Data de atualização:** 18 de junho de 2026  
**Versão:** 1.0

---

## 📊 RESUMO EXECUTIVO

| Etapa | Objetivo | Status | % Completo |
|-------|----------|--------|-----------|
| **1** | Ambiente Piloto | ❌ NÃO INICIADO | 0% |
| **2** | Empresa Piloto | ❌ NÃO INICIADO | 0% |
| **3** | Operação Assistida | ✅ COMPLETO | 100% |
| **4** | Fiscal Real | ⏳ PARCIAL | 70% |
| **5** | Relatório Final | ⏳ PARCIAL | 60% |

**Recomendação:** Iniciar ETAPA 1 imediatamente para preparar o ambiente de homologação dedicado.

---

## ✅ ETAPA 3 — Operação Assistida [COMPLETO]

**Status:** ✅ Executado e validado  
**Documento:** `RELATORIO_FASE_5.5_OPERACAO_ASSISTIDA.md`

### O que foi feito:
- ✅ Loja simulada como **conveniência real** (bebidas, salgadinhos, cigarro, mercearia)
- ✅ **15 vendas** com 4 formas de pagamento
- ✅ **Compras → recebimento → contas a pagar**
- ✅ **Devoluções** implementadas e testadas
- ✅ **Inventário** com divergência e ajuste
- ✅ **Offline → sincronização** (5 vendas)
- ✅ **Fechamento de caixa** com separação dinheiro/eletrônico

### Problemas encontrados e corrigidos:
| Sev | Item | Status |
|-----|------|--------|
| 🔴 Crítico | Busca por código de barras | ✅ Corrigido |
| 🟠 Alto | Estoque inicial no cadastro | ✅ Corrigido |
| 🟡 Médio | Validação de caixa offline | 📋 Documentado |
| 🔵 Baixo | Mensagem de estoque negativo | 📋 Observado |

### Desempenho validado:
- Operações na casa de **~12ms** (nenhuma lentidão)
- Sem erros, sem trava

---

## 🟠 ETAPA 4 — Fiscal Real [PARCIAL - 70%]

**Status:** ⏳ Backend implementado, faltam credenciais reais  
**Documento:** `RELATORIO_FASE_6_CONSOLIDACAO.md` (Etapa 6.1)

### O que foi feito:
- ✅ Provider **Focus NFe** implementado (`src/fiscal/providers/focusnfe.js`)
- ✅ Contrato `FiscalProvider` com operações: **emissão, consulta, cancelamento, inutilização, DANFE**
- ✅ Mapeia formas de pagamento internas → códigos SEFAZ
- ✅ Validação de configuração (detecta falta de token/CSC/UF)
- ✅ Backend **12/12 aprovado** em homologação interna

### O que falta:
- ❌ **Token Focus NFe** (conta no provedor)
- ❌ **Certificado digital A1** (.pfx) cadastrado no painel da Focus
- ❌ **CSC + token da SEFAZ** e CNPJ habilitado
- ❌ **Emissão real contra SEFAZ** (depende das credenciais acima)

### Próximos passos:
1. Obter credenciais da operadora (Focus NFe / SEFAZ)
2. Inserir em **Config. Fiscal** (`provider_token`, `csc`, `uf`, `ambiente`)
3. Testar em **ambiente de homologação da SEFAZ** antes de produção
4. Validar emissão/cancelamento reais

---

## ❌ ETAPA 1 — Ambiente Piloto [NÃO INICIADO]

**Status:** ❌ A fazer  
**Objetivo:** Preparar servidor de homologação separado do desenvolvimento

### Requisitos a fazer:

#### Infraestrutura
- [ ] **Domínio** — registrar domínio ou subdomínio dedicado (ex.: `piloto.snappay.com`)
- [ ] **HTTPS** — certificado SSL/TLS (Let's Encrypt ou CA corporativa)
- [ ] **Backup** — script automatizado (diário) do banco + arquivos
- [ ] **Logs** — centralizar logs de aplicação e banco
- [ ] **Banco dedicado** — nova instância de banco (não compartilhar com dev)

#### Configuração
- [ ] Servidor separado (VM/VPS ou máquina local isolada)
- [ ] Banco de dados limpo e vazio (não cópia do dev)
- [ ] Variáveis de ambiente isoladas (chaves, URLs)
- [ ] Monitoramento básico (uptime, espaço em disco)

#### Entregáveis
- [ ] Documento: "Ambiente Piloto — Setup Completo"
- [ ] Checklist de preparação (antes de empresa piloto começar)

---

## ❌ ETAPA 2 — Empresa Piloto [NÃO INICIADO]

**Status:** ❌ A fazer  
**Objetivo:** Criar empresa real de teste com dados reais

### Requisitos a fazer:

#### Empresa
- [ ] Cadastrar **empresa piloto** (CNPJ, razão social, endereço)
  - Ex.: "Supermercado Piloto LLC" (fictício ou cliente real)
- [ ] Configurar **imposto local** (ICMS, PIS/COFINS)

#### Produtos
- [ ] Cadastrar **50–200 produtos reais** (variedade: bebidas, alimentos, eletrônicos, higiene)
  - Cada com: código de barras, preço varejo, preço atacado (se aplicável)
  - Categorias: bebidas, alimentos, higiene, eletrônicos, etc.

#### Fornecedores
- [ ] Cadastrar **5–10 fornecedores reais** (bebidas, alimentos, higiene)
  - Dados: CNPJ, contato, condições de pagamento, prazo

#### Clientes
- [ ] Cadastrar **30–50 clientes** de teste
  - Tipos: CPF (varejo), CNPJ (B2B)
  - Alguns com **limite de crédito** (fiado)
  - Alguns com **tabela de preço especial** (atacado)

#### Categorias
- [ ] Estruturar **hierarquia de categorias** (ex.: Bebidas > Refrigerante > Cola)

#### Entregáveis
- [ ] Relatório: "Empresa Piloto — Cadastros Completos"
- [ ] Arquivo de dump (backup do banco piloto)

---

## 🟡 ETAPA 5 — Relatório [PARCIAL - 60%]

**Status:** ⏳ Diagnóstico técnico feito, falta classificação comercial  
**Documentos:** `RELATORIO_FASE_6_CONSOLIDACAO.md`, `RELATORIO_FASE_5.6_OPERACAO_COMERCIAL.md`

### O que foi documentado:
- ✅ Etapas 6.1–6.4 (fiscal, preço, promoções, multi-loja) — diagnóstico técnico
- ✅ 12/12 verificações de homologação aprovadas
- ✅ Especificações funcionais: devoluções, trocas, promoções, fidelidade
- ✅ Problemas encontrados (1 crítico, 1 alto) — corrigidos

### O que falta:

#### Após operação assistida (ETAPA 3):
- [ ] Executar operação por **vários dias** (não apenas simulação única)
  - Vendas reais (não teste)
  - Compras reais
  - Devoluções reais
  - Inventário real
  - Promoções ativas
  - Preços atacado aplicados

#### Após fiscal real (ETAPA 4):
- [ ] Testar emissão fiscal real (NFC-e/SAT)
- [ ] Consultar e cancelar NFC-e
- [ ] Validar DANFE impressa

#### Classificação final:
- [ ] **Bugs críticos** — corrigir antes de implantação comercial
- [ ] **Bugs altos** — corrigir em prazo curto (2–3 sprints)
- [ ] **Melhorias UX** — documentar para próxima versão
- [ ] **Melhorias operacionais** — roadmap de evolução

#### Entregáveis
- [ ] Documento: "Relatório de Implantação Piloto — Classificação Final"
- [ ] Plano de correção (matriz de bugs × data de correção)
- [ ] Recomendação: pronto para implantação comercial? (SIM/NÃO)

---

## 📋 CHECKLIST — O que fazer a seguir

### Semana 1 (18–22/06/2026)
- [ ] **ETAPA 1:** Preparar ambiente piloto (servidor, domínio, HTTPS)
- [ ] Documentar configuração

### Semana 2 (23–29/06/2026)
- [ ] **ETAPA 2:** Cadastrar empresa piloto + 50 produtos + 10 fornecedores + 30 clientes
- [ ] Validar dados de entrada

### Semana 3 (30/06–05/07/2026)
- [ ] **ETAPA 3:** Operação assistida por 5 dias úteis
  - [ ] Dia 1: vendas + compras + caixa
  - [ ] Dia 2: devoluções + trocas
  - [ ] Dia 3: promoções + tabelas de preço
  - [ ] Dia 4: inventário
  - [ ] Dia 5: offline + sincronização
- [ ] Registrar qualquer problema

### Semana 4 (06–12/07/2026)
- [ ] **ETAPA 4:** Fiscal real
  - [ ] Inserir credenciais Focus NFe
  - [ ] Testar emissão NFC-e em homologação SEFAZ
  - [ ] Cancelamento
  - [ ] DANFE

### Semana 5 (13–17/07/2026)
- [ ] **ETAPA 5:** Relatório final
  - [ ] Classificar bugs encontrados
  - [ ] Montar plano de correção
  - [ ] Recomendação de implantação

---

## 🔗 Documentos relacionados

- [RELATORIO_FASE_5.5_OPERACAO_ASSISTIDA.md](RELATORIO_FASE_5.5_OPERACAO_ASSISTIDA.md) — Operação assistida (✅ feito)
- [RELATORIO_FASE_5.6_OPERACAO_COMERCIAL.md](RELATORIO_FASE_5.6_OPERACAO_COMERCIAL.md) — Especificações comerciais
- [RELATORIO_FASE_6_CONSOLIDACAO.md](RELATORIO_FASE_6_CONSOLIDACAO.md) — Backend fiscal/preço/promoções/multi-loja
- [PLANO_FASE_5_OFFLINE_FIRST.md](PLANO_FASE_5_OFFLINE_FIRST.md) — Arquitetura offline

---

## 🎯 Objetivo final

**Preparar o SnapPay para implantação comercial real** com:
- ✅ Ambiente isolado e robusto
- ✅ Empresa piloto em operação por dias/semanas
- ✅ Fiscal real funcionando
- ✅ Todos os problemas documentados e plano de correção pronto
- ✅ Capacidade de suportar carga real

**Restrições mantidas:**
- ❌ Sem TEF (ainda)
- ❌ Sem Tauri (ainda)
- ❌ Sem Self-Checkout (ainda)
- ❌ Sem IA (ainda)
- ❌ Sem App Cliente (ainda)

---

**Próximo passo:** Iniciar ETAPA 1 (Ambiente Piloto) — 18/06/2026
