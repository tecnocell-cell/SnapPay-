import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarKpis();
    const intervalo = setInterval(carregarKpis, 30000); // Atualizar a cada 30s
    return () => clearInterval(intervalo);
  }, []);

  async function carregarKpis() {
    try {
      setCarregando(true);
      const resumo = await api.get("/relatorios/resumo");
      const topProdutos = await api.get("/relatorios/top-produtos?limite=5");
      const vendiasPorDia = await api.get("/relatorios/vendas-por-dia");
      const alertas = await api.get("/estoque/alertas");

      setKpis({
        resumo,
        topProdutos,
        vendiasPorDia,
        alertas: alertas.slice(0, 5)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  if (carregando || !kpis) {
    return <div style={{ padding: 40, textAlign: "center" }}>Carregando dashboard...</div>;
  }

  const { resumo, topProdutos, vendiasPorDia, alertas } = kpis;

  return (
    <>
      <div className="page-header">
        <h2>📊 Dashboard Gerencial</h2>
        <button className="btn-mini ok" onClick={carregarKpis}>🔄 Atualizar</button>
      </div>

      {/* KPIs PRINCIPAIS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: "center", borderTop: "3px solid #3b82f6" }}>
          <small style={{ opacity: 0.7 }}>💰 Vendas Hoje</small>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#3b82f6", marginTop: 8 }}>
            R$ {Number(resumo.hoje.total).toFixed(2)}
          </div>
          <small style={{ opacity: 0.6 }}>{resumo.hoje.qtd} vendas</small>
        </div>

        <div className="card" style={{ textAlign: "center", borderTop: "3px solid #22c55e" }}>
          <small style={{ opacity: 0.7 }}>📈 Vendas Mês</small>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e", marginTop: 8 }}>
            R$ {Number(resumo.geral.total).toFixed(2)}
          </div>
          <small style={{ opacity: 0.6 }}>{resumo.geral.qtd} vendas</small>
        </div>

        <div className="card" style={{ textAlign: "center", borderTop: "3px solid #f59e0b" }}>
          <small style={{ opacity: 0.7 }}>🎯 Ticket Médio</small>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b", marginTop: 8 }}>
            R$ {Number(resumo.ticketMedio).toFixed(2)}
          </div>
          <small style={{ opacity: 0.6 }}>por transação</small>
        </div>

        <div className="card" style={{ textAlign: "center", borderTop: "3px solid #ef4444" }}>
          <small style={{ opacity: 0.7 }}>⚠️ Estoque Baixo</small>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444", marginTop: 8 }}>
            {alertas.length}
          </div>
          <small style={{ opacity: 0.6 }}>produtos</small>
        </div>
      </div>

      {/* ALERTAS DE ESTOQUE */}
      {alertas.length > 0 && (
        <div className="card" style={{ backgroundColor: "#fef2f2", borderLeft: "4px solid #ef4444", marginBottom: 24 }}>
          <h3 className="card-title">⚠️ Estoque Baixo</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {alertas.map((p) => (
              <div key={p.id} style={{
                padding: 12, backgroundColor: "#fff", borderRadius: 6,
                border: "1px solid #fee2e2", fontSize: 13
              }}>
                <strong>{p.nome}</strong>
                <div style={{ marginTop: 4, color: "#ef4444" }}>
                  Estoque: {Number(p.estoque_atual)} | Mínimo: {Number(p.estoque_minimo)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP PRODUTOS */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title">🏆 Produtos Mais Vendidos</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Total</th>
              <th>% de Vendas</th>
            </tr>
          </thead>
          <tbody>
            {topProdutos.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Sem vendas ainda</td></tr>
            ) : (
              topProdutos.map((p, i) => (
                <tr key={p.id}>
                  <td><strong>#{i + 1} {p.nome}</strong></td>
                  <td style={{ textAlign: "right" }}>{Number(p.qtd)} un</td>
                  <td style={{ textAlign: "right" }}>R$ {Number(p.total).toFixed(2)}</td>
                  <td style={{ textAlign: "center" }}>
                    {((Number(p.total) / Number(resumo.geral.total)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VENDAS POR DIA (últimos 7 dias) */}
      <div className="card">
        <h3 className="card-title">📅 Vendas dos Últimos 7 Dias</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Quantidade</th>
              <th>Total</th>
              <th>Ticket Médio</th>
            </tr>
          </thead>
          <tbody>
            {vendiasPorDia.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Sem vendas</td></tr>
            ) : (
              vendiasPorDia.slice(-7).reverse().map((v) => {
                const ticket = Number(v.qtd) > 0 ? Number(v.total) / Number(v.qtd) : 0;
                return (
                  <tr key={v.dia}>
                    <td><strong>{new Date(v.dia).toLocaleDateString("pt-BR")}</strong></td>
                    <td style={{ textAlign: "right" }}>{Number(v.qtd)} vendas</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>R$ {Number(v.total).toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>R$ {ticket.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
