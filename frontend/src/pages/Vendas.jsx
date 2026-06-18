import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Vendas() {
  const [vendas, setVendas] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  const [devolucaoModal, setDevolucaoModal] = useState(false);
  const [itemDevolucao, setItemDevolucao] = useState(null);
  const [qtdDevolucao, setQtdDevolucao] = useState(1);
  const [tipoReembolso, setTipoReembolso] = useState("DINHEIRO");

  async function carregar() { setVendas(await api.get("/vendas")); }
  useEffect(() => { carregar(); }, []);

  async function verDetalhe(id) { setDetalhe(await api.get(`/vendas/${id}`)); }

  async function cancelarVenda(id) {
    if (!confirm("⚠️ CANCELAR VENDA INTEIRA?\n\nEsta ação vai anular a VENDA COMPLETA e devolver TODO o estoque.\n\nTem certeza?")) return;
    if (!confirm("✋ Última confirmação: Você quer CANCELAR TUDO mesmo?")) return;
    try {
      await api.post(`/vendas/${id}/cancelar`, {});
      setDetalhe(null);
      carregar();
      alert("✅ Venda cancelada. Estoque devolvido.");
    } catch (e) { alert(e.message); }
  }

  async function devolverItem(vendaId, item) {
    if (qtdDevolucao <= 0 || qtdDevolucao > item.quantidade) {
      alert("Quantidade inválida");
      return;
    }
    if (tipoReembolso === "CREDITO_LOJA" && !detalhe?.venda?.cliente_id) {
      alert("Crédito de loja exige um cliente identificado na venda.");
      return;
    }
    try {
      const r = await api.post(`/vendas/${vendaId}/devolver`, {
        itens: [{ produto_id: item.produto_id, quantidade: qtdDevolucao }],
        motivo: "Devolução pelo PDV",
        tipo_reembolso: tipoReembolso,
      });
      setDevolucaoModal(false);
      setItemDevolucao(null);
      setQtdDevolucao(1);
      verDetalhe(vendaId);
      const comoReembolso = tipoReembolso === "CREDITO_LOJA"
        ? "crédito gerado para o cliente"
        : `estorno em ${tipoReembolso.replace("CARTAO_", "cartão ").toLowerCase()}`;
      alert(`✅ Devolução registrada: ${qtdDevolucao} un de ${item.nome} (R$ ${Number(r.valor_total).toFixed(2)}) — ${comoReembolso}`);
    } catch (e) { alert(e.message); }
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
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
            {detalhe.venda.status === "FINALIZADA" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                <button
                  style={{
                    padding: "12px 16px",
                    background: "#7f1d1d",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14
                  }}
                  onClick={() => cancelarVenda(detalhe.venda.id)}
                >
                  ❌ CANCELAR VENDA INTEIRA
                </button>
                <button
                  style={{
                    padding: "12px 16px",
                    background: "#ea580c",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14
                  }}
                  onClick={() => {
                    setDevolucaoModal(true);
                    setItemDevolucao(detalhe.itens[0]);
                    setQtdDevolucao(1);
                  }}
                >
                  ↩️ DEVOLVER ITENS (Parcial)
                </button>
              </div>
            )}
            <button className="btn-mini" onClick={() => setDetalhe(null)} style={{ marginTop: 16, width: "100%" }}>Fechar</button>
          </div>
        </div>
      )}

      {devolucaoModal && itemDevolucao && (
        <div className="modal-overlay" onClick={() => setDevolucaoModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>↩️ Devolver Item</h3>
            <div style={{ background: "#fef3c7", padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              <strong>Produto:</strong> {itemDevolucao.nome}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#334155" }}>
                Quantidade a devolver (máx: {itemDevolucao.quantidade})
              </label>
              <input
                type="number"
                min="1"
                max={itemDevolucao.quantidade}
                value={qtdDevolucao}
                onChange={(e) => setQtdDevolucao(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "2px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#334155" }}>
                Como reembolsar?
              </label>
              <select
                value={tipoReembolso}
                onChange={(e) => setTipoReembolso(e.target.value)}
                style={{ width: "100%", padding: 10, border: "2px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              >
                <optgroup label="Estornar dinheiro/cartão/PIX">
                  <option value="DINHEIRO">💵 Estornar em dinheiro (sai do caixa)</option>
                  <option value="PIX">📱 Estornar em PIX</option>
                  <option value="CARTAO_CREDITO">💳 Estornar em cartão crédito</option>
                  <option value="CARTAO_DEBITO">🏧 Estornar em cartão débito</option>
                </optgroup>
                <optgroup label="Crédito para o cliente">
                  <option value="CREDITO_LOJA">🎟️ Gerar crédito/vale-troca (exige cliente)</option>
                </optgroup>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => devolverItem(detalhe.venda.id, itemDevolucao)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#ea580c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Confirmar Devolução
              </button>
              <button
                className="btn-mini"
                onClick={() => setDevolucaoModal(false)}
                style={{ padding: "12px 16px" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
