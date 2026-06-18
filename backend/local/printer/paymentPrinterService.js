// Orquestrador de impressão + gaveta por forma de pagamento

import ReceiptService from './receiptService.js';
import PrintHistoryService from './printHistoryService.js';

export default class PaymentPrinterService {
  constructor(printerService, auditService, historyService = null) {
    this.printer = printerService;
    this.audit = auditService;
    this.history = historyService || new PrintHistoryService();
    this.receiptService = new ReceiptService();
    this.ultimoCupom = null;
  }

  // Fluxo principal de finalização de venda
  async finalizarVenda(venda, empresa, operador, nfce = null) {
    const validacao = this.receiptService.validarCupom(venda);
    if (!validacao.valido) {
      throw new Error(`Cupom inválido: ${validacao.erro}`);
    }

    try {
      // 1. Gerar cupom
      const cupom = this.receiptService.formatarCupom(venda, empresa, operador, nfce);
      this.ultimoCupom = { cupom, venda, timestamp: new Date() };

      // 2. Imprimir comprovante
      await this.printer.imprimirComprovante(cupom);
      await this.audit.registrar("IMPRESSAO_REALIZADA", {
        venda_id: venda.id,
        empresa_id: empresa.id,
        usuario: operador,
        terminal_id: process.env.DEVICE_ID || "unknown",
      });

      // 2.5 Registrar cupom no histórico
      await this.history.registrarCupom(venda.id, cupom, {
        forma_pagamento: venda.formaPagamento,
        total: venda.total,
        operador: operador,
        empresa_id: empresa.id,
      });

      // 3. Abrir gaveta conforme forma pagamento
      await this.executarAcaoPagamento(venda.formaPagamento);

      return {
        sucesso: true,
        mensagem: "Venda finalizada com sucesso",
        cupom_impresso: true,
      };
    } catch (erro) {
      // Venda é válida mesmo se impressão falhar
      await this.audit.registrar("IMPRESSAO_FALHOU", {
        venda_id: venda.id,
        empresa_id: empresa.id,
        usuario: operador,
        terminal_id: process.env.DEVICE_ID || "unknown",
        erro: erro.message,
      });

      // Registrar falha no histórico
      await this.history.registrarFalha(venda.id, erro, {
        forma_pagamento: venda.formaPagamento,
        total: venda.total,
        operador: operador,
        empresa_id: empresa.id,
      });

      return {
        sucesso: true, // Venda foi registrada
        mensagem: "Venda concluída, porém ocorreu falha na impressão",
        cupom_impresso: false,
        erro_impressao: erro.message,
        podeReimprimir: true,
      };
    }
  }

  // Lógica de gaveta por forma pagamento
  async executarAcaoPagamento(formaPagamento) {
    switch (formaPagamento.toUpperCase()) {
      case "DINHEIRO":
      case "DINHEIRO FISICO":
        // Abre gaveta e aguarda
        await this.printer.abrirGaveta();
        await this.audit.registrar("GAVETA_ABERTA", {
          forma_pagamento: "DINHEIRO",
          timestamp: new Date(),
        });
        // Aguarda 3 segundos para operador pegar dinheiro
        await this.delay(3000);
        break;

      case "PIX":
      case "TRANSFERENCIA":
        // PIX não abre gaveta
        // Pode adicionar confirmação de pagamento recebido
        break;

      case "CARTAO":
      case "CARTAO CREDITO":
      case "CARTAO DEBITO":
        // Cartão não abre gaveta
        // Máquina de cartão trata autorização
        break;

      case "CHEQUE":
        // Cheque: apenas imprime, sem gaveta
        break;

      default:
        console.warn(`Forma pagamento desconhecida: ${formaPagamento}`);
    }
  }

  // Reimpressão de último cupom
  async reimprimirUltimoCupom() {
    if (!this.ultimoCupom) {
      throw new Error("Nenhum cupom para reimprimir");
    }

    try {
      await this.printer.imprimirComprovante(this.ultimoCupom.cupom);
      const vendaId = this.ultimoCupom.venda.id;

      await this.audit.registrar("REIMPRESSAO", {
        venda_id: vendaId,
        timestamp: new Date(),
      });

      await this.history.registrarReimpressao(vendaId, true);

      return { sucesso: true, mensagem: "Cupom reimpresso com sucesso" };
    } catch (erro) {
      const vendaId = this.ultimoCupom.venda.id;

      await this.audit.registrar("REIMPRESSAO_FALHOU", {
        venda_id: vendaId,
        erro: erro.message,
      });

      await this.history.registrarReimpressao(vendaId, false, erro);

      throw erro;
    }
  }

  // Reimpressão de cupom específico por venda_id
  async reimprimirPorVenda(vendaId, cupomTexto) {
    if (!cupomTexto) {
      throw new Error("Cupom não fornecido");
    }

    try {
      await this.printer.imprimirComprovante(cupomTexto);

      await this.audit.registrar("REIMPRESSAO", {
        venda_id: vendaId,
        timestamp: new Date(),
      });

      await this.history.registrarReimpressao(vendaId, true);

      return { sucesso: true, mensagem: "Cupom reimpresso com sucesso" };
    } catch (erro) {
      await this.audit.registrar("REIMPRESSAO_FALHOU", {
        venda_id: vendaId,
        erro: erro.message,
      });

      await this.history.registrarReimpressao(vendaId, false, erro);

      throw erro;
    }
  }

  // Imprimir NFC-e DANFE
  async imprimirNfce(nota, empresa) {
    if (!nota.numero || !nota.chave) {
      throw new Error("Nota fiscal incompleta para impressão");
    }

    try {
      await this.printer.imprimirDanfeNfce(nota);
      await this.audit.registrar("IMPRESSAO_NFCE", {
        nota_id: nota.id,
        empresa_id: empresa.id,
        numero_nfce: nota.numero,
      });

      return { sucesso: true, mensagem: "DANFE impressa com sucesso" };
    } catch (erro) {
      await this.audit.registrar("IMPRESSAO_NFCE_FALHOU", {
        nota_id: nota.id,
        erro: erro.message,
      });

      throw erro;
    }
  }

  // Status de impressora
  async obterStatusImpressora() {
    try {
      const status = await this.printer.statusImpressora();
      return status;
    } catch (erro) {
      return {
        disponivel: false,
        erro: erro.message,
      };
    }
  }

  // Teste de impressora
  async testarImpressora() {
    try {
      await this.printer.testarImpressora();
      await this.audit.registrar("TESTE_IMPRESSORA", {
        resultado: "OK",
      });

      return { sucesso: true, mensagem: "Impressora testada com sucesso" };
    } catch (erro) {
      await this.audit.registrar("TESTE_IMPRESSORA_FALHOU", {
        erro: erro.message,
      });

      throw erro;
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
