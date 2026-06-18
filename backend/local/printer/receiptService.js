// Serviço de geração de cupom — template estruturado

export default class ReceiptService {
  constructor() {
    this.larguraPapel = 80; // caracteres, padrão ESC/POS
  }

  // Template cupom padrão
  formatarCupom(venda, empresa, operador, nfce = null) {
    const linhas = [];

    // Cabeçalho
    linhas.push(this.centralizar("═".repeat(40)));
    linhas.push(this.centralizar("SnapPay — Terminal PDV"));
    linhas.push(this.centralizar("═".repeat(40)));

    // Empresa
    linhas.push("");
    linhas.push(this.truncar(`${empresa.nome}`));
    linhas.push(this.truncar(`CNPJ: ${empresa.cnpj}`));
    linhas.push(this.truncar(`Unidade: ${venda.unidade}`));

    // Data/Hora/Venda
    linhas.push("");
    const agora = new Date();
    const dataStr = agora.toLocaleDateString("pt-BR");
    const horaStr = agora.toLocaleTimeString("pt-BR");
    linhas.push(this.truncar(`Data: ${dataStr} ${horaStr}`));
    linhas.push(this.truncar(`Venda: ${venda.numero}`));
    linhas.push(this.truncar(`Operador: ${operador}`));

    // Itens
    linhas.push("");
    linhas.push("┌─ ITENS " + "─".repeat(32) + "┐");

    venda.itens.forEach((item) => {
      linhas.push(
        `${item.produto.substr(0, 30).padEnd(30)} ${item.qtd}x`.substr(0, 40)
      );
      const precoTotal = (item.preco * item.qtd).toFixed(2);
      linhas.push(
        `${precoTotal.padStart(40 - 2)} `.padEnd(40)
      );
    });

    linhas.push("└" + "─".repeat(41) + "┘");

    // Totalizadores
    linhas.push("");
    linhas.push(this.linha("Subtotal", venda.subtotal.toFixed(2)));
    if (venda.desconto > 0) {
      linhas.push(this.linha("Desconto", `-${venda.desconto.toFixed(2)}`));
    }
    if (venda.acrescimo > 0) {
      linhas.push(this.linha("Acréscimo", `+${venda.acrescimo.toFixed(2)}`));
    }
    linhas.push("─".repeat(40));
    linhas.push(this.linha("TOTAL", venda.total.toFixed(2), true));

    // Pagamento
    linhas.push("");
    linhas.push(this.centralizar(`Pagamento: ${venda.formaPagamento}`));
    if (venda.formaPagamento === "CARTAO") {
      linhas.push(this.centralizar(`Bandeira: ${venda.bandeira || "N/A"}`));
    } else if (venda.formaPagamento === "PIX") {
      linhas.push(this.centralizar(`Código QR: [PIX QR CODE]`));
    }

    // NFC-e ou aviso
    linhas.push("");
    if (nfce && nfce.numero) {
      linhas.push(this.centralizar("DOCUMENTO FISCAL"));
      linhas.push(this.centralizar(`NFC-e: ${nfce.numero}`));
      linhas.push(this.centralizar(`Chave: ${nfce.chave}`));
    } else {
      linhas.push(this.centralizar("─".repeat(40)));
      linhas.push(this.centralizar("DOCUMENTO NÃO FISCAL"));
      linhas.push(this.centralizar("─".repeat(40)));
    }

    // Rodapé
    linhas.push("");
    linhas.push(this.centralizar("Obrigado pela compra!"));
    linhas.push(this.centralizar("SnapPay © 2026"));
    linhas.push(this.centralizar("═".repeat(40)));

    return linhas.join("\n");
  }

  // Formatação auxiliar
  centralizar(texto) {
    const espaco = Math.max(0, Math.floor((this.larguraPapel - texto.length) / 2));
    return " ".repeat(espaco) + texto;
  }

  truncar(texto, max = this.larguraPapel) {
    return texto.substr(0, max).padEnd(max);
  }

  linha(label, valor, destaque = false) {
    const espaco = Math.max(1, this.larguraPapel - label.length - valor.length);
    const texto = label + " ".repeat(espaco) + valor;
    if (destaque) {
      return `║ ${texto.substr(0, this.larguraPapel - 2)} ║`;
    }
    return texto.substr(0, this.larguraPapel);
  }

  // Validação de cupom
  validarCupom(venda) {
    if (!venda.numero) return { valido: false, erro: "Número de venda obrigatório" };
    if (!venda.itens || venda.itens.length === 0) return { valido: false, erro: "Nenhum item na venda" };
    if (venda.total <= 0) return { valido: false, erro: "Total inválido" };
    if (!venda.formaPagamento) return { valido: false, erro: "Forma pagamento obrigatória" };

    return { valido: true };
  }
}
