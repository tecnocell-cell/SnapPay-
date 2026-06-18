// Hardware Providers — Interface abstrata para periféricos
// Implementações: MOCK (testes), ESC/POS Ethernet (futuro), USB (futuro)

// ============================================================================
// SCANNER PROVIDER — Leitor de código de barras
// ============================================================================

export class ScannerProvider {
  constructor(config = {}) {
    this.tipo = config.tipo || "MOCK"; // MOCK, USB, ETHERNET
    this.config = config;
  }

  async lerCodigoBarras(timeout = 5000) {
    throw new Error("Método abstrato: implementar em subclasse");
  }

  async testar() {
    throw new Error("Método abstrato: implementar em subclasse");
  }
}

export class ScannerMock extends ScannerProvider {
  constructor() {
    super({ tipo: "MOCK" });
  }

  async lerCodigoBarras(timeout = 5000) {
    // Simular leitura de código de barras
    return {
      codigo: `CODE_${Date.now()}`,
      timestamp: new Date().toISOString(),
      tipo_leitura: "MOCK",
    };
  }

  async testar() {
    return { sucesso: true, mensagem: "Scanner MOCK testado com sucesso" };
  }
}

// ============================================================================
// PRINTER PROVIDER — Impressora térmica
// ============================================================================

export class PrinterProvider {
  constructor(config = {}) {
    this.tipo = config.tipo || "MOCK"; // MOCK, ESCPOS_ETHERNET, ESCPOS_USB
    this.config = config;
  }

  async imprimir(dados) {
    throw new Error("Método abstrato: implementar em subclasse");
  }

  async testar() {
    throw new Error("Método abstrato: implementar em subclasse");
  }

  async obterStatus() {
    throw new Error("Método abstrato: implementar em subclasse");
  }
}

export class PrinterMock extends PrinterProvider {
  constructor() {
    super({ tipo: "MOCK" });
  }

  async imprimir(dados) {
    // Mock: simula impressão registrando em memória
    return {
      sucesso: true,
      bytes_impressos: dados.length,
      timestamp: new Date().toISOString(),
    };
  }

  async testar() {
    return { sucesso: true, mensagem: "Impressora MOCK testada" };
  }

  async obterStatus() {
    return {
      disponivel: true,
      status: "ONLINE",
      papel: "OK",
      temperatura: 60,
    };
  }
}

export class PrinterEscposEthernet extends PrinterProvider {
  constructor(config = {}) {
    super({ tipo: "ESCPOS_ETHERNET" });
    this.ip = config.ip || "192.168.1.100";
    this.porta = config.porta || 9100;
    this.timeout = config.timeout || 5000;
    // Futura integração com biblioteca ESC/POS
  }

  async imprimir(dados) {
    // TODO: Implementar comunicação Ethernet com impressora real
    console.warn(`[ESCPOS_ETHERNET] ${this.ip}:${this.porta} - Impressão não implementada ainda`);
    return { sucesso: false, erro: "Provider não implementado" };
  }

  async testar() {
    // TODO: Testar conexão
    return { sucesso: false, erro: "Provider não implementado" };
  }

  async obterStatus() {
    // TODO: Obter status
    return { disponivel: false, erro: "Provider não implementado" };
  }
}

// ============================================================================
// DRAWER PROVIDER — Gaveta de dinheiro
// ============================================================================

export class DrawerProvider {
  constructor(config = {}) {
    this.tipo = config.tipo || "MOCK"; // MOCK, SERIAL, USB
    this.config = config;
  }

  async abrir() {
    throw new Error("Método abstrato: implementar em subclasse");
  }

  async fechar() {
    throw new Error("Método abstrato: implementar em subclasse");
  }

  async obterStatus() {
    throw new Error("Método abstrato: implementar em subclasse");
  }
}

export class DrawerMock extends DrawerProvider {
  constructor() {
    super({ tipo: "MOCK" });
    this.aberta = false;
  }

  async abrir() {
    this.aberta = true;
    return {
      sucesso: true,
      timestamp: new Date().toISOString(),
      status: "ABERTA",
    };
  }

  async fechar() {
    this.aberta = false;
    return {
      sucesso: true,
      timestamp: new Date().toISOString(),
      status: "FECHADA",
    };
  }

  async obterStatus() {
    return {
      aberta: this.aberta,
      tipo: "MOCK",
    };
  }
}

export class DrawerSerialRJ11 extends DrawerProvider {
  constructor(config = {}) {
    super({ tipo: "SERIAL_RJ11" });
    this.porta = config.porta || "COM1";
    // Futura integração com biblioteca de serial
  }

  async abrir() {
    // TODO: Implementar comando RJ11
    console.warn(`[DRAWER_SERIAL] ${this.porta} - Comando não implementado ainda`);
    return { sucesso: false, erro: "Provider não implementado" };
  }

  async fechar() {
    // TODO: Implementar comando RJ11
    return { sucesso: false, erro: "Provider não implementado" };
  }

  async obterStatus() {
    return { disponivel: false, erro: "Provider não implementado" };
  }
}

// ============================================================================
// SCALE PROVIDER — Balança digital
// ============================================================================

