# Testes Obrigatórios — Fase 8.1 Terminal PDV

**Data:** 2026-06-18  
**Status:** A executar  
**Escopo:** Validar fluxos de impressão, pagamento, auditoria, compatibilidade

---

## 1. TESTE: VENDA COM DINHEIRO

### Objetivo
Validar fluxo completo: venda → impressão → gaveta → auditoria.

### Pré-Requisitos
- App PDV aberto
- Terminal ativo (modo_terminal = true)
- Impressora mock configurada
- Auditoria habilitada

### Passos

1. **Criar venda**
   - Escolher 3 produtos variados
   - Total: R$ 100,00
   - Forma pagamento: DINHEIRO

2. **Finalizar venda**
   - Clicar "Confirmar Venda"
   - Aguardar resposta

3. **Verificar cupom**
   - Cupom impresso em `./printer_logs/`?
   - Contém: empresa, data, hora, operador, total?
   - Contém: "DOCUMENTO NÃO FISCAL"? (se sem NFC-e)

4. **Verificar gaveta**
   - Gaveta foi aberta (comando registrado)?
   - Log em `./printer_logs/gaveta.log`?

5. **Verificar auditoria**
   - Evento `IMPRESSAO_REALIZADA` registrado?
   - Evento `GAVETA_ABERTA` registrado?
   - Logs em `./printer_logs/auditoria.log`?

### Resultado Esperado

```json
{
  "venda": {
    "id": "0001234",
    "total": 100.00,
    "formaPagamento": "DINHEIRO",
    "status": "CONCLUÍDA"
  },
  "cupom": {
    "impresso": true,
    "arquivo": "print_2026-06-18T14-30-45-123.txt"
  },
  "gaveta": {
    "aberta": true,
    "timestamp": "2026-06-18T14:30:45Z"
  },
  "auditoria": [
    {
      "tipo": "IMPRESSAO_REALIZADA",
      "venda_id": "0001234"
    },
    {
      "tipo": "GAVETA_ABERTA"
    }
  ]
}
```

### ✅ Passou? SIM / NÃO

---

## 2. TESTE: VENDA COM PIX

### Objetivo
Validar: impressão SEM gaveta para PIX.

### Pré-Requisitos
- Mesmo que teste anterior
- Forma pagamento: PIX

### Passos

1. **Criar venda com PIX**
   - Produtos: 2x
   - Total: R$ 50,00
   - Forma pagamento: PIX

2. **Finalizar**
   - Clicar "Confirmar Venda"

3. **Verificar cupom**
   - Contém texto "PIX"?
   - Contém referência a QR Code ou código PIX?

4. **Verificar gaveta**
   - ❌ Gaveta NÃO deve abrir
   - Log gaveta.log NÃO deve ter novo evento?

5. **Verificar auditoria**
   - Evento `IMPRESSAO_REALIZADA`?
   - ❌ NÃO deve conter `GAVETA_ABERTA`

### Resultado Esperado

```json
{
  "cupom_impresso": true,
  "gaveta_aberta": false,
  "auditoria_impressao": {
    "tipo": "IMPRESSAO_REALIZADA",
    "sem_gaveta": true
  }
}
```

### ✅ Passou? SIM / NÃO

---

## 3. TESTE: VENDA COM CARTÃO

### Objetivo
Validar: impressão SEM gaveta para cartão.

### Pré-Requisitos
- Mesmo que testes anteriores
- Forma pagamento: CARTÃO CRÉDITO

### Passos

1. **Criar venda com cartão**
   - Produtos: 1x
   - Total: R$ 75,00
   - Forma pagamento: CARTÃO CRÉDITO

2. **Finalizar**
   - Clicar "Confirmar Venda"

3. **Verificar cupom**
   - Contém "CARTÃO"?
   - Contém informação de bandeira (Visa/Mastercard)?

4. **Verificar gaveta**
   - ❌ Gaveta NÃO deve abrir

5. **Verificar auditoria**
   - `IMPRESSAO_REALIZADA`?
   - ❌ Sem `GAVETA_ABERTA`

### Resultado Esperado

```json
{
  "cupom_impresso": true,
  "gaveta_aberta": false,
  "forma_pagamento": "CARTAO_CREDITO"
}
```

### ✅ Passou? SIM / NÃO

---

## 4. TESTE: FALHA DE IMPRESSÃO

### Objetivo
Validar: venda permaneça válida mesmo se impressão falhar.

### Pré-Requisitos
- Modificar PrinterService para simular erro:
  ```javascript
  // printerService.js — forçar erro em testes
  async imprimirComprovante(cupom) {
    throw new Error("Sem papel na impressora");
  }
  ```

### Passos

1. **Criar venda**
   - Produtos: 2x
   - Total: R$ 80,00
   - Forma pagamento: DINHEIRO

2. **Finalizar**
   - Sistema tenta imprimir
   - Erro é lançado: "Sem papel"

3. **Verificar resposta**
   - Status HTTP 200? (sucesso = true apesar do erro)
   - `cupom_impresso: false`?
   - `podeReimprimir: true`?
   - Mensagem: "Venda concluída, porém ocorreu falha..."?

