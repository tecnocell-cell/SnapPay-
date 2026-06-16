# 🏪 EasySAC PDV Web

**Status:** MVP funcionando ✅ | **Data:** 16/06/2026 | **Última atualização:** 18:08

## 📋 Situação Atual

Um **PDV web moderno e funcional** foi criado a partir do EasySAC (sistema desktop legado em Delphi). O sistema já:

✅ Busca produtos em tempo real  
✅ Adiciona itens ao carrinho  
✅ Calcula impostos automaticamente (ICMS 12%, PIS 1.65%, COFINS 7.6%)  
✅ Suporta múltiplas formas de pagamento (DINHEIRO, DÉBITO, CRÉDITO, PIX, CREDIÁRIO)  
✅ Finaliza vendas e salva no banco  
✅ Gera cupom fiscal na tela  
✅ Interface limpa e moderna (sem visual Delphi)  

---

## 🗂️ Estrutura do Projeto

```
C:\Users\root\Documents\Projetos\EasySAC-Web\
│
├── backend/
│   ├── src/
│   │   ├── server.js          (API Express - 3 endpoints)
│   │   └── db.js              (Conexão SQL Server com ODBC Driver 17)
│   ├── schema.sql             (DDL: produtos, vendas, clientes, pagamentos)
│   ├── .env                   (Credenciais SQL Server)
│   ├── package.json
│   ├── test-odbc.js           (Teste de conexão)
│   └── node_modules/          (mssql v11, express, cors, dotenv, msnodesqlv8)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            (Componente principal - React)
│   │   ├── App.css            (Design moderno - grid de produtos + carrinho)
│   │   └── main.jsx
│   ├── package.json           (Vite, React)
│   ├── vite.config.js
│   └── node_modules/
│
├── README.md                  (Este arquivo)
└── ROADMAP.md                 (Próximos passos)
```

---

## 🔧 Tecnologias Usadas

| Layer | Tecnologia | Versão |
|-------|-----------|--------|
| **Frontend** | React + Vite | 19.1, 6.0 |
| **Backend** | Node.js + Express | 24.14, 4.19 |
| **Banco** | SQL Server 2022 Express | 16.0 |
| **Driver** | ODBC Driver 17 for SQL Server + msnodesqlv8 | 5.2 |
| **Autenticação** | Windows Integrated (Trusted Connection) | - |

---

## 🚀 Como Iniciar

### 1️⃣ Backend (API)

```bash
cd C:\Users\root\Documents\Projetos\EasySAC-Web\backend
npm run dev
```

**Esperado:** `API do PDV rodando em http://localhost:3001`

### 2️⃣ Frontend (React)

```bash
cd C:\Users\root\Documents\Projetos\EasySAC-Web\frontend
npm run dev
```

**Esperado:** `VITE v6.0.0 ready in 123 ms`  
**Acesso:** http://localhost:5173

---

## 📡 API Endpoints

### **GET /api/produtos?q=termo**
Busca produtos por nome, código de barras ou código.

**Resposta:**
```json
[
  {
    "id": 1,
    "codigo": "1",
    "barras": "7899882305845",
    "nome": "GRILL MASTER PRESS MONDIAL...",
    "unidade": "UN",
    "preco_venda": 259.9,
    "estoque_atual": 10
  }
]
```

### **POST /api/vendas**
Cria uma venda com itens e pagamentos.

**Request:**
```json
{
  "clienteId": null,
  "itens": [
    {
      "produtoId": 1,
      "quantidade": 2,
      "precoUnitario": 259.9,
      "desconto": 0
    }
  ],
  "pagamentos": [
    {
      "forma": "DINHEIRO",
      "valor": 747.8
    }
  ]
}
```

**Resposta:**
```json
{
  "id": 1,
  "total": 747.8
}
```

### **GET /api/vendas/:id**
Consulta venda com itens detalhados.

