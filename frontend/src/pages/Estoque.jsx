import { useState, useEffect } from "react";

export default function Estoque({ apiUrl }) {
  const [produtos, setProdutos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [busca, setBusca] = useState("");

  async function carregar() {
    const [pRes, aRes] = await Promise.all([
      fetch(`${apiUrl}/produtos?q=${encodeURIComponent(busca || "a")}`),
      fetch(`${apiUrl}/estoque/alertas`),
    ]);
    setProdutos(await pRes.json());
    setAlertas(await aRes.json());
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [busca]);

  async function movimentar(produtoId, tipo) {
    const qtd = Number(prompt(`Quantidade para ${tipo}:`, "1"));
    if (!qtd || qtd <= 0) return;
    await fetch(`${apiUrl}/estoque/movimentar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, tipo, quantidade: qtd }),
    });
    carregar();
  }

  function statusCor(atual, minimo) {
    if (atual <= minimo) return "#ef4444";
    if (atual <= minimo * 2) return "#f59e0b";
    return "#22c55e";
  }

  return (
    <>
      <div className="page-header">
        <h2>📦 Gestão de Estoque</h2>
        <div className="busca-container">
          <input
            type="text"
            placeholder="Filtrar produtos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="busca-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="card alerta-card">
          <strong>⚠️ {alertas.length} produto(s) abaixo do estoque mínimo:</strong>{" "}
          {alertas.map((a) => a.nome.substring(0, 25)).join(", ")}
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cód</th><th>Produto</th><th>Atual</th><th>Mínimo</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.nome.substring(0, 40)}</td>
                <td>{Number(p.estoque_atual)}</td>
                <td>{Number(p.estoque_minimo)}</td>
                <td>
                  <span className="dot" style={{ background: statusCor(Number(p.estoque_atual), Number(p.estoque_minimo)) }} />
                </td>
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
