# 🗺️ Roadmap - EasySAC PDV Web

## Sprint 1 (Hoje - 16/06/2026) ✅ CONCLUÍDO

### MVP Core
- [x] Instalar SQL Server 2022 Express
- [x] Anexar banco EasySAC.mdf original
- [x] Mapear schema (321 tabelas identificadas)
- [x] Criar banco novo `EasySAC_PDV` com tabelas de PDV
- [x] Importar 50 produtos reais do SAC441
- [x] Backend Node/Express com 3 endpoints
- [x] Frontend React com interface moderna
- [x] Implementar busca de produtos
- [x] Implementar carrinho dinâmico
- [x] Cálculo de impostos automático
- [x] Formas de pagamento (5 opções)
- [x] Cupom fiscal na tela
- [x] Documentação completa

---

## Sprint 2 (17/06-18/06/2026) 🎯 A FAZER

### Escolha UM destes módulos:

#### A) NFC-e / Emissão Fiscal ⭐ RECOMENDADO
**Por quê:** Crítico para loja real, usa schema SEFAZ que já existe no EasySAC

**Implementação:**

1. **Backend - Geração de XML**
   - Criar endpoint `POST /api/vendas/:id/nfce`
   - Usar biblioteca ACBr.NET ou SAT-JS
   - Gerar XML seguindo layout NFCe v5.0
   - Assinar digitalmente (certificado)
   - Enviar para SEFAZ (produção ou simulado)

2. **Frontend - Tela de Emissão**
   - Após finalizar venda, botão "Emitir NFC-e"
   - Validações: produtos, cliente (se crediário), forma pagamento
   - Mostrar número do recibo SEFAZ
   - Opção de reimprimir

3. **Banco de Dados**
   - Tabelas (já mapeadas no EasySAC original):
     - `SAC100` → NFe/NFCe (cabeçalho)
     - `SAC105` → Chaves de acesso
     - `Fiscal/Xml/` → Armazenar XMLs assinados

4. **Testes**
   - Usar ambiente SEFAZ de homologação primeiro
   - Testar com 5 produtos diferentes
   - Validar resposta SEFAZ

**Tempo:** 3-4 horas  
**Prioridade:** ALTA (receita legal)

---

#### B) Relatórios & Dashboard
**Por quê:** Ajuda a entender performance de vendas

**Implementação:**

1. **Backend - Endpoints de Relatório**
   - `GET /api/relatorios/vendas?dataInicio=X&dataFim=Y` → Total vendido por período
   - `GET /api/relatorios/produtos?top=10` → Produtos mais vendidos
   - `GET /api/relatorios/pagamentos` → Formas de pagamento mais usadas
   - `GET /api/relatorios/clientes?limite=50` → Top clientes

2. **Frontend - Dashboard**
   - Gráfico de linhas: Vendas por dia (últimos 30 dias)
   - Gráfico de barras: Top 10 produtos
   - Cards: Total vendido hoje, ticket médio, transações
   - Filtros por data/período

3. **Visualização**
   - Usar Chart.js ou Recharts (React)
   - Cores vibrantes, cards informativos
   - Responsivo em mobile

4. **Testes**
   - Criar 10 vendas de teste
   - Validar cálculos de totais e médias
   - Testar filtros por data

**Tempo:** 2-3 horas  
**Prioridade:** MÉDIA (BI básico)

---

#### C) Gestão de Estoque
**Por quê:** Controlar mínimos, evitar falta

**Implementação:**

1. **Backend - Endpoints**
   - `POST /api/estoque/entrada` → Recebe produto do fornecedor
   - `POST /api/estoque/saida` → Ajuste manual (perda, dano)
   - `GET /api/estoque/alertas` → Produtos com quantidade < mínimo
   - `PUT /api/produtos/:id/estoque-minimo` → Atualizar mínimo

2. **Frontend - Tela de Estoque**
   - Listar produtos com estoque atual vs. mínimo
   - Cores: Verde (ok), Amarelo (atenção), Vermelho (crítico)
   - Botões de entrada/saída
   - Histórico de movimentação

3. **Banco de Dados**
   - Tabela `estoque_movimentacao` (entrada/saída/ajuste)
   - Campo `estoque_minimo` em `produtos`
   - Trigger para alertas automáticos

4. **Testes**
   - Reduzir estoque de produto para < mínimo
   - Verificar alerta aparecer
   - Registrar entrada e ver atualização

**Tempo:** 2 horas  
**Prioridade:** MÉDIA (operacional)

---

#### D) Módulo de Clientes
**Por quê:** Histórico de compras, crédito, mala direta

**Implementação:**

