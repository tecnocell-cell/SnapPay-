// Serviço abstrato de impressão para Terminal PDV (Fase 8)
// Provider mock/log — futuro: ESC/POS (Ethernet/USB)

import fs from "fs";
import path from "path";

class PrinterService {
  constructor(config = {}) {
    this.config = config;
    this.provider = config.provider || "MOCK"; // MOCK, ESCPOS_ETHERNET, ESCPOS_USB
    this.logDir = config.logDir || "./printer_logs";
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  async testarImpressora() {
    const msg = "=== TESTE DE IMPRESSORA ===\n\nSnapPay Terminal PDV\n" + new Date().toLocaleString("pt-BR") + "\n\n✓ Impressora OK\n";
    await this.imprimirTexto(msg);
    return { ok: true, mensagem: "Teste enviado" };
  }

  async imprimirComprovante(venda) {
    // venda = { id, valor_total, cliente, itens: [], desconto_total, pagamentos: [] }
    const cliente = venda.cliente || "Consumidor final";
    const data = new Date().toLocaleString("pt-BR");
    const linhas = [
      "════════════════════════════════",
      "   SNAPPAY TERMINAL PDV",
      "════════════════════════════════",
      `Venda #${venda.id} | ${data}`,
      "─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─",
      `Cliente: ${cliente.substring(0, 30)}`,
      "─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─",
    ];

    // itens
    (venda.itens || []).forEach((item) => {
      const nome = (item.nome || "Produto").substring(0, 20);
      const qtd = item.quantidade;
      const unit = (item.preco_unitario || 0).toFixed(2);
      const total = (item.valor_total || 0).toFixed(2);
      linhas.push(`${nome}`);
      linhas.push(`  ${qtd} × R$ ${unit} = R$ ${total}`);
    });

    linhas.push("─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─");
    if (venda.desconto_total > 0) {
      linhas.push(`Desconto: -R$ ${venda.desconto_total.toFixed(2)}`);
    }
    linhas.push(`TOTAL: R$ ${(venda.valor_total || 0).toFixed(2)}`);

    // pagamentos
    if (venda.pagamentos && venda.pagamentos.length > 0) {
      linhas.push("─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─");
      venda.pagamentos.forEach((p) => {
        linhas.push(`${p.forma || "Dinheiro"}: R$ ${(p.valor || 0).toFixed(2)}`);
      });
    }

    linhas.push("════════════════════════════════");
    linhas.push("Obrigado pela compra!");
    linhas.push("");

    const txt = linhas.join("\n");
    await this.imprimirTexto(txt);
    return { ok: true, mensagem: "Comprovante impresso" };
  }

  async imprimirDanfeNfce(nota) {
    // nota = { id, numero, serie, chave_acesso, danfe_url, ... }
    const linhas = [
      "════════════════════════════════",
      "   DANFE NFC-e",
      "════════════════════════════════",
      `Nota: ${nota.numero} | Série: ${nota.serie}`,
      `Chave: ${nota.chave_acesso || "N/A"}`,
      "═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═",
      `Status: ${nota.status}`,
      `URL: ${nota.danfe_url || "Indisponível"}`,
      "════════════════════════════════",
      "",
    ];
    const txt = linhas.join("\n");
    await this.imprimirTexto(txt);
    return { ok: true, mensagem: "DANFE impresso" };
  }

  async abrirGaveta() {
    // Comando ESC/POS: abre gaveta
    // Mock: registra no log
    const log = `[${new Date().toISOString()}] Gaveta aberta\n`;
    fs.appendFileSync(path.join(this.logDir, "gaveta.log"), log);
    return { ok: true };
  }

  async imprimirTexto(texto) {
    // Mock: escreve em arquivo
    const timestamp = new Date().toISOString();
    const filename = `print_${timestamp.replace(/[:.]/g, "-")}.txt`;
    const filepath = path.join(this.logDir, filename);
    fs.writeFileSync(filepath, texto);
    console.log(`[PRINTER] Mock print: ${filepath}`);
    return { ok: true, arquivo: filename };
  }

  async statusImpressora() {
    // Mock: sempre online
    return { ok: true, status: "ONLINE", provider: this.provider };
  }
}

export default PrinterService;
