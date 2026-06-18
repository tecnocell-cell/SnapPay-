// Serviço abstrato de impressão para Terminal PDV (Fase 8)
// Provider mock/log — futuro: ESC/POS (Ethernet/USB)

const fs = require('fs');
const path = require('path');

class PrinterService {
  constructor(config = {}) {
    this.config = config;
    this.provider = config.provider || "MOCK"; // MOCK, ESCPOS_ETHERNET, ESCPOS_USB
    this.logDir = config.logDir || path.join(process.cwd(), 'printer_logs');
    this.garantiaImpressao = true; // Venda não é cancelada se impressão falhar
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Testa conexão com impressora
  async testarImpressora() {
    try {
      const msg = "=== TESTE DE IMPRESSORA ===\n\nSnapPay Terminal PDV\n" + new Date().toLocaleString("pt-BR") + "\n\n✓ Impressora OK\n";
      await this.imprimirTexto(msg);
      return { sucesso: true, mensagem: "Teste enviado com sucesso" };
    } catch (erro) {
      throw new Error(`Teste de impressora falhou: ${erro.message}`);
    }
  }

  // Imprime comprovante (cupom)
  async imprimirComprovante(cupom) {
    try {
      // cupom pode ser um objeto venda ou um texto formatado
      let texto = cupom;
      if (typeof cupom === 'object') {
        // Se for objeto, precisa estar formatado por ReceiptService
        texto = JSON.stringify(cupom, null, 2);
      }
      await this.imprimirTexto(texto);
      return { sucesso: true, mensagem: "Comprovante impresso" };
    } catch (erro) {
      throw new Error(`Falha ao imprimir comprovante: ${erro.message}`);
    }
  }

  // Imprime DANFE NFC-e
  async imprimirDanfeNfce(nota) {
    try {
      const linhas = [
        "════════════════════════════════",
        "   DANFE NFC-e",
        "════════════════════════════════",
        `Nota: ${nota.numero} | Série: ${nota.serie || 'N/A'}`,
        `Chave: ${nota.chave || nota.chave_acesso || "N/A"}`,
        "═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═",
        `Status: ${nota.status || "AUTORIZADO"}`,
        `Emissão: ${new Date().toLocaleString("pt-BR")}`,
        "════════════════════════════════",
        "",
      ];
      await this.imprimirTexto(linhas.join("\n"));
      return { sucesso: true, mensagem: "DANFE impressa" };
    } catch (erro) {
      throw new Error(`Falha ao imprimir DANFE: ${erro.message}`);
    }
  }

  // Abre gaveta (comando ESC/POS em providers reais)
  async abrirGaveta() {
    try {
      const log = `[${new Date().toISOString()}] GAVETA_ABERTA\n`;
      const gavetaLog = path.join(this.logDir, "gaveta.log");
      fs.appendFileSync(gavetaLog, log);
      return { sucesso: true, mensagem: "Gaveta aberta" };
    } catch (erro) {
      throw new Error(`Falha ao abrir gaveta: ${erro.message}`);
    }
  }

  // Imprime texto livre
  async imprimirTexto(texto) {
    try {
      const timestamp = new Date().toISOString();
      const filename = `print_${timestamp.replace(/[:.]/g, "-")}.txt`;
      const filepath = path.join(this.logDir, filename);
      fs.writeFileSync(filepath, texto);
      console.log(`[PRINTER] Mock print: ${filepath}`);
      return { sucesso: true, arquivo: filename };
    } catch (erro) {
      throw new Error(`Falha ao imprimir texto: ${erro.message}`);
    }
  }

  // Obtém status da impressora
  async statusImpressora() {
    try {
      // Mock: verifica se pasta de logs é acessível
      const testFile = path.join(this.logDir, '.test');
      fs.writeFileSync(testFile, '');
      fs.unlinkSync(testFile);

      return {
        sucesso: true,
        disponivel: true,
        status: "ONLINE",
        provider: this.provider,
        timestamp: new Date().toISOString(),
      };
    } catch (erro) {
      return {
        sucesso: false,
        disponivel: false,
        status: "OFFLINE",
        provider: this.provider,
        erro: erro.message,
      };
    }
  }

  // Configurar provider ESC/POS (futuro)
  // Opções: MOCK, ESCPOS_ETHERNET (IP:porta), ESCPOS_USB (/dev/ttyUSB0)
  configurarProvider(tipoProvider, config = {}) {
    this.provider = tipoProvider;
    this.providerConfig = config;
    console.log(`[PRINTER] Provider configurado: ${tipoProvider}`);
  }
}

module.exports = PrinterService;
