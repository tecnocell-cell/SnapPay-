# Interface de Impressão — Terminal PDV

## Arquitetura

```
PDV (venda finalizada)
    ↓
PaymentPrinterService.finalizarVenda()
    ↓
ReceiptService.formatarCupom() — gera template
    ↓
PrinterService.imprimirComprovante() — envia ao provider
    ↓
Provider: MOCK (log) ou ESC/POS (real)
    ↓
AuditService.registrar() — registra evento
    ↓
Gaveta (se dinheiro) + log
```

---

## Fluxos por Forma Pagamento

### DINHEIRO

```
1. Venda finalizada
2. Cupom gerado
3. Imprime comprovante
4. ✅ ABRE GAVETA (comando ESC/POS)
5. Aguarda 3s para operador pegar dinheiro
6. Registra: IMPRESSAO_REALIZADA + GAVETA_ABERTA
```

### PIX

```
1. Venda finalizada
2. Cupom gerado com QR Code PIX
3. Imprime comprovante
4. ❌ NÃO abre gaveta
5. Registra: IMPRESSAO_REALIZADA
```

### CARTÃO

```
1. Venda finalizada
2. Cupom gerado
3. Imprime comprovante
4. ❌ NÃO abre gaveta
5. Máquina de cartão trata autorização
6. Registra: IMPRESSAO_REALIZADA
```

---

## Garantia de Venda

**Princípio:** Venda é válida MESMO SE IMPRESSÃO FALHAR.

### Cenário: Falha de Impressora

```
Venda concluída (estoque baixado, caixa lançado)
    ↓
Impressão falha (ex: sem papel)
    ↓
Resposta:
{
  "sucesso": true,        // Venda registrada
  "mensagem": "Venda concluída, porém ocorreu falha na impressão",
  "cupom_impresso": false,
  "erro_impressao": "Sem papel",
  "podeReimprimir": true
}
    ↓
Operador clica "Reimprimir" na UI
    ↓
PaymentPrinterService.reimprimirUltimoCupom()
```

### Logs

Auditoria registra falha:
```json
{
  "timestamp": "2026-06-18T14:30:45.123Z",
  "tipo": "IMPRESSAO_FALHOU",
  "venda_id": "ABC123",
  "empresa_id": "EMP001",
  "usuario": "Geraldo",
  "terminal_id": "DEVICE-UUID",
  "erro": "Sem papel"
}
```

---

## Classes e Métodos

### PrinterService

Camada abstrata de impressora.

**Construtor:**
```javascript
new PrinterService({
  provider: "MOCK",  // MOCK | ESCPOS_ETHERNET | ESCPOS_USB
  logDir: "./printer_logs"
})
```

**Métodos:**

| Método | Parâmetro | Retorna | Exceção |
|---|---|---|---|
| `testarImpressora()` | - | `{ sucesso, mensagem }` | throws se offline |
| `imprimirComprovante(cupom)` | string ou objeto | `{ sucesso }` | throws se falha |
| `imprimirDanfeNfce(nota)` | objeto nota | `{ sucesso }` | throws se falha |
| `abrirGaveta()` | - | `{ sucesso }` | throws se falha |
| `imprimirTexto(texto)` | string | `{ sucesso, arquivo }` | throws se falha |
| `statusImpressora()` | - | `{ disponivel, status, provider }` | nunca throws |
| `configurarProvider(tipo, config)` | string, object | void | - |

---

### ReceiptService

Gerador de template de cupom.

**Métodos:**

```javascript
const receiptService = new ReceiptService();

// Formatar cupom
const cupom = receiptService.formatarCupom(venda, empresa, operador, nfce);

// Validar cupom antes de imprimir
const { valido, erro } = receiptService.validarCupom(venda);
```

**Template Padrão:**
```
═══════════════════════════════════════
         SnapPay — Terminal PDV
═══════════════════════════════════════

Loja Matriz
CNPJ: 12.345.678/0001-99
Unidade: Matriz

Data: 18/06/2026 14:30:45
Venda: 0001234
Operador: Geraldo

┌─ ITENS ──────────────────────────────┐
Arroz Tipo 1                      5kg    
                              R$ 45,00   

Feijão Carioca                   3kg    
                              R$ 27,00   

└──────────────────────────────────────┘

Subtotal              R$ 72,00
Desconto              R$ -5,00
─────────────────────────────────────────
TOTAL                 R$ 67,00

Pagamento: PIX

───────────────────────────────────────
DOCUMENTO FISCAL
NFC-e: 123456789
Chave: 3526061812345678901234567890123456789012
───────────────────────────────────────

        Obrigado pela compra!
         SnapPay © 2026
═══════════════════════════════════════
```

---

### PaymentPrinterService

Orquestrador de impressão + gaveta.

**Construtor:**
```javascript
new PaymentPrinterService(printerService, auditService);
```

**Métodos:**

| Método | Propósito | Status |
|---|---|---|
| `finalizarVenda(venda, empresa, operador, nfce)` | Fluxo completo impressão + gaveta | ✅ |
| `reimprimirUltimoCupom()` | Reimprimi último cupom | ✅ |
| `imprimirNfce(nota, empresa)` | Imprime DANFE | ✅ |
| `testarImpressora()` | Teste de conexão | ✅ |
| `obterStatusImpressora()` | Status atual | ✅ |

---

### AuditService

Auditoria de impressão.

**Construtor:**
```javascript
new AuditService(db);  // db = conexão PostgreSQL (opcional)
```

**Métodos:**

| Método | Propósito |
|---|---|
| `registrar(tipo, dados)` | Registra evento em log + BD |
| `listarEventos(dataInicio, dataFim)` | Lista eventos por período |
| `gerarRelatorioImpressoes(dataInicio, dataFim)` | Gera relatório |
| `limparLogsAntigos(diasRetencao)` | Remove logs > N dias |

