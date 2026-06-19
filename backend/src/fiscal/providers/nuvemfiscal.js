// Provedor Nuvem Fiscal — Integração Real com Homologação
// Emissão, Consulta, Cancelamento, Inutilização de NFC-e

import { FiscalProvider } from "../provider.js";
import axios from "axios";

export class NuvemFiscalProvider extends FiscalProvider {
  constructor(config) {
    super(config);
    this.config = config || {};

    // Endpoints Nuvem Fiscal (Homologação)
    this.baseUrl = this.config.ambiente === "producao"
      ? "https://api.nuvemfiscal.com.br/nfce"
      : "https://homolog-api.nuvemfiscal.com.br/nfce";

    this.token = process.env.NUVEM_FISCAL_TOKEN || this.config.token || null;
    this.ambiente = this.config.ambiente || "homologacao";
    this.csc = process.env.NUVEM_FISCAL_CSC || this.config.csc || null;
    this.cscId = process.env.NUVEM_FISCAL_CSC_ID || this.config.csc_id || null;

    this.credenciaisOK = this.token && this.csc && this.cscId;
  }

  get nome() {
    return "Nuvem Fiscal";
  }

  async validarConfiguracao() {
    const erros = [];

    if (!this.token) {
      erros.push("NUVEM_FISCAL_TOKEN não configurado");
    }
    if (!this.csc) {
      erros.push("NUVEM_FISCAL_CSC não configurado");
    }
    if (!this.cscId) {
      erros.push("NUVEM_FISCAL_CSC_ID não configurado");
    }
    if (!this.config.serie) {
      erros.push("Série NFC-e não configurada");
    }
    if (!this.config.numero_atual && this.config.numero_atual !== 0) {
      erros.push("Numeração NFC-e não configurada");
    }

    return {
      ok: erros.length === 0,
      erros,
      credenciais_ok: this.credenciaisOK,
      ambiente: this.ambiente,
    };
  }

  // Emitir NFC-e para Nuvem Fiscal
  async emitirNFCe(ctx) {
    if (!this.credenciaisOK) {
      return {
        ok: false,
        status: "BLOQUEADO_POR_CREDENCIAIS",
        motivo: "Credenciais Nuvem Fiscal não configuradas. Configure NUVEM_FISCAL_TOKEN, NUVEM_FISCAL_CSC, NUVEM_FISCAL_CSC_ID em variáveis de ambiente.",
        payload: { provider: "nuvem_fiscal", ambiente: this.ambiente },
      };
    }

    const { venda, itens, config } = ctx;

    try {
      // Montar payload NFC-e conforme especificação Nuvem Fiscal
      const payload = this._montarPayloadNFCe(venda, itens, config);

      // Enviar para Nuvem Fiscal
      const response = await axios.post(`${this.baseUrl}/autorizar`, payload, {
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30s timeout
      });

      // Nuvem Fiscal retorna: { id, chave_acesso, protocolo, xml, status, danfe_url }
      if (response.data && response.data.chave_acesso) {
        return {
          ok: true,
          status: response.data.status || "AUTORIZADA", // AUTORIZADA ou CONTINGENCIA
          chave_acesso: response.data.chave_acesso,
          protocolo: response.data.protocolo,
          danfe_url: response.data.danfe_url || null,
          xml: response.data.xml || null,
          payload: response.data,
        };
      } else {
        return {
          ok: false,
          status: "REJEITADA",
          motivo: response.data?.motivo || "Resposta inválida de Nuvem Fiscal",
          payload: response.data,
        };
      }
    } catch (err) {
      // Erro de conexão ou validação
      return {
        ok: false,
        status: "ERRO_COMUNICACAO",
        motivo: err.message || "Erro ao comunicar com Nuvem Fiscal",
        payload: { erro: err.message, provider: "nuvem_fiscal" },
      };
    }
  }

  // Montar payload NFC-e conforme padrão Nuvem Fiscal
  _montarPayloadNFCe(venda, itens, config) {
    const numero = (this.config.numero_atual || 0) + 1;
    const serie = this.config.serie || 1;

    const detalhes = itens.map((item, idx) => ({
      numero_item: idx + 1,
      ncm: item.ncm_codigo || "0",
      cfop: item.cfop_codigo || "5101",
      descricao: item.nome || "Produto",
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto || 0,
      valor_total: item.valor_total,
      cst_icms: item.cst_icms || "000",
      aliquota_icms: item.aliquota_icms || 0,
      valor_icms: item.valor_icms || 0,
      cst_pis: item.cst_pis || "01",
      aliquota_pis: item.aliquota_pis || 0,
      valor_pis: item.valor_pis || 0,
      cst_cofins: item.cst_cofins || "07",
      aliquota_cofins: item.aliquota_cofins || 0,
      valor_cofins: item.valor_cofins || 0,
    }));

    return {
      serie: serie,
      numero: numero,
      data_emissao: new Date().toISOString(),
      cnpj_emitente: config.cnpj || "00000000000000",
      csc: this.csc,
      csc_id: this.cscId,
      detalhes,
      valor_total: venda.valor_total,
      cliente: {
        cpf_cnpj: "00000000000191", // Consumidor genérico
        nome: "Consumidor",
      },
    };
  }