1. **Backend - Endpoints**
   - `GET /api/clientes` → Listar clientes
   - `POST /api/clientes` → Criar cliente
   - `GET /api/clientes/:id/historico` → Compras passadas
   - `PUT /api/clientes/:id/limite-credito` → Atualizar limite
   - `GET /api/clientes/:id/saldo-devedor` → Quanto deve

2. **Frontend - Tela de Clientes**
   - Campo no PDV para "Selecionar Cliente"
   - Busca por nome/CPF/CNPJ
   - Autocomplete ao digitar
   - Histórico de compras do cliente
   - Saldo atual

3. **Banco de Dados**
   - Expandir tabela `clientes` com campos:
     - `limite_credito` (DECIMAL)
     - `saldo_devedor` (DECIMAL)
     - `dt_ultimo_pagamento` (DATETIME)

4. **Testes**
   - Criar 5 clientes de teste
   - Fazer vendas em nome deles
   - Verificar histórico sendo registrado

**Tempo:** 2 horas  
**Prioridade:** MÉDIA (CRM básico)

---

## Sprint 3 (19/06-20/06/2026) 📅 PLANEJADO

### Temas Secundários (após escolher 1 do Sprint 2)

- [ ] Autenticação de usuário (login/senha)
- [ ] Permissões por vendedor (read/write)
- [ ] Integração com TEF (débito/crédito online)
- [ ] Configurações de loja (impostos, dados fiscais)
- [ ] Backup automático do banco

---

## Sprint 4+ (Futuro) 🚀

### Módulos Enterprise

- **Integração SAT** — Cupom fiscal compacto (já existe em `Fiscal/`)
- **PDF NFCe** — Gerar PDF visual do cupom
- **WhatsApp Integration** — Enviar comprovante via WhatsApp (SAC251 tem API key)
- **App Mobile** — PDV mobile com React Native
- **Multi-Loja** — Suporte a múltiplas lojas (SAC251 schema pronto)
- **Financeiro Completo** — Contas a receber/pagar (SAC511, SAC521)
- **Auditoria** — Log de todas operações (compliance)
- **Docker** — Containerizar backend + frontend para deploy

---

## 📊 Dependências Entre Módulos

```
PDV Core (Pronto ✅)
│
├─→ NFC-e (Sprint 2A) ← RECOMENDADO
│   └─→ Auditoria (Sprint 4)
│       └─→ Compliance SEFAZ
│
├─→ Relatórios (Sprint 2B)
│   └─→ Dashboard
│       └─→ Mobile Dashboard
│
├─→ Estoque (Sprint 2C)
│   └─→ Integração Fornecedor (Sprint 3)
│
└─→ Clientes (Sprint 2D)
    └─→ Crediário Automático (Sprint 3)
        └─→ Financeiro (Sprint 4)
```

---

## 🎯 Métricas de Sucesso

| Métrica | Objetivo | Teste |
|---------|----------|-------|
| **Busca de Produto** | < 200ms | Digitar "grill" |
| **Finalização de Venda** | < 500ms | Fazer venda completa |
| **Emissão NFC-e** | < 3s (com SEFAZ) | Emitir cupom |
| **Uptime Backend** | 99.9% | Monitoramento 24h |
| **Interface** | < 3MB (gzipped) | Teste de carga |

---

## 🔄 Checklist Diário

Ao iniciar cada dia, verificar:

- [ ] SQL Server está rodando (`Get-Service MSSQL$SQLEXPRESS`)
- [ ] Backend responde: `curl http://localhost:3001/api/produtos?q=grill`
- [ ] Frontend carrega: http://localhost:5173
- [ ] Banco tem dados: `SELECT COUNT(*) FROM produtos`
- [ ] Último commit foi feito

---

## 💾 Backup Antes de Cada Sprint

```powershell
# Backup do código
git add .
git commit -m "Sprint X checkpoint"

# Backup do banco
sqlcmd -S .\SQLEXPRESS -E -Q "BACKUP DATABASE EasySAC_PDV TO DISK='C:\Backup\EasySAC_PDV_Sprint$(Get-Date -Format yyyyMMdd).bak'"
```

---

## 🎓 Aprendizados

### O que funcionou bem
- ✅ Usar dados reais do EasySAC original (50 produtos)
- ✅ React + Vite para desenvolvimento rápido
- ✅ SQL Server com Windows Auth (simples, sem senha)
- ✅ API simples com 3 endpoints core

### O que pode melhorar
- ⚠️ Cache de produtos (rápido agora, mas vai ficar lento com 10k itens)
- ⚠️ Validações de estoque (impedir overselling)
- ⚠️ Logs e auditoria (quem fez o quê, quando)
- ⚠️ Tratamento de erros mais robusto

---

**Próximo passo:** Escolher um módulo do Sprint 2 e começar amanhã!