4. **Verificar banco de dados**
   - Venda foi registrada normalmente?
   - Estoque foi baixado?
   - Caixa foi lançado?

5. **Verificar auditoria**
   - Evento `IMPRESSAO_FALHOU`?
   - Motivo: "Sem papel na impressora"?

### Resultado Esperado

```json
{
  "sucesso": true,
  "mensagem": "Venda concluída, porém ocorreu falha na impressão",
  "cupom_impresso": false,
  "erro_impressao": "Sem papel na impressora",
  "podeReimprimir": true,
  "venda_status": "CONCLUÍDA"
}
```

**Importante:** Venda não pode ser cancelada ou marcada como erro. Deve permanecer CONCLUÍDA.

### ✅ Passou? SIM / NÃO

---

## 5. TESTE: REIMPRESSÃO

### Objetivo
Validar: operador consegue reimprimir último cupom.

### Pré-Requisitos
- Teste 4 deve ter sido executado (falha de impressão)
- Restaurar PrinterService para funcionamento normal

### Passos

1. **Na UI, clicar "Reimprimir Último Cupom"**
   - Aparece em algum menu?
   - Ou usar endpoint: `POST /api/terminal/reimprir`

2. **Sistema tenta reimprimir**
   - Cupom é recuperado da memória
   - PaymentPrinterService.reimprimirUltimoCupom()

3. **Verificar cupom**
   - Novo arquivo em `./printer_logs/`?
   - Contém mesmos dados da venda anterior?

4. **Verificar auditoria**
   - Evento `REIMPRESSAO`?
   - Timestamp posterior ao evento `IMPRESSAO_FALHOU`?

### Resultado Esperado

```json
{
  "sucesso": true,
  "mensagem": "Cupom reimpresso com sucesso",
  "venda_id": "0001234",
  "arquivo": "print_2026-06-18T14-35-20-456.txt",
  "auditoria": {
    "tipo": "REIMPRESSAO"
  }
}
```

### ✅ Passou? SIM / NÃO

---

## 6. TESTE: AUDITORIA COMPLETA

### Objetivo
Validar: todos os eventos de impressão são registrados corretamente.

### Pré-Requisitos
- Testes 1-5 executados
- Arquivo `./printer_logs/auditoria.log` preenchido

### Passos

1. **Listar eventos do período**
   - Chamar `AuditService.listarEventos(dataInicio, dataFim)`
   - Deve retornar todos os eventos acumulados

2. **Verificar tipos de eventos**
   - `IMPRESSAO_REALIZADA` (testes 1, 2, 3, 5)
   - `GAVETA_ABERTA` (teste 1)
   - `IMPRESSAO_FALHOU` (teste 4)
   - `REIMPRESSAO` (teste 5)

3. **Gerar relatório**
   - `AuditService.gerarRelatorioImpressoes(dataInicio, dataFim)`
   - Contém: totalEventos, porTipo, lista eventos

4. **Verificar dados de auditoria**
   - Cada evento contém: timestamp, tipo, venda_id, usuario, terminal_id?
   - Campos não devem ser nulos?

### Resultado Esperado

```json
{
  "periodo": {
    "inicio": "2026-06-18T00:00:00Z",
    "fim": "2026-06-18T23:59:59Z"
  },
  "totalEventos": 8,
  "porTipo": {
    "IMPRESSAO_REALIZADA": 4,
    "GAVETA_ABERTA": 1,
    "IMPRESSAO_FALHOU": 1,
    "REIMPRESSAO": 1,
    "TESTE_IMPRESSORA": 1
  },
  "eventos": [
    {
      "timestamp": "2026-06-18T14:30:45Z",
      "tipo": "IMPRESSAO_REALIZADA",
      "venda_id": "0001234",
      "usuario": "Geraldo",
      "terminal_id": "device-uuid-12345"
    }
    // ... mais eventos
  ]
}
```

### ✅ Passou? SIM / NÃO

---

## 7. TESTE: COMPATIBILIDADE WEB ↔ TERMINAL

### Objetivo
Validar: SnapPay Web continua funcionando, SnapPay Terminal não quebrou funcionalidades existentes.

### Pré-Requisitos
- SnapPay Web rodando em navegador normal (sem device_id)
- SnapPay Terminal rodando em quiosque (com device_id)
- Mesmo backend

### Passos

1. **SnapPay Web (browser normal)**
   - Acessar: `http://localhost:5173/`
   - Login com credenciais normais
   - Menu completo visível? (Produtos, Categorias, Estoque, etc)
   - PDV funciona normalmente?
   - Criar venda normalmente?

2. **SnapPay Terminal (quiosque)**
   - Acessar: `http://localhost:5173/terminal`
   - Detecta device_id?
   - Menu reduzido? (PDV, Caixa, Vendas, Clientes)
   - Itens bloqueados não aparecem?
   - PDV imprime com gaveta para dinheiro?

