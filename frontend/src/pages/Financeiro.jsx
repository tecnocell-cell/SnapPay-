import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Financeiro() {
  const [aba, setAba] = useState("pagar");
  const [contas, setContas] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    carregar();
    carregarResumo();
  }, []);

  useEffect(() => {
    carregar();
  }, [aba, filtroStatus]);

  async function carregar() {
    try {
      const params = filtroStatus ? `?status=${filtroStatus}` : "";
      if (aba === "pagar") {
        setContas(await api.get(`/financeiro/pagar${params}`));
      } else {
        setContas(await api.get(`/financeiro/receber${params}`));
      }
    } catch (err) {
      setErro(err.message);
    }
  }

  async function carregarResumo() {
    try {
      setResumo(await api.get("/financeiro/resumo"));
    } catch (err) {
      console.error(err);
    }
  }

  async function marcarComo(id, tipo) {
    try {
      if (aba === "pagar") {
        await api.put(`/financeiro/pagar/${id}`, { dataPagamento: new Date().toISOString() });
      } else {
        await api.put(`/financeiro/receber/${id}`, { dataRecebimento: new Date().toISOString() });
      }
      carregar();
      carregarResumo();
    } catch (err) {
      setErro(err.message);
    }
  }

  const dataBR = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

  return (
    <>
      <div className="page-header">
        <h2>💳 Financeiro</h2>
      </div>

      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}

      {resumo && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <small style={{ opacity: 0.7 }}>💸 A Pagar</small>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>
              R$ {resumo.contas_pagar.pendente.toFixed(2)}
            </div>
            <small>{resumo.contas_pagar.quantidade} contas</small>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <small style={{ opacity: 0.7 }}>💰 A Receber</small>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>
              R$ {resumo.contas_receber.pendente.toFixed(2)}
            </div>
            <small>{resumo.contas_receber.quantidade} contas</small>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <small style={{ opacity: 0.7 }}>✓ Pago (mês)</small>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>
              R$ {resumo.contas_pagar.pago_mes.toFixed(2)}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <small style={{ opacity: 0.7 }}>✓ Recebido (mês)</small>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>
              R$ {resumo.contas_receber.recebido_mes.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button className={`btn-mini ${aba === "pagar" ? "ativo" : ""}`} onClick={() => setAba("pagar")}>
            💸 Contas a Pagar
          </button>
          <button className={`btn-mini ${aba === "receber" ? "ativo" : ""}`} onClick={() => setAba("receber")}>
            💰 Contas a Receber
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button className={`btn-mini ${filtroStatus === "" ? "ativo" : ""}`} onClick={() => setFiltroStatus("")}>
            Todas
          </button>
          <button className={`btn-mini ${filtroStatus === "PENDENTE" ? "ativo" : ""}`} onClick={() => setFiltroStatus("PENDENTE")}>
            Pendentes
          </button>
          <button className={`btn-mini ok ${filtroStatus === "PAGA" || filtroStatus === "RECEBIDA" ? "ativo" : ""}`} onClick={() => setFiltroStatus(aba === "pagar" ? "PAGA" : "RECEBIDA")}>
            Liquidadas
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>{aba === "pagar" ? "Fornecedor" : "Cliente"}</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contas.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhuma conta</td></tr>
            ) : contas.map((c) => {
              const vencido = new Date(c.data_vencimento) < new Date() && c.status === "PENDENTE";
              return (
                <tr key={c.id} style={{ backgroundColor: vencido ? "#fee2e2" : "" }}>
                  <td>{aba === "pagar" ? c.fornecedor_nome : c.cliente_nome}</td>
                  <td>R$ {Number(c.valor).toFixed(2)}</td>
                  <td>{dataBR(c.data_vencimento)} {vencido && "🔴"}</td>
                  <td>
                    <span className={`status-badge ${c.status === "PAGA" || c.status === "RECEBIDA" ? "ok" : "danger"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {c.status === "PENDENTE" && (
                      <button className="btn-mini ok" onClick={() => marcarComo(c.id, aba)}>
                        ✓ Marcar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