**Tipos de Evento:**
- `IMPRESSAO_REALIZADA`
- `IMPRESSAO_FALHOU`
- `REIMPRESSAO`
- `REIMPRESSAO_FALHOU`
- `GAVETA_ABERTA`
- `IMPRESSAO_NFCE`
- `IMPRESSAO_NFCE_FALHOU`
- `TESTE_IMPRESSORA`
- `TESTE_IMPRESSORA_FALHOU`

---

## Estrutura de Pastas

```
backend/local/printer/
├── printerService.js        # Camada abstrata (MOCK, ESC/POS)
├── receiptService.js        # Gerador de cupom
├── paymentPrinterService.js # Orquestrador (impressão + gaveta)
├── auditService.js          # Auditoria de impressão
├── PRINTER_INTERFACE.md     # Este documento
└── <providers/> (futuro)
    ├── escposEthernet.js
    └── escposUsb.js
```

---

## Roadmap

### Fase 8 (Atual)
- ✅ Mock provider (logs em arquivo)
- ✅ PrinterService abstrato
- ✅ ReceiptService template
- ✅ PaymentPrinterService fluxo
- ✅ AuditService logging
- ✅ Garantia venda (falha impressão)

### Fase 9 (Futuro)
- [ ] ESC/POS Ethernet (IP:porta)
- [ ] ESC/POS USB (/dev/ttyUSB0)
- [ ] Impressora térmica 80mm
- [ ] Cutter automático
- [ ] Logo empresa em cupom
- [ ] QR Code em cupom

### Fase 10 (Futuro)
- [ ] Integração com provider fiscal
- [ ] Autenticação OAuth2 em endpoints
- [ ] Sincronização de auditoria PostgreSQL
- [ ] UI de reimpressão em PDV
- [ ] Dashboard de histórico impressões

---

## Exemplos de Uso

### Exemplo 1: Finalizar venda com impressão

```javascript
const PrinterService = require('./printerService');
const ReceiptService = require('./receiptService');
const PaymentPrinterService = require('./paymentPrinterService');
const AuditService = require('./auditService');

const printer = new PrinterService({ provider: "MOCK" });
const audit = new AuditService();
const paymentPrinter = new PaymentPrinterService(printer, audit);

const venda = {
  numero: "0001234",
  total: 67.50,
  formaPagamento: "DINHEIRO",
  itens: [
    { produto: "Arroz 5kg", preco: 45.00, qtd: 1 },
    { produto: "Feijão 3kg", preco: 22.50, qtd: 1 },
  ],
  subtotal: 67.50,
  desconto: 0,
  acrescimo: 0,
};

const empresa = {
  nome: "Loja Matriz",
  cnpj: "12.345.678/0001-99",
};

try {
  const resultado = await paymentPrinter.finalizarVenda(venda, empresa, "Geraldo");
  console.log(resultado);
  // { sucesso: true, mensagem: "Venda finalizada com sucesso", cupom_impresso: true }
} catch (erro) {
  console.error(erro.message);
}
```

### Exemplo 2: Reimprimir último cupom

```javascript
try {
  const resultado = await paymentPrinter.reimprimirUltimoCupom();
  console.log(resultado);
  // { sucesso: true, mensagem: "Cupom reimpresso com sucesso" }
} catch (erro) {
  console.error("Erro ao reimprimir:", erro.message);
}
```

### Exemplo 3: Listar auditoria

```javascript
const dataInicio = new Date('2026-06-18');
const dataFim = new Date('2026-06-19');

const relatorio = await audit.gerarRelatorioImpressoes(dataInicio, dataFim);
console.log(relatorio);
// {
//   periodo: { inicio, fim },
//   totalEventos: 23,
//   porTipo: {
//     IMPRESSAO_REALIZADA: 20,
//     IMPRESSAO_FALHOU: 2,
//     GAVETA_ABERTA: 20
//   },
//   eventos: [...]
// }
```

---

## Testes

### Teste 1: Impressão com dinheiro

```bash
✓ Venda finalizada
✓ Cupom impresso
✓ Gaveta aberta
✓ Aguarda 3s
✓ Auditoria registra: IMPRESSAO_REALIZADA, GAVETA_ABERTA
```

### Teste 2: Impressão com PIX

```bash
✓ Venda finalizada
✓ Cupom impresso
✓ Gaveta NÃO abre
✓ Auditoria registra: IMPRESSAO_REALIZADA
```

### Teste 3: Falha de impressão

```bash
✓ Venda finalizada
✓ Cupom falha (mock erro)
✓ Retorna: cupom_impresso: false, podeReimprimir: true
✓ Auditoria registra: IMPRESSAO_FALHOU
```

### Teste 4: Reimpressão

```bash
✓ Clica "Reimprimir" na UI
✓ PaymentPrinterService.reimprimirUltimoCupom()
✓ Cupom impresso
✓ Auditoria registra: REIMPRESSAO
```

---

## Observações

1. **Venda > Impressão:** A venda é registrada ANTES de tentar imprimir. Se impressão falhar, venda permanece válida.

2. **Logs Locais:** Todos os eventos são salvos em `./printer_logs/` para auditoria offline.

3. **Provider Mock:** Propositalmente simples para testes sem hardware. Readiness total para ESC/POS real.

4. **Gaveta:** Abre apenas com DINHEIRO. Aguarda 3s para operador pegar as notas.

5. **Compatibilidade:** Funciona em Windows, Linux, macOS com `fs` e `path` nativo.

---

**Pronto para Fase 8.1 — Operação Real Terminal PDV** ✅
