import { FiscalProvider } from "../provider.js";

// Provider real Focus NFe (NFC-e modelo 65). API REST com autenticação HTTP
// Basic (token como usuário, senha vazia). Documentação: https://focusnfe.com.br/doc
//
// REQUISITOS PARA OPERAR (configurados pelo cliente, não no código):
//  - token do provedor (fiscal_configuracoes.provider_token)
//  - certificado digital A1 cadastrado no painel da Focus
//  - empresa habilitada na SEFAZ + CSC (fiscal_configuracoes.csc / csc_id)
//
// Sem essas credenciais a emissão real não ocorre — use o provider MOCK em
// homologação interna.
export class FocusNFeProvider extends FiscalProvider {
  get nome() {
    return "FOCUS_NFE";
  }

  _baseUrl() {
    return (this.config.ambiente === "PRODUCAO")
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";
  }

  _authHeader() {
    // Basic com token como usuário e senha vazia
    const token = this.config.provider_token || "";
    return "Basic " + Buffer.from(token + ":").toString("base64");
  }

  async _req(method, path, body) {
    const res = await fetch(this._baseUrl() + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: this._authHeader() },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = JSON.parse(await res.text()); } catch {}
    return { httpStatus: res.status, data };
  }

  async validarConfiguracao() {
    const erros = [];
    if (!this.config.provider_token) erros.push("Token da Focus NFe não configurado");
    if (!this.config.csc) erros.push("CSC (Código de Segurança do Contribuinte) não configurado");
    if (!this.config.uf) erros.push("UF não configurada");
    if (!this.config.ambiente) erros.push("Ambiente não configurado");
    return { ok: erros.length === 0, erros };
  }

  // Monta o payload de NFC-e a partir da venda/itens (estrutura Focus NFe).
  _montarNFCe(ctx) {
    const { venda, itens } = ctx;
    return {
      cnpj_emitente: (ctx.config.cnpj_emitente || "").replace(/\D/g, ""),
      data_emissao: new Date().toISOString(),
      presenca_comprador: "1", // operação presencial
      modalidade_frete: "9",
      local_destino: "1",
      items: (itens || []).map((it, idx) => ({
        numero_item: String(idx + 1),
        codigo_produto: String(it.produto_id),
        descricao: it.nome || `Produto ${it.produto_id}`,
        cfop: ctx.config.cfop_padrao || "5102",
        unidade_comercial: "UN",
        quantidade_comercial: Number(it.quantidade),
        valor_unitario_comercial: Number(it.preco_unitario),
        valor_bruto: Number(it.valor_total),
        unidade_tributavel: "UN",
        quantidade_tributavel: Number(it.quantidade),
        valor_unitario_tributavel: Number(it.preco_unitario),
        // tributação simplificada (Simples Nacional CSOSN 102) — ajustável por produto
        icms_origem: "0",
        icms_situacao_tributaria: ctx.config.csosn || "102",
        pis_situacao_tributaria: "07",
        cofins_situacao_tributaria: "07",
      })),
      formas_pagamento: (venda?.pagamentos || [{ forma: "01", valor: venda?.valor_total }]).map((p) => ({
        forma_pagamento: mapForma(p.forma),
        valor_pagamento: Number(p.valor),
      })),
    };
  }

  async emitirNFCe(ctx) {
    const cfgOk = await this.validarConfiguracao();
    if (!cfgOk.ok) return { ok: false, status: "REJEITADA", motivo: "Config incompleta: " + cfgOk.erros.join("; "), payload: cfgOk };

    const ref = "snappay-" + (ctx.nota?.id || Date.now());
    const corpo = this._montarNFCe(ctx);
    const r = await this._req("POST", `/v2/nfce?ref=${ref}`, corpo);

    // Focus retorna 202 (processando) ou status no corpo
    const st = r.data?.status;
    if (st === "autorizado") {
      return {
        ok: true, status: "AUTORIZADA",
        chave_acesso: r.data.chave_nfe, protocolo: r.data.protocolo,
        danfe_url: r.data.caminho_danfe, xml: r.data.caminho_xml_nota_fiscal,
        payload: { ref, focus: r.data },
      };
    }
    if (st === "processando_autorizacao" || r.httpStatus === 202) {
      // assíncrono — fica em emitindo; consultar depois
      return { ok: true, status: "CONTINGENCIA", motivo: "Processando autorização (consultar status)", payload: { ref, focus: r.data } };
    }
    return { ok: false, status: "REJEITADA", motivo: r.data?.mensagem || r.data?.mensagem_sefaz || "Rejeição na emissão", payload: { ref, focus: r.data } };
  }

  async consultarStatus(ctx) {
    const ref = ctx.ref || ("snappay-" + ctx.nota?.id);
    const r = await this._req("GET", `/v2/nfce/${ref}`);
    const st = r.data?.status;
    const map = { autorizado: "AUTORIZADA", cancelado: "CANCELADA", erro_autorizacao: "REJEITADA", processando_autorizacao: "EMITINDO" };
    return { ok: true, status: map[st] || ctx.nota?.status, payload: r.data };
  }

  async cancelarNota(ctx) {
    if (ctx.nota?.status !== "AUTORIZADA") return { ok: false, motivo: "Só cancela nota AUTORIZADA" };
    const ref = ctx.ref || ("snappay-" + ctx.nota?.id);
    const r = await this._req("DELETE", `/v2/nfce/${ref}`, { justificativa: ctx.justificativa || "Cancelamento solicitado pelo emitente" });
    if (r.data?.status === "cancelado") return { ok: true, status: "CANCELADA", protocolo: r.data.protocolo, payload: r.data };
    return { ok: false, motivo: r.data?.mensagem || "Falha ao cancelar", payload: r.data };
  }

  async inutilizarNumeracao(ctx) {
    const f = ctx.faixa || {};
    const r = await this._req("POST", "/v2/nfes/inutilizacao", {
      cnpj: (this.config.cnpj_emitente || "").replace(/\D/g, ""),
      serie: f.serie, numero_inicial: f.numeroInicial, numero_final: f.numeroFinal,
      justificativa: f.justificativa || "Inutilização de numeração",
    });
    if (r.data?.status === "inutilizado") return { ok: true, protocolo: r.data.protocolo, payload: r.data };
    return { ok: false, motivo: r.data?.mensagem || "Falha ao inutilizar", payload: r.data };
  }

  async gerarDanfe(ctx) {
    const ref = ctx.ref || ("snappay-" + ctx.nota?.id);
    // a Focus retorna o caminho do DANFE na própria emissão; aqui só compõe a URL
    if (ctx.nota?.danfe_url) return { ok: true, danfe_url: this._baseUrl() + ctx.nota.danfe_url };
    const r = await this._req("GET", `/v2/nfce/${ref}`);
    if (r.data?.caminho_danfe) return { ok: true, danfe_url: this._baseUrl() + r.data.caminho_danfe };
    return { ok: false, motivo: "DANFE indisponível" };
  }
}

// Mapeia a forma interna do SnapPay para o código da Focus/SEFAZ.
function mapForma(forma) {
  const m = { DINHEIRO: "01", PIX: "17", CARTAO_CREDITO: "03", CARTAO_DEBITO: "04", CREDIARIO: "05" };
  return m[forma] || "99";
}
