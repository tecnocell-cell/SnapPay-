import { useState, useEffect } from "react";

export default function Relatorios({ apiUrl }) {
  const [resumo, setResumo] = useState(null);
  const [top, setTop] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  useEffect(() => {
    (async () => {
      const [r, t, p] = await Promise.all([
        fetch(`${apiUrl}/relatorios/resumo`).then((x) => x.json()),
        fetch(`${apiUrl}/relatorios/top-produtos?limite=5`).then((x) => x.json()),
        fetch(`${apiUrl}/relatorios/pagamentos`).then((x) => x.json()),
      ]);
      setResumo(r); setTop(t); setPagamentos(p);
    })();
  }, []);

  const maxQtd = Math.max(1, ...top.map((p) => Number(p.qtd)));

  return (
    <>
      <div className="page-header">
        <h2>📈 Relatórios & Dashboard</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Vendas hoje</span>
          <span className="kpi-value">R$ {resumo ? resumo.hoje.total.toFixed(2) : "0.00"}</span>
          <span className="kpi-sub">{resumo ? resumo.hoje.qtd : 0} transações</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total acumulado</span>
          <span className="kpi-value">R$ {resumo ? resumo.geral.total.toFixed(2) : "0.00"}</span>
          <span className="kpi-sub">{resumo ? resumo.geral.qtd : 0} vendas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Ticket médio</span>
          <span className="kpi-value">R$ {resumo ? resumo.ticketMedio.toFixed(2) : "0.00"}</span>
          <span className="kpi-sub">por venda</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🏆 Top 5 produtos</h3>
        {top.length === 0 ? <p style={{ opacity: 0.6 }}>Nenhuma venda registrada ainda.</p> : top.map((p) => (
          <div key={p.id} className="bar-row">
            <span className="bar-label">{p.nome.substring(0, 30)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(Number(p.qtd) / maxQtd) * 100}%` }} />
            </div>
            <span className="bar-value">{Number(p.qtd)} un · R$ {Number(p.total).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">💳 Formas de pagamento</h3>
        {pagamentos.length === 0 ? <p style={{ opacity: 0.6 }}>Sem dados.</p> : (
          <table className="data-table">
            <thead><tr><th>Forma</th><th>Qtd</th><th>Total</th></tr></thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.forma}><td>{p.forma}</td><td>{p.qtd}</td><td>R$ {Number(p.total).toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
