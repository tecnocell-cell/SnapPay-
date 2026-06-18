import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Inventario() {
  const [inventarios, setInventarios] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // novo inventário
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", observacao: "" });

  // inventário aberto (detalhe + contagem)
  const [detalhe, setDetalhe] = useState(null); // { inventario, itens }
  const [contagem, setContagem] = useState({ produto_id: "", quantidade_contada: "" });

  async function carregar() {
    try {
      setInventarios(await api.get("/inventario"));
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    carregar();
    api.get("/produtos").then(setProdutos).catch(() => {});
  }, []);

  function flash(setter, msg) {
    setter(msg);
    setTimeout(() => setter(""), 3000);
  }

  async function criar(e) {
    e.preventDefault();
    setErro("");
    if (!form.nome) { setErro("Informe um nome para o inventário"); return; }
    try {
      await api.post("/inventario", form);
      setForm({ nome: "", observacao: "" });
      setNovo(false);
      carregar();
    } catch (e) { setErro(e.message); }
  }

  async function abrir(id) {
    setErro("");
    try {
      setDetalhe(await api.get(`/inventario/${id}`));
      setContagem({ produto_id: "", quantidade_contada: "" });
    } catch (e) { setErro(e.message); }
  }

  async function lancarContagem(e) {
    e.preventDefault();
    setErro("");
    if (!contagem.produto_id || contagem.quantidade_contada === "") {
      setErro("Selecione o produto e informe a quantidade contada");
      return;
    }
    try {
      await api.post(`/inventario/${detalhe.inventario.id}/itens`, {
        produto_id: Number(contagem.produto_id),
        quantidade_contada: Number(contagem.quantidade_contada),
      });
      setContagem({ produto_id: "", quantidade_contada: "" });
      abrir(detalhe.inventario.id);
    } catch (e) { setErro(e.message); }
  }

  async function fechar(id) {
    if (!confirm("Fechar o inventário e aplicar os ajustes de estoque? Esta ação não pode ser desfeita.")) return;
    setErro("");
    try {
      const r = await api.post(`/inventario/${id}/fechar`, {});
      flash(setSucesso, `Inventário fechado. ${r.ajustes} ajuste(s) aplicado(s).`);
      setDetalhe(null);
      carregar();
    } catch (e) { setErro(e.message); }
  }

  const dataBR = (s) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
  const corDif = (d) => (Number(d) === 0 ? "#64748b" : Number(d) > 0 ? "#22c55e" : "#ef4444");

  return (
    <>
      <div className="page-header">
        <h2>📋 Inventário</h2>
        <button className="btn-mini ok" onClick={() => setNovo(!novo)}>
          {novo ? "✕ Cancelar" : "+ Novo inventário"}
        </button>
      </div>

      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {sucesso && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{sucesso}</div>}

      {novo && (
        <form className="card" onSubmit={criar}>
          <h3 className="card-title">Novo inventário</h3>
          <div className="form-group">
            <label>Nome *</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Inventário mensal — Junho" />
          </div>
          <div className="form-group">
            <label>Observação</label>
            <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          </div>
          <button className="btn-checkout" type="submit">Criar inventário</button>
        </form>
      )}

      {/* LISTA DE INVENTÁRIOS */}
      <div className="card">
        <h3 className="card-title">Inventários</h3>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Nome</th><th>Status</th><th>Início</th><th>Fim</th><th></th></tr>
          </thead>
          <tbody>
            {inventarios.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhum inventário</td></tr>
            ) : inventarios.map((inv) => (
              <tr key={inv.id}>
                <td>#{inv.id}</td>
                <td>{inv.nome}</td>
                <td>
                  <span className={`status-badge ${inv.status === "FECHADO" ? "ok" : ""}`}>{inv.status}</span>
                </td>
                <td style={{ fontSize: 12 }}>{dataBR(inv.data_inicio)}</td>
                <td style={{ fontSize: 12 }}>{dataBR(inv.data_fim)}</td>
                <td>
                  <button className="btn-mini" onClick={() => abrir(inv.id)}>
                    {inv.status === "FECHADO" ? "Ver" : "Contar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETALHE / CONTAGEM */}
      {detalhe && (
        <div className="modal-overlay" onClick={() => setDetalhe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <h3>Inventário #{detalhe.inventario.id} — {detalhe.inventario.nome}</h3>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Status: {detalhe.inventario.status}
            </div>

            {detalhe.inventario.status !== "FECHADO" && (
              <form onSubmit={lancarContagem} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 12 }}>
                <select value={contagem.produto_id} onChange={(e) => setContagem({ ...contagem, produto_id: e.target.value })}>
                  <option value="">Selecione o produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>[{p.codigo}] {p.nome} (sis: {Number(p.estoque_atual)})</option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="Qtd"
                    value={contagem.quantidade_contada}
                    onChange={(e) => setContagem({ ...contagem, quantidade_contada: e.target.value })}
                    style={{ flex: 1, padding: "8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>un</span>
                </div>
                <button className="btn-mini ok" type="submit">✓</button>
              </form>
            )}

            <table className="data-table">
              <thead>
                <tr><th>Produto</th><th>Sistema</th><th>Contado</th><th>Diferença</th></tr>
              </thead>
              <tbody>
                {detalhe.itens.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: 16, opacity: 0.6 }}>Nenhuma contagem lançada</td></tr>
                ) : detalhe.itens.map((it) => (
                  <tr key={it.id}>
                    <td>[{it.codigo}] {it.produto_nome}</td>
                    <td style={{ textAlign: "right" }}>{Number(it.quantidade_sistema)}</td>
                    <td style={{ textAlign: "right" }}>{Number(it.quantidade_contada)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: corDif(it.diferenca) }}>
                      {Number(it.diferenca) > 0 ? "+" : ""}{Number(it.diferenca)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {detalhe.inventario.status !== "FECHADO" && (
                <button className="btn-checkout ok" disabled={detalhe.itens.length === 0} onClick={() => fechar(detalhe.inventario.id)}>
                  ✓ Fechar e aplicar ajustes
                </button>
              )}
              <button className="btn-mini" onClick={() => setDetalhe(null)}>Fechar janela</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
