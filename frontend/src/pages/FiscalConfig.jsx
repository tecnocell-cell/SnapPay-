import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function FiscalConfig() {
  const [cfg, setCfg] = useState(null);
  const [providers, setProviders] = useState(["MOCK"]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [validacao, setValidacao] = useState(null);

  useEffect(() => {
    api.get("/fiscal/configuracoes").then(setCfg).catch((e) => setErro(e.message));
    api.get("/fiscal/providers").then(setProviders).catch(() => {});
  }, []);

  function flash(msg) { setSucesso(msg); setTimeout(() => setSucesso(""), 3000); }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    try {
      const saved = await api.put("/fiscal/configuracoes", {
        provider: cfg.provider,
        ambiente: cfg.ambiente,
        modelo: cfg.modelo,
        serie: Number(cfg.serie),
        numero_atual: Number(cfg.numero_atual),
        csc: cfg.csc,
        csc_id: cfg.csc_id,
        provider_token: cfg.provider_token,
        certificado_nome: cfg.certificado_nome,
        certificado_validade: cfg.certificado_validade || null,
        regime_tributario: cfg.regime_tributario,
        uf: cfg.uf,
      });
      setCfg(saved);
      flash("✓ Configurações fiscais salvas");
    } catch (e) { setErro(e.message); }
  }

  async function validar() {
    setErro(""); setValidacao(null);
    try {
      setValidacao(await api.get("/fiscal/configuracoes/validar"));
    } catch (e) { setErro(e.message); }
  }

  if (!cfg) return <div style={{ padding: 40 }}>Carregando…</div>;
  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.value });

  return (
    <>
      <div className="page-header"><h2>🧾 Configurações Fiscais</h2></div>
      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {sucesso && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{sucesso}</div>}

      <form className="card" onSubmit={salvar}>
        <h3 className="card-title">Provedor e ambiente</h3>
        <div className="form-grid">
          <div>
            <label>Provedor fiscal</label>
            <select value={cfg.provider} onChange={set("provider")}>
              {providers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <small>MOCK = homologação interna (sem SEFAZ). Demais provedores serão habilitados nas próximas fases.</small>
          </div>
          <div>
            <label>Ambiente</label>
            <select value={cfg.ambiente} onChange={set("ambiente")}>
              <option value="HOMOLOGACAO">Homologação</option>
              <option value="PRODUCAO">Produção</option>
            </select>
          </div>
          <div>
            <label>Modelo</label>
            <select value={cfg.modelo} onChange={set("modelo")}>
              <option value="65">65 — NFC-e</option>
              <option value="55">55 — NF-e</option>
            </select>
          </div>
          <div><label>UF</label><input maxLength="2" value={cfg.uf || ""} onChange={(e) => setCfg({ ...cfg, uf: e.target.value.toUpperCase() })} /></div>
        </div>

        <h3 className="card-title" style={{ marginTop: 20 }}>Numeração</h3>
        <div className="form-grid">
          <div><label>Série</label><input type="number" value={cfg.serie} onChange={set("serie")} /></div>
          <div><label>Número atual</label><input type="number" value={cfg.numero_atual} onChange={set("numero_atual")} /><small>Último número emitido (a próxima nota será +1)</small></div>
          <div><label>Regime tributário</label>
            <select value={cfg.regime_tributario || ""} onChange={set("regime_tributario")}>
              <option value="">Selecione</option>
              <option value="SIMPLES">Simples Nacional</option>
              <option value="LUCRO_REAL">Lucro Real</option>
              <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
            </select>
          </div>
        </div>

        <h3 className="card-title" style={{ marginTop: 20 }}>Credenciais</h3>
        <div className="form-grid">
          <div><label>CSC</label><input value={cfg.csc || ""} onChange={set("csc")} /></div>
          <div><label>CSC ID</label><input value={cfg.csc_id || ""} onChange={set("csc_id")} /></div>
          <div><label>Token do provedor</label><input value={cfg.provider_token || ""} onChange={set("provider_token")} /></div>
          <div><label>Certificado (referência)</label><input value={cfg.certificado_nome || ""} onChange={set("certificado_nome")} placeholder="ex: empresa.pfx" /><small>O arquivo .pfx não é armazenado aqui.</small></div>
          <div><label>Validade do certificado</label><input type="date" value={cfg.certificado_validade ? String(cfg.certificado_validade).slice(0,10) : ""} onChange={set("certificado_validade")} /></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button className="btn-checkout" type="submit">💾 Salvar</button>
          <button className="btn-mini" type="button" onClick={validar}>✓ Validar configuração</button>
        </div>

        {validacao && (
          <div className="alerta-card" style={{ marginTop: 12, background: validacao.ok ? "#dcfce7" : "#fee2e2" }}>
            <strong>Provider {validacao.provider}:</strong> {validacao.ok ? "configuração válida ✅" : "pendências:"}
            {!validacao.ok && <ul style={{ margin: "6px 0 0 18px" }}>{validacao.erros.map((x, i) => <li key={i}>{x}</li>)}</ul>}
          </div>
        )}
      </form>
    </>
  );
}