export class ScaleProvider {
  constructor(config = {}) {
    this.tipo = config.tipo || "MOCK"; // MOCK, SERIAL_RS232, USB, ETHERNET
    this.config = config;
  }

  async lerPeso() {
    throw new Error("Método abstrato: implementar em subclasse");
  }

  async tararBalanca() {
    throw new Error("Método abstrato: implementar em subclasse");
  }

  async obterStatus() {
    throw new Error("Método abstrato: implementar em subclasse");
  }
}

export class ScaleMock extends ScaleProvider {
  constructor() {
    super({ tipo: "MOCK" });
  }

  async lerPeso() {
    // Simular leitura de balança (peso aleatório)
    const pesoGramas = Math.floor(Math.random() * 5000) + 100; // 100-5100g
    return {
      peso_gramas: pesoGramas,
      peso_kg: (pesoGramas / 1000).toFixed(3),
      timestamp: new Date().toISOString(),
      tipo: "MOCK",
    };
  }

  async tararBalanca() {
    return {
      sucesso: true,
      mensagem: "Balança tarada (MOCK)",
      timestamp: new Date().toISOString(),
    };
  }

  async obterStatus() {
    return {
      disponivel: true,
      status: "OK",
      tipo: "MOCK",
    };
  }
}

export class ScaleSerialRS232 extends ScaleProvider {
  constructor(config = {}) {
    super({ tipo: "SERIAL_RS232" });
    this.porta = config.porta || "COM1";
    this.baudRate = config.baudRate || 9600;
    // Futura integração com serial-port library
  }

  async lerPeso() {
    // TODO: Implementar leitura serial
    console.warn(`[SCALE_SERIAL] ${this.porta} - Leitura não implementada ainda`);
    return { sucesso: false, erro: "Provider não implementado" };
  }

  async tararBalanca() {
    // TODO: Enviar comando de tara
    return { sucesso: false, erro: "Provider não implementado" };
  }

  async obterStatus() {
    return { disponivel: false, erro: "Provider não implementado" };
  }
}

// ============================================================================
// HARDWARE SERVICE — Centraliza todos periféricos
// ============================================================================

export default class HardwareService {
  constructor(config = {}) {
    const tipoScanner = config.scanner?.tipo || "MOCK";
    const tipoPrinter = config.printer?.tipo || "MOCK";
    const tipoDrawer = config.drawer?.tipo || "MOCK";
    const tipoScale = config.scale?.tipo || "MOCK";

    // Inicializar providers conforme tipo
    this.scanner = this.criarScanner(tipoScanner, config.scanner);
    this.printer = this.criarPrinter(tipoPrinter, config.printer);
    this.drawer = this.criarDrawer(tipoDrawer, config.drawer);
    this.scale = this.criarScale(tipoScale, config.scale);
  }

  criarScanner(tipo, config = {}) {
    switch (tipo.toUpperCase()) {
      case "MOCK":
        return new ScannerMock();
      // case "USB":
      //   return new ScannerUSB(config);
      // case "ETHERNET":
      //   return new ScannerEthernet(config);
      default:
        return new ScannerMock();
    }
  }

  criarPrinter(tipo, config = {}) {
    switch (tipo.toUpperCase()) {
      case "MOCK":
        return new PrinterMock();
      case "ESCPOS_ETHERNET":
        return new PrinterEscposEthernet(config);
      // case "ESCPOS_USB":
      //   return new PrinterEscposUSB(config);
      default:
        return new PrinterMock();
    }
  }

  criarDrawer(tipo, config = {}) {
    switch (tipo.toUpperCase()) {
      case "MOCK":
        return new DrawerMock();
      case "SERIAL_RJ11":
        return new DrawerSerialRJ11(config);
      // case "USB":
      //   return new DrawerUSB(config);
      default:
        return new DrawerMock();
    }
  }

  criarScale(tipo, config = {}) {
    switch (tipo.toUpperCase()) {
      case "MOCK":
        return new ScaleMock();
      case "SERIAL_RS232":
        return new ScaleSerialRS232(config);
      // case "USB":
      //   return new ScaleUSB(config);
      // case "ETHERNET":
      //   return new ScaleEthernet(config);
      default:
        return new ScaleMock();
    }
  }

  async testarTodos() {
    const resultados = {
      scanner: { tipo: this.scanner.tipo },
      printer: { tipo: this.printer.tipo },
      drawer: { tipo: this.drawer.tipo },
      scale: { tipo: this.scale.tipo },
    };

    try {
      resultados.scanner.teste = await this.scanner.testar();
    } catch (e) {
      resultados.scanner.erro = e.message;
    }

    try {
      resultados.printer.teste = await this.printer.testar();
    } catch (e) {
      resultados.printer.erro = e.message;
    }

    try {
      resultados.drawer.status = await this.drawer.obterStatus();
    } catch (e) {
      resultados.drawer.erro = e.message;
    }

    try {
      resultados.scale.teste = await this.scale.testar();
    } catch (e) {
      resultados.scale.erro = e.message;
    }

    return resultados;
  }
}
