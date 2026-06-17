import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Vendas() {
  const [vendas, setVendas] = useState([]);
  const [detalhe, setDetalhe] = useState(null);

  async function carregar() { setVendas(await api.get("/vendas")); }
  useEffect(() => { carregar(); }, []);

  async function verDetalhe(id) { setDetalhe(await api.get(`/vendas/${id}`)); }
  async function cancelar(id) {
    if (!confirm(`Cancelar a venda #${id}? O estoque será devolvido.`)) return;
    try { await api.post(`/vendas/${id}/cancelar`, {}); setDetalhe(null); carregar(); }
    catch (e) { alert(e.message); }
  }
  function badge(status) {
    const cor = status === "FINALIZADA" ? "#22c55e" : status === "CANCELADA" ? "#ef4444" : "#f59e0b";
    return <span className="status-badge" style={{ background: cor }}>{status}</span>;
  }
  function dataBR(s) { return s ? new Date(s).toLocaleString("pt-BR") : "-"; }

  return (
    <>
      <div className="page-header">
        <h2>📊 Vendas</h2>
        <button className="btn-mini" onClick={carregar}>↻ Atualizar</button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>#</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhuma venda registrada</td></tr>
            ) : vendas.map((v) => (
              <tr key={v.id}>
                <td>#{v.id}</td><td>{dataBR(v.finalizada_em || v.aberta_em)}</td>
                <td>{v.cliente_nome || "—"}</td><td>{v.formas || "—"}</td>
                <td>R$ {Number(v.valor_total).toFixed(2)}</td><td>{badge(v.status)}</td>
                <td><button className="btn-mini" onClick={() => verDetalhe(v.id)}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalhe && (
        <div className="modal-overlay" onClick={() => setDetalhe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Venda #{detalhe.venda.id} {badge(detalhe.venda.status)}</h3>
            <p style={{ opacity: 0.7, fontSize: 13 }}>{dataBR(detalhe.venda.finalizada_em || detalhe.venda.aberta_em)}</p>
            <table className="data-table">
              <thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
              <tbody>
                {detalhe.itens.map((it) => (
                  <tr key={it.id}>
                    <td>{it.nome.substring(0, 30)}</td><td>{Number(it.quantidade)}</td>
                    <td>R$ {Number(it.preco_unitario).toFixed(2)}</td><td>R$ {Number(it.valor_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="cart-total" style={{ marginTop: 12 }}>
              <span>TOTAL</span><strong>R$ {Number(detalhe.venda.valor_total).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {detalhe.venda.status === "FINALIZADA" && (
                <button className="btn-mini danger" onClick={() => cancelar(detalhe.venda.id)}>Cancelar venda</button>
              )}
              <button className="btn-checkout" onClick={() => setDetalhe(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
