import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { getDeviceId, setDeviceId } from "../lib/offline";

// Tela administrativa — apenas ADMIN (permissão dispositivos.gerenciar).
// Ativa o terminal DESTE computador e lista os terminais da empresa.
export default function TerminaisPDV() {
  const [dispositivos, setDispositivos] = useState([]);
  const [deviceLocal, setDeviceLocal] = useState(getDeviceId());
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [chaveExibida, setChaveExibida] = useState(null);

  async function carregar() {
    try { setDispositivos(await api.get("/sync/dispositivos")); }
    catch (e) { setErro(e.message); }
  }
  useEffect(() => { carregar(); }, []);

  async function ativar(e) {
    e.preventDefault();
    setErro(""); setChaveExibida(null);
    if (!nome.trim()) { setErro("Informe um nome para o terminal"); return; }
    try {
      const d = await api.post("/sync/ativar-terminal", { nome: nome.trim() });
      // vincula este computador ao terminal recém-criado
      setDeviceId(d.device_id);
      setDeviceLocal(d.device_id);
      setChaveExibida({ device_id: d.device_id, codigo: d.codigo_ativacao, chave_local: d.chave_local });
      setNome("");
      carregar();
    } catch (e) { setErro(e.message); }
  }

  function vincularEste(id) {
    setDeviceId(id);
    setDeviceLocal(id);
  }

  const dataBR = (s) => (s ? new Date(s).toLocaleString("pt-BR") : "nunca");

  return (
    <>
      <div className="page-header"><h2>🖥️ Terminais PDV</h2></div>
      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}

      <div className="card">
        <h3 className="card-title">Este computador</h3>
        <p style={{ fontSize: 14 }}>
          {deviceLocal
            ? <>Vinculado ao terminal <code style={{ fontFamily: "monospace" }}>{deviceLocal.slice(0, 18)}…</code> — as vendas offline deste caixa usarão este terminal.</>
            : <>Este computador <strong>ainda não está vinculado</strong> a um terminal. Ative um abaixo para habilitar a operação offline.</>}
        </p>
      </div>

      <form className="card" onSubmit={ativar}>
        <h3 className="card-title">Ativar novo terminal</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Nome do terminal (ex: Caixa 1 — Loja Centro)" value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 1, minWidth: 240 }} />
          <button className="btn-checkout" type="submit">Ativar terminal</button>
        </div>
        {chaveExibida && (
          <div className="alerta-card ok" style={{ marginTop: 12 }}>
            <strong>Terminal ativado e vinculado a este computador.</strong>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              <div>device_id: <code>{chaveExibida.device_id}</code></div>
              <div>código de ativação: <code>{chaveExibida.codigo}</code></div>
              <div>chave local: <code>{chaveExibida.chave_local}</code></div>
            </div>
            <small style={{ display: "block", marginTop: 6 }}>⚠️ Anote a chave local — ela só é exibida agora. (Guardada automaticamente neste navegador.)</small>
          </div>
        )}
      </form>

      <div className="card">
        <h3 className="card-title">Terminais da empresa</h3>
        <table className="data-table">
          <thead>
            <tr><th>Nome</th><th>Identificador</th><th>Status</th><th>Último sync</th><th>Versão</th><th></th></tr>
          </thead>
          <tbody>
            {dispositivos.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhum terminal ativado</td></tr>
            ) : dispositivos.map((d) => (
              <tr key={d.id}>
                <td>{d.nome}</td>
                <td style={{ fontFamily: "monospace", fontSize: 11 }}>{d.device_id.slice(0, 18)}…</td>
                <td><span className={`status-badge ${d.ativo ? "ok" : "danger"}`}>{d.ativo ? "Ativo" : "Inativo"}</span></td>
                <td style={{ fontSize: 12 }}>{dataBR(d.ultimo_sync)}</td>
                <td style={{ fontSize: 12 }}>{d.versao_app || "—"}</td>
                <td>
                  {deviceLocal === d.device_id
                    ? <span style={{ fontSize: 12, color: "#22c55e" }}>● este computador</span>
                    : <button className="btn-mini" onClick={() => vincularEste(d.device_id)}>Usar neste PC</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