**Resposta:**
```json
{
  "venda": {
    "id": 1,
    "cliente_id": null,
    "status": "FINALIZADA",
    "valor_total": 747.8,
    "aberta_em": "2026-06-16T21:00:37.077Z",
    "finalizada_em": "2026-06-16T21:00:37.091Z"
  },
  "itens": [
    {
      "id": 1,
      "produto_id": 1,
      "quantidade": 2,
      "preco_unitario": 259.9,
      "desconto": 0,
      "valor_total": 519.8,
      "nome": "GRILL MASTER..."
    }
  ]
}
```

---

## 🗄️ Banco de Dados

**Servidor:** `localhost\SQLEXPRESS`  
**Banco:** `EasySAC_PDV`  
**Conexão:** Windows Integrated (sem senha)  

### Tabelas

| Tabela | Descrição | Registros |
|--------|-----------|-----------|
| `produtos` | Catálogo (50 produtos reais importados do EasySAC.SAC441) | 50 |
| `clientes` | Cadastro de clientes | 0 (vazio, pronto para usar) |
| `vendas` | Cabeçalho de venda | Crescente |
| `venda_itens` | Itens da venda (referencia vendas + produtos) | Crescente |
| `venda_pagamentos` | Formas de pagamento por venda | Crescente |

### Coluna de Impostos

Os impostos **não estão no banco** — são **calculados na memória** do frontend:

```javascript
const icms = subtotal * 0.12;      // 12%
const pis = subtotal * 0.0165;     // 1.65%
const cofins = subtotal * 0.076;   // 7.6%
const total = subtotal + icms + pis + cofins;
```

---

## 📊 Dados Reais

Os **50 produtos** foram importados do banco original `EasySAC.mdf` (tabela `SAC441`):

- Eletrodomésticos (grills, sanduicheiras, etc.)
- Móveis (cadeiras)
- Acessórios (guarda-chuvas)
- Preços reais de varejo

**Comando de importação usado:**
```sql
INSERT INTO EasySAC_PDV.dbo.produtos (codigo, barras, nome, unidade, preco_custo, preco_venda, estoque_atual)
SELECT TOP 50
    CAST(CDPROD AS NVARCHAR(20)),
    BARRAS,
    LEFT(NOMPRO, 120),
    ISNULL(UNIDAD, 'UN'),
    ISNULL(PCUSTO, 0),
    CASE WHEN PVENDA > 0 THEN PVENDA ELSE PCUSTO * 1.4 END,
    10
FROM EasySAC.dbo.SAC441
WHERE NOMPRO IS NOT NULL AND BARRAS IS NOT NULL
ORDER BY CDPROD;
```

---

## 🎨 Interface

**Layout:** 2 colunas
- **Esquerda (70%):** Grid de produtos + busca
- **Direita (30%):** Carrinho sidebar + resumo fiscal + pagamento

**Recursos:**
- Busca em tempo real (debounce automático)
- Grid responsivo (adapta quantidade de colunas)
- Carrinho com +/- quantidade
- Cálculo automático de impostos
- Cupom fiscal ao finalizar (tela verde com resumo)

---

## 🔐 Credenciais & Configuração

### SQL Server
- **Server:** `localhost\SQLEXPRESS`
- **Database:** `EasySAC_PDV`
- **Auth:** Windows Integrated (Trusted Connection)
- **Driver:** ODBC Driver 17 for SQL Server
- **Port:** 1433 (default)

### .env (backend)
```
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=EasySAC_PDV
PORT=3001
```

---

## 🧪 Como Testar

### Teste Rápido (via cURL)

```bash
# 1. Buscar produtos
curl "http://localhost:3001/api/produtos?q=grill"

# 2. Criar venda
curl -X POST "http://localhost:3001/api/vendas" \
  -H "Content-Type: application/json" \
  -d '{"itens":[{"produtoId":1,"quantidade":2,"precoUnitario":259.9,"desconto":0}],"pagamentos":[{"forma":"DINHEIRO","valor":747.8}]}'

# 3. Consultar venda
curl "http://localhost:3001/api/vendas/1"
```

### Teste via Browser