  // Consultar status da NFC-e
  async consultarStatus(ctx) {
    if (!this.credenciaisOK) {
      return {
        ok: false,
        status: "BLOQUEADO_POR_CREDENCIAIS",
        motivo: "Credenciais não configuradas",
      };
    }

    const { chave_acesso } = ctx;

    try {
      const response = await axios.get(
        `${this.baseUrl}/consultar/${chave_acesso}`,
        {
          headers: {
            "Authorization": `Bearer ${this.token}`,
          },
          timeout: 10000,
        }
      );

      return {
        ok: response.data ? true : false,
        status: response.data?.status || "DESCONHECIDO",
        chave_acesso: chave_acesso,
        protocolo: response.data?.protocolo || null,
        payload: response.data,
      };
    } catch (err) {
      return {
        ok: false,
        status: "ERRO_CONSULTA",
        motivo: err.message,
        payload: { erro: err.message },
      };
    }
  }

  // Cancelar NFC-e autorizada
  async cancelarNota(ctx) {
    if (!this.credenciaisOK) {
      return {
        ok: false,
        status: "BLOQUEADO_POR_CREDENCIAIS",
      };
    }

    const { chave_acesso, motivo } = ctx;

    try {
      const response = await axios.post(
        `${this.baseUrl}/cancelar`,
        {
          chave_acesso,
          motivo: motivo || "Cancelamento solicitado",
          csc: this.csc,
          csc_id: this.cscId,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.token}`,
          },
          timeout: 10000,
        }
      );

      return {
        ok: response.data && response.data.status === "CANCELADA",
        status: response.data?.status || "CANCELADA",
        protocolo_cancelamento: response.data?.protocolo || null,
        payload: response.data,
      };
    } catch (err) {
      return {
        ok: false,
        status: "ERRO_CANCELAMENTO",
        motivo: err.message,
        payload: { erro: err.message },
      };
    }
  }

  // Inutilizar numeração
  async inutilizarNumeracao(ctx) {
    if (!this.credenciaisOK) {
      return {
        ok: false,
        status: "BLOQUEADO_POR_CREDENCIAIS",
      };
    }

    const { serie, numero_inicio, numero_fim, motivo } = ctx.faixa || {};

    try {
      const response = await axios.post(
        `${this.baseUrl}/inutilizar`,
        {
          serie,
          numero_inicio,
          numero_fim,
          motivo: motivo || "Inutilização de numeração",
          csc: this.csc,
          csc_id: this.cscId,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.token}`,
          },
          timeout: 10000,
        }
      );

      return {
        ok: response.data && response.data.status === "INUTILIZADO",
        status: response.data?.status || "INUTILIZADO",
        protocolo: response.data?.protocolo || null,
        payload: response.data,
      };
    } catch (err) {
      return {
        ok: false,
        status: "ERRO_INUTILIZACAO",
        motivo: err.message,
        payload: { erro: err.message },
      };
    }
  }

  // Gerar DANFE (PDF)
  async gerarDanfe(ctx) {
    if (!this.credenciaisOK) {
      return {
        ok: false,
        motivo: "Credenciais não configuradas",
        danfe_url: null,
      };
    }

    const { chave_acesso } = ctx.nota || {};

    try {
      // Nuvem Fiscal fornece DANFE em sua API
      const danfe_url = `${this.baseUrl}/danfe/${chave_acesso}`;

      return {
        ok: true,
        danfe_url,
        payload: { chave_acesso, provider: "nuvem_fiscal" },
      };
    } catch (err) {
      return {
        ok: false,
        motivo: err.message,
        danfe_url: null,
      };
    }
  }

  // Teste de conectividade
  async testar() {
    if (!this.credenciaisOK) {
      return {
        ok: false,
        mensagem: "Credenciais não configuradas",
        credenciais_ok: false,
        ambiente: this.ambiente,
      };
    }

    try {
      // Simples GET para verificar autenticação
      const response = await axios.get(`${this.baseUrl}/status`, {
        headers: {
          "Authorization": `Bearer ${this.token}`,
        },
        timeout: 5000,
      });

      return {
        ok: response.status === 200,
        mensagem: `Conectado a Nuvem Fiscal — Ambiente: ${this.ambiente}`,
        credenciais_ok: true,
        ambiente: this.ambiente,
        payload: response.data,
      };
    } catch (err) {
      return {
        ok: false,
        mensagem: `Erro ao conectar: ${err.message}`,
        credenciais_ok: true,
        ambiente: this.ambiente,
        payload: { erro: err.message },
      };
    }
  }
}

export default NuvemFiscalProvider;
