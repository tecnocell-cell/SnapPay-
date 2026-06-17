import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [busca, setBusca] = useState("");

  async function carregar() {
    const params = busca ? `?q=${encodeURIComponent(busca)}` : "";
    const [p, a] = await Promise.all([api.get(`/produtos${params}`), api.get("/estoque/alertas")]);
    setProdutos(p); setAlertas(a);
  }
  useEffect(() => { carregar(); }, []);
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [busca]);

  async function movimentar(produtoId, tipo) {
    const qtd = Number(prompt(`Quantidade para ${tipo}:`, "1"));
    if (!qtd || qtd <= 0) return;
    await api.post("/estoque/movimentar", { produtoId, tipo, quantidade: qtd });
    carregar();
  }
  function cor(atual, min) { return atual <= min ? "#ef4444" : atual <= min * 2 ? "#f59e0b" : "#22c55e"; }

  return (
    <>
      <div className="page-header">
        <h2>📦 Gestão de Estoque</h2>
        <div className="busca-container">
          <input type="text" placeholder="Filtrar produtos..." value={busca} onChange={(e) => setBusca(e.target.value)} className="busca-input" />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="card alerta-card">
          <strong>⚠️ {alertas.length} produto(s) abaixo do mínimo:</strong>{" "}
          {alertas.map((a) => a.nome.substring(0, 25)).join(", ")}
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Cód</th><th>Produto</th><th>Atual</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td>{p.codigo}</td><td>{p.nome.substring(0, 40)}</td>
                <td>{Number(p.estoque_atual)}</td><td>{Number(p.estoque_minimo)}</td>
                <td><span className="dot" style={{ background: cor(Number(p.estoque_atual), Number(p.estoque_minimo)) }} /></td>
                <td>
                  <button className="btn-mini ok" onClick={() => movimentar(p.id, "ENTRADA")}>+ Entrada</button>
                  <button className="btn-mini danger" onClick={() => movimentar(p.id, "SAIDA")}>− Saída</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