3. **Database compartilhada**
   - Venda criada em Web aparece em Terminal?
   - Venda criada em Terminal aparece em Web?
   - Estoque atualizado em ambos?

4. **Auditoria compartilhada**
   - Eventos registrados por Terminal aparecem em Cloud?
   - Logs em `./printer_logs/` não afetam Web?

### Resultado Esperado

- ✅ Web: menu completo, todas funcionalidades
- ✅ Terminal: menu reduzido, operacional apenas
- ✅ Database: compartilhado, vendas sincronizadas
- ✅ Sem erros no console
- ✅ Build frontend OK

### ✅ Passou? SIM / NÃO

---

## 8. TESTE: OFFLINE-FIRST (PREPARAÇÃO)

### Objetivo
Preparar para testes offline (não é Fase 8.1 completo, mas validar base).

### Pré-Requisitos
- SQLite local iniciado
- Schema SQLite migrado
- Fila de sync vazia

### Passos

1. **Criar venda offline** (preparação)
   - Desconectar internet (desabilitar Ethernet)
   - Criar venda no PDV local
   - ❌ Não sincronizar ainda (é para Fase 8.2)

2. **Verificar fila_sync**
   - Venda foi inserida em `fila_sync` (SQLite local)?
   - status_sync = "PENDENTE"?

3. **Reconectar internet**
   - Sync engine tenta enviar
   - ❌ Não implementado em Fase 8.1

### Resultado Esperado

Validar que base está pronta (venda offline é salva localmente, não sincroniza).

### ✅ Passou? SIM / NÃO

---

## 9. TESTE: MODO TERMINAL BLOQUEIA MENU

### Objetivo
Validar: usuário não consegue sair da área operacional por engano ou propósito.

### Pré-Requisitos
- Terminal ativado (modo_terminal = true)
- Modo quiosque simulado (ou navegação manual)

### Passos

1. **Verificar menu visível**
   - PDV? ✅ Visível
   - Caixa? ✅ Visível
   - Vendas? ✅ Visível
   - Clientes? ✅ Visível
   - Produtos? ❌ Não visível
   - Estoque? ❌ Não visível
   - Auditoria? ❌ Não visível
   - Dashboard? ❌ Não visível

2. **Tentar navegar para página bloqueada**
   - Alterar URL manualmente: `#produtos`
   - Sistema mostra página bloqueada ou redireciona?
   - Log de tentativa de acesso?

3. **Backend bloqueia acesso**
   - Chamar `GET /api/produtos` com X-Device-ID?
   - Resposta: 403 Forbidden ou dados filtrados?

### Resultado Esperado

- Menu reduzido visível
- Páginas bloqueadas não acessíveis
- Backend rejeita requisições não-operacionais com device_id terminal

### ✅ Passou? SIM / NÃO

---

## 10. TESTE: BUILD SEM ERROS

### Objetivo
Validar: frontend e backend compilam sem erros.

### Pré-Requisitos
- Node.js 18+
- npm ou yarn

### Passos

1. **Frontend build**
   ```bash
   cd frontend
   npm run build
   ```
   - ✅ Sem erros de compilação
   - ✅ Sem warnings críticos
   - ✅ Tempo < 5 minutos

2. **Backend syntax**
   ```bash
   cd backend
   node --check src/server.js
   node --check src/routes/terminal.js
   node --check src/routes/fiscal.js
   node --check local/printer/printerService.js
   ```
   - ✅ Todas as rotas

3. **Migrations SQL**
   ```bash
   psql -f migration_17_devolucao_fiscal.sql
   psql -f migration_18_terminal_pdv.sql
   ```
   - ✅ Sem erros

### Resultado Esperado

```
✅ Frontend build OK (dist/ criado)
✅ Backend syntax OK (todos os arquivos)
✅ Migrations OK (tabelas criadas)
✅ Zero erros
✅ Zero warnings críticos
```

### ✅ Passou? SIM / NÃO

---

## RESUMO TESTES

| # | Teste | Resultado | Comentário |
|---|---|---|---|
| 1 | Dinheiro → Gaveta | SIM / NÃO | |
| 2 | PIX → Sem Gaveta | SIM / NÃO | |
| 3 | Cartão → Sem Gaveta | SIM / NÃO | |
| 4 | Falha Impressão | SIM / NÃO | Venda válida mesmo assim |
| 5 | Reimpressão | SIM / NÃO | Cupom recuperado |
| 6 | Auditoria Completa | SIM / NÃO | Eventos registrados |
| 7 | Web ↔ Terminal | SIM / NÃO | Compatibilidade |
| 8 | Offline-First Base | SIM / NÃO | Preparação Fase 8.2 |
| 9 | Menu Bloqueado | SIM / NÃO | Segurança operacional |
| 10 | Build OK | SIM / NÃO | Zero erros |

---

## CRITÉRIO DE ACEITAÇÃO

✅ **PASSOU:** 8+ testes com SIM  
❌ **FALHOU:** Menos de 8 testes com SIM

Testes críticos (1, 4, 6, 10 devem estar 100% SIM).

---

**Testes Obrigatórios — Prontos para Execução** ✅
