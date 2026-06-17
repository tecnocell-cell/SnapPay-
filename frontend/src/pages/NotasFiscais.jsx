import { useState, useEffect } from "react";
import { api } from "../lib/api";

const CORES = {
  AUTORIZADA: "#22c55e", REJEITADA: "#ef4444", CANCELADA: "#64748b",
  EMITINDO: "#f59e0b", RASCUNHO: "#94a3b8", CONTINGENCIA: "#3b82f6",
};

export default function NotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [emitir, setEmitir] = useState(false);
  const [vendaId, setVendaId] = useState("");
  const [simular, setSimular] = useState("AUTORIZAR");
  const [detalhe, setDetalhe] = useState(null);

  async function carregar() {
    try { setNotas(await api.get("/fiscal/notas")); } catch (e) { setErro(e.message); }
  }
  useEffect(() => {
    carregar();
    api.get("/vendas").then((vs) => setVendas(vs.filter((v) => v.status === "FINALIZADA"))).catch(() => {});
  }, []);

  function flash(msg) { setSucesso(msg); setTimeout(() => setSucesso(""), 4000); }

  async function emitirNota(e) {
    e.preventDefault();
    setErro("");
    if (!vendaId) { setErro("Selecione uma venda"); return; }
    try {
      const n = await api.post("/fiscal/notas/emitir", { venda_id: Number(vendaId), simular });
      flash(`Nota #${n.id} → ${n.status}${n.motivo_rejeicao ? " — " + n.motivo_rejeicao : ""}`);
      setEmitir(false); setVendaId("");
      carregar();
    } catch (e) { setErro(e.message); }
  }

  async function ver(id) {
    try { setDetalhe(await api.get(`/fiscal/notas/${id}`)); } catch (e) { setErro(e.message); }
  }

  async function cancelar(id) {
    if (!confirm("Cancelar esta nota fiscal?")) return;
    try {
      await api.post(`/fiscal/notas/${id}/cancelar`, { motivo: "Cancelamento solicitado" });
      flash("Nota cancelada");
      setDetalhe(null); carregar();
    } catch (e) { setErro(e.message); }
  }

  const dataBR = (s) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
  const badge = (st) => <span style={{ padding: "2px 8px", borderRadius: 6, color: "#fff", fontSize: 12, background: CORES[st] || "#64748b" }}>{st}</span>;

  return (
    <>
      <div className="page-header">
        <h2>🧾 Notas Fiscais (NFC-e)</h2>
        <button className="btn-mini ok" onClick={() => setEmitir(!emitir)}>{emitir ? "✕ Cancelar" : "+ Emitir nota"}</button>
      </div>
      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {sucesso && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{sucesso}</div>}

      {emitir && (
        <form className="card" onSubmit={emitirNota}>
          <h3 className="card-title">Emitir NFC-e a partir de uma venda</h3>
          <div className="form-grid">
            <div>
              <label>Venda finalizada *</label>
              <select value={vendaId} onChange={(e) => setVendaId(e.target.value)}>
                <option value="">Selecione</option>
                {vendas.map((v) => <option key={v.id} value={v.id}>Venda #{v.id} — R$ {Number(v.valor_total).toFixed(2)}</option>)}
              </select>
            </div>
            <div>
              <label>Simulação (homologação)</label>
              <select value={simular} onChange={(e) => setSimular(e.target.value)}>
                <option value="AUTORIZAR">Autorizar</option>
                <option value="REJEITAR">Rejeitar</option>
                <option value="CONTINGENCIA">Contingência</option>
              </select>
              <small>No provider MOCK, controla o desfecho simulado.</small>
            </div>
          </div>
          <button className="btn-checkout" type="submit" style={{ marginTop: 12 }}>Emitir</button>
        </form>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Série/Nº</th><th>Venda</th><th>Status</th><th>Valor</th><th>Emitida</th><th></th></tr>
          </thead>
          <tbody>
            {notas.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhuma nota emitida</td></tr>
            ) : notas.map((n) => (
              <tr key={n.id}>
                <td>#{n.id}</td>
                <td>{n.serie}/{n.numero || "—"}</td>
                <td>{n.venda_id ? `#${n.venda_id}` : "—"}</td>
                <td>{badge(n.status)}</td>
                <td>R$ {Number(n.valor_total).toFixed(2)}</td>
                <td style={{ fontSize: 12 }}>{dataBR(n.autorizada_em || n.criado_em)}</td>
                <td><button className="btn-mini" onClick={() => ver(n.id)}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalhe && (
        <div className="modal-overlay" onClick={() => setDetalhe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <h3>Nota #{detalhe.nota.id} — {detalhe.nota.status}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 12 }}>
              <div><small style={{ opacity: 0.7 }}>Série/Número</small><div>{detalhe.nota.serie}/{detalhe.nota.numero || "—"}</div></div>
              <div><small style={{ opacity: 0.7 }}>Ambiente / Provider</small><div>{detalhe.nota.ambiente} / {detalhe.nota.provider}</div></div>
              <div style={{ gridColumn: "1 / -1" }}><small style={{ opacity: 0.7 }}>Chave de acesso</small><div style={{ fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>{detalhe.nota.chave_acesso || "—"}</div></div>
              <div><small style={{ opacity: 0.7 }}>Protocolo</small><div>{detalhe.nota.protocolo || "—"}</div></div>
              <div><small style={{ opacity: 0.7 }}>Valor</small><div>R$ {Number(detalhe.nota.valor_total).toFixed(2)}</div></div>
              {detalhe.nota.motivo_rejeicao && <div style={{ gridColumn: "1 / -1", color: "#ef4444" }}><small style={{ opacity: 0.7 }}>Motivo rejeição</small><div>{detalhe.nota.motivo_rejeicao}</div></div>}
              {detalhe.nota.danfe_url && <div style={{ gridColumn: "1 / -1" }}><small style={{ opacity: 0.7 }}>DANFE</small><div style={{ fontFamily: "monospace", fontSize: 12 }}>{detalhe.nota.danfe_url}</div></div>}
            </div>

            <h4>Eventos</h4>
            <table className="data-table">
              <thead><tr><th>Tipo</th><th>Status</th><th>Mensagem</th><th>Data</th></tr></thead>
              <tbody>
                {detalhe.eventos.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.tipo}</td><td>{ev.status_resultante || "—"}</td>
                    <td style={{ fontSize: 12 }}>{ev.mensagem || "—"}</td>
                    <td style={{ fontSize: 12 }}>{dataBR(ev.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {(detalhe.nota.status === "AUTORIZADA" || detalhe.nota.status === "CONTINGENCIA") && (
                <button className="btn-mini danger" onClick={() => cancelar(detalhe.nota.id)}>Cancelar nota</button>
              )}
              <button className="btn-mini" onClick={() => setDetalhe(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
