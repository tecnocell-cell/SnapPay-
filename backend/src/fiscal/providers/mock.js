import { FiscalProvider } from "../provider.js";
import crypto from "crypto";

// Provider de homologação/teste. Simula o comportamento da SEFAZ sem
// comunicação real. Permite testar todo o fluxo (autorização, rejeição,
// cancelamento, inutilização) de forma determinística.
//
// Controle de simulação (opcional) via ctx.simular:
//   "AUTORIZAR" (padrão) | "REJEITAR" | "CONTINGENCIA"
export class MockFiscalProvider extends FiscalProvider {
  get nome() {
    return "MOCK";
  }

  async validarConfiguracao() {
    const c = this.config || {};
    const erros = [];
    if (!c.serie && c.serie !== 0) erros.push("Série não configurada");
    if (!c.ambiente) erros.push("Ambiente não configurado");
    // No mock o CSC/certificado são opcionais (não vai à SEFAZ).
    return { ok: erros.length === 0, erros };
  }

  _chaveFake() {
    // 44 dígitos simulados (formato da chave de acesso NF-e).
    let s = "";
    for (let i = 0; i < 44; i++) s += Math.floor(Math.random() * 10);
    return s;
  }

  async emitirNFCe(ctx) {
    const simular = (ctx && ctx.simular) || "AUTORIZAR";

    if (simular === "REJEITAR") {
      return {
        ok: false,
        status: "REJEITADA",
        motivo: "Rejeição simulada (mock): valor/CFOP inválido [cStat 539]",
        payload: { mock: true, simular },
      };
    }

    if (simular === "CONTINGENCIA") {
      return {
        ok: true,
        status: "CONTINGENCIA",
        chave_acesso: this._chaveFake(),
        protocolo: null,
        motivo: "Emitida em contingência (mock)",
        payload: { mock: true, simular },
      };
    }

    // AUTORIZAR (padrão)
    const chave = this._chaveFake();
    return {
      ok: true,
      status: "AUTORIZADA",
      chave_acesso: chave,
      protocolo: "MOCK" + crypto.randomBytes(6).toString("hex").toUpperCase(),
      danfe_url: `/mock/danfe/${chave}.pdf`,
      xml: `<nfeProc mock="true"><chave>${chave}</chave></nfeProc>`,
      payload: { mock: true, simular },
    };
  }

  async consultarStatus(ctx) {
    // No mock, o status persistido é a verdade.
    return {
      ok: true,
      status: ctx?.nota?.status || "AUTORIZADA",
      payload: { mock: true },
    };
  }

  async cancelarNota(ctx) {
    if (ctx?.nota?.status !== "AUTORIZADA") {
      return { ok: false, status: ctx?.nota?.status, motivo: "Só é possível cancelar nota AUTORIZADA", payload: { mock: true } };
    }
    return {
      ok: true,
      status: "CANCELADA",
      protocolo: "MOCKCANC" + crypto.randomBytes(5).toString("hex").toUpperCase(),
      payload: { mock: true },
    };
  }

  async inutilizarNumeracao(ctx) {
    return {
      ok: true,
      protocolo: "MOCKINUT" + crypto.randomBytes(5).toString("hex").toUpperCase(),
      payload: { mock: true, faixa: ctx?.faixa || null },
    };
  }

  async gerarDanfe(ctx) {
    const chave = ctx?.nota?.chave_acesso;
    if (!chave) return { ok: false, motivo: "Nota sem chave de acesso", payload: { mock: true } };
    return { ok: true, danfe_url: `/mock/danfe/${chave}.pdf`, payload: { mock: true } };
  }
}