1. Abra http://localhost:5173
2. Digite "grill" no campo de busca
3. Clique em um produto para adicionar
4. Altere quantidade (input no carrinho)
5. Escolha forma de pagamento
6. Clique "FINALIZAR VENDA"
7. Veja o cupom aparecer

---

## 🐛 Possíveis Problemas

| Problema | Solução |
|----------|---------|
| "ODBC Connection failed" | Verificar se SQL Server está rodando: `Get-Service MSSQL$SQLEXPRESS` |
| Porta 3001 já em uso | Mudar porta no .env ou matar processo: `netstat -ano \| find ":3001"` |
| Porta 5173 já em uso | Vite escolhe porta sequencial automaticamente |
| Produtos não aparecem | Testar API com `curl http://localhost:3001/api/produtos?q=grill` |

---

## 📝 O Que Falta (Próximos Passos)

### 🔴 Prioridade Alta (MVP+)
- [ ] **NFC-e/Cupom Fiscal** — Emissão eletrônica com assinatura digital (SEFAZ)
- [ ] **Módulo de Clientes** — Cadastro, busca, histórico de compras
- [ ] **Relatórios** — Vendas por período, top produtos, faturamento
- [ ] **Gestão de Estoque** — Entrada/saída, alertas de mínimo

### 🟡 Prioridade Média
- [ ] **Autenticação de Usuário** — Login/permissões por vendedor
- [ ] **Módulo Financeiro** — Contas a receber/pagar (SAC511)
- [ ] **Integração com TEF** — Débito/crédito em tempo real
- [ ] **Dashboard** — KPIs e gráficos de vendas

### 🟢 Prioridade Baixa
- [ ] **PDV Mobile** — React Native para vendedores em piso
- [ ] **Múltiplas Lojas** — Suporte a multi-loja (SAC251)
- [ ] **Sincronização** — Offline-first com WebSync
- [ ] **Impressora Térmica** — Conexão com impressora SAT/ECF

---

## 📂 Arquivos Importantes

| Arquivo | Propósito | Última edição |
|---------|-----------|---------------|
| `backend/src/server.js` | Lógica da API (3 endpoints) | 16/06 18:00 |
| `frontend/src/App.jsx` | Componente principal React | 16/06 18:05 |
| `frontend/src/App.css` | Design moderno (grid + sidebar) | 16/06 18:05 |
| `backend/schema.sql` | DDL do banco | 16/06 16:30 |
| `backend/.env` | Credenciais SQL Server | 16/06 16:30 |

---

## 💾 Backup & Exportação

Banco `EasySAC_PDV` pode ser:

**Backup full:**
```bash
sqlcmd -S .\SQLEXPRESS -E -Q "BACKUP DATABASE EasySAC_PDV TO DISK='C:\Backup\EasySAC_PDV.bak'"
```

**Exportar schema:**
```bash
sqlcmd -S .\SQLEXPRESS -E -d EasySAC_PDV -Q "sp_helptext sp_spaceused" > schema_backup.txt
```

---

## 🎯 Objetivo Final

Transformar o EasySAC (sistema Delphi legado de 2010) em uma **aplicação web moderna** que:

- ✅ Roda em qualquer navegador (Chrome, Edge, Firefox)
- ✅ Usa 100% dos dados reais do EasySAC
- ✅ Melhora o UX (interface intuitiva vs. Delphi antigo)
- ✅ Escalável (cloud-ready, multi-tenant potencial)
- ✅ Mantém compatibilidade fiscal (SEFAZ, NFe, NFCe, SAT)

---

## 📞 Próximas Ações (Amanhã)

**Escolha um modulo para implementar:**

1. **NFC-e/Emissão Fiscal** (3-4h) — Usa schema SEFAZ já presente no EasySAC
2. **Relatórios Dashboard** (2-3h) — Gráficos de vendas por período
3. **Gestão Estoque** (2h) — Entrada/saída, alertas
4. **Módulo Clientes** (2h) — Cadastro completo + histórico

---

**Criado:** 16/06/2026 18:08  
**Projeto:** C:\Users\root\Documents\Projetos\EasySAC-Web\  
**Status:** Pronto para continuar amanhã ✅
