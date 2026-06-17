// Contrato (interface) que todo provider fiscal deve implementar.
// JS não tem interface formal — esta classe documenta os métodos esperados
// e serve de base. Cada provider real (Nuvem Fiscal, Focus NFe, PlugNotas,
// TecnoSpeed) estende e implementa estes métodos.
//
// Todos os métodos recebem um objeto `ctx` com { config, nota, venda, itens }
// conforme aplicável e devolvem um resultado normalizado:
//   { ok, status, chave_acesso?, protocolo?, motivo?, danfe_url?, xml?, payload }
// onde `status` é um dos: AUTORIZADA, REJEITADA, CANCELADA, CONTINGENCIA.

export class FiscalProvider {
  constructor(config) {
    this.config = config || {};
  }

  get nome() {
    return "BASE";
  }

  // Valida se a configuração fiscal está completa para operar.
  // Retorna { ok: boolean, erros: string[] }
  async validarConfiguracao() {
    throw new Error("validarConfiguracao não implementado");
  }

  // Emite uma NFC-e a partir da venda/itens. Retorna resultado normalizado.
  async emitirNFCe(/* ctx */) {
    throw new Error("emitirNFCe não implementado");
  }

  // Consulta o status atual de uma nota no provedor/SEFAZ.
  async consultarStatus(/* ctx */) {
    throw new Error("consultarStatus não implementado");
  }

  // Cancela uma nota autorizada.
  async cancelarNota(/* ctx */) {
    throw new Error("cancelarNota não implementado");
  }

  // Inutiliza uma faixa de numeração.
  async inutilizarNumeracao(/* ctx */) {
    throw new Error("inutilizarNumeracao não implementado");
  }

  // Gera/retorna a DANFE (URL ou conteúdo).
  async gerarDanfe(/* ctx */) {
    throw new Error("gerarDanfe não implementado");
  }
}
