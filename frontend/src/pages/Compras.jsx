import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [erro, setErro] = useState("");

  // Modal de nova compra
  const [novaCompra, setNovaCompra] = useState(false);
  const [form, setForm] = useState({ fornecedorId: "", observacoes: "" });
  const [itens, setItens] = useState([]);
  const [itemAtual, setItemAtual] = useState({ produtoId: "", quantidade: 1, precoUnitario: 0 });

  // Detalhes de compra
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    carregar();
    api.get("/fornecedores").then(setFornecedores).catch(() => {});
    api.get("/produtos").then(setProdutos).catch(() => {});
  }, []);

  async function carregar() {
    const params = filtroStatus ? `?status=${filtroStatus}` : "";
    try {
      setCompras(await api.get(`/compras${params}`));
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => { carregar(); }, [filtroStatus]);

  function adicionarItem() {
    if (!itemAtual.produtoId || !itemAtual.quantidade || !itemAtual.precoUnitario) {
      setErro("Preenchaa todos os campos do item");
      return;
    }
    setItens([...itens, { ...itemAtual, id: Date.now() }]);
    setItemAtual({ produtoId: "", quantidade: 1, precoUnitario: 0 });
    setErro("");
  }

  function removerItem(id) {
    setItens(itens.filter((i) => i.id !== id));
  }

  async function salvarCompra() {
    setErro("");
    if (!form.fornecedorId || itens.length === 0) {
      setErro("Selecione fornecedor e adicione itens");
      return;
    }

    try {
      await api.post("/compras", {
        fornecedorId: Number(form.fornecedorId),
        itens: itens.map((i) => ({
          produtoId: Number(i.produtoId),
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
        })),
        observacoes: form.observacoes,
      });
      setNovaCompra(false);
      setForm({ fornecedorId: "", observacoes: "" });
      setItens([]);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function verDetalhe(id) {
    try {
      setDetalhe(await api.get(`/compras/${id}`));
    } catch (err) {
      setErro(err.message);
    }
  }

  async function receberCompra(id) {
    if (!confirm("Marcar como recebida e adicionar ao estoque?")) return;
    try {
      await api.put(`/compras/${id}/receber`, {});
      setErro("");
      setDetalhe(null);
      setFiltroStatus("RECEBIDA");
      setTimeout(() => carregar(), 500);
      alert("✅ Compra recebida com sucesso! Estoque atualizado.");
    } catch (err) {
      setErro(err.message);
    }
  }

  const fornecedorNome = (fId) => fornecedores.find((f) => f.id == fId)?.nome || "—";
  const produtoNome = (pId) => produtos.find((p) => p.id == pId)?.nome || "—";
  const totalItens = itens.reduce((a, i) => a + Number(i.quantidade * i.precoUnitario), 0);

  return (
    <>
      <div className="page-header">
        <h2>📦 Compras</h2>
        <button className="btn-mini ok" onClick={() => setNovaCompra(!novaCompra)}>
          {novaCompra ? "✕ Cancelar" : "+ Nova compra"}
        </button>
      </div>

      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}

      {novaCompra && (
        <div className="card">
          <h3>Nova Compra</h3>
          <div className="form-group">
            <label>Fornecedor *</label>
            <select value={form.fornecedorId} onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}>
              <option value="">Selecione um fornecedor</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>

          <h4>Itens da Compra</h4>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 12 }}>
            <select value={itemAtual.produtoId} onChange={(e) => setItemAtual({ ...itemAtual, produtoId: e.target.value })}>
              <option value="">Selecione um produto</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input type="number" placeholder="Qtd" min="1" value={itemAtual.quantidade} onChange={(e) => setItemAtual({ ...itemAtual, quantidade: e.target.value })} />
            <input type="number" placeholder="Preço unit." step="0.01" min="0" value={itemAtual.precoUnitario} onChange={(e) => setItemAtual({ ...itemAtual, precoUnitario: e.target.value })} />
            <button className="btn-mini ok" onClick={adicionarItem}>+</button>
          </div>

          {itens.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Preço Unit.</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td>{produtoNome(i.produtoId)}</td>
                    <td>{i.quantidade}</td>
                    <td>R$ {Number(i.precoUnitario).toFixed(2)}</td>
                    <td>R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</td>
                    <td><button className="btn-mini danger" onClick={() => removerItem(i.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12, textAlign: "right" }}>
            Total: R$ {totalItens.toFixed(2)}
          </div>

          <button className="btn-checkout" onClick={salvarCompra} style={{ marginTop: 12 }}>
            ✓ Salvar Compra
          </button>
        </div>
      )}

      <div className="card">
        <h3>Filtro por Status</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn-mini ${filtroStatus === "" ? "ativo" : ""}`} onClick={() => setFiltroStatus("")}>Todas</button>
          <button className={`btn-mini ${filtroStatus === "PENDENTE" ? "ativo" : ""}`} onClick={() => setFiltroStatus("PENDENTE")}>Pendentes</button>
          <button className={`btn-mini ok ${filtroStatus === "RECEBIDA" ? "ativo" : ""}`} onClick={() => setFiltroStatus("RECEBIDA")}>Recebidas</button>
          <button className={`btn-mini danger ${filtroStatus === "CANCELADA" ? "ativo" : ""}`} onClick={() => setFiltroStatus("CANCELADA")}>Canceladas</button>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fornecedor</th>
              <th>Status</th>
              <th>Total</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {compras.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhuma compra</td></tr>
            ) : compras.map((c) => (
              <tr key={c.id}>
                <td>#{c.id}</td>
                <td>{c.fornecedor_nome}</td>
                <td><span className={`status-badge ${c.status === "RECEBIDA" ? "ok" : c.status === "CANCELADA" ? "danger" : ""}`}>{c.status}</span></td>
                <td>R$ {Number(c.valor_total).toFixed(2)}</td>
                <td>{new Date(c.criado_em).toLocaleDateString("pt-BR")}</td>
                <td>
                  <button className="btn-mini" onClick={() => verDetalhe(c.id)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalhe && (
        <div className="modal-overlay" onClick={() => setDetalhe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ background: detalhe.compra.status === "PENDENTE" ? "#eef2ff" : "#f0fdf4", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <h3 style={{ margin: 0, marginBottom: 4 }}>📦 Receber Compra #{detalhe.compra.id}</h3>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                <strong>Fornecedor:</strong> {fornecedorNome(detalhe.compra.fornecedor_id)} |
                <strong style={{ marginLeft: 12 }}>Status:</strong> <span style={{ background: detalhe.compra.status === "RECEBIDA" ? "#dcfce7" : "#fef3c7", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{detalhe.compra.status}</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                {new Date(detalhe.compra.criado_em).toLocaleString("pt-BR")}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#334155" }}>
                <span style={{ color: "#6366f1", fontWeight: 700 }}>2. Produtos na Compra</span>
              </h4>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Preço Unit.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhe.itens.map((it) => (
                    <tr key={it.id}>
                      <td>{it.nome}</td>
                      <td style={{ textAlign: "center" }}>{it.quantidade}</td>
                      <td style={{ textAlign: "right" }}>R$ {Number(it.preco_unitario).toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>R$ {Number(it.valor_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b", fontWeight: 700 }}>3. Resumo da Compra</h4>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "#6366f1" }}>
                <span>Valor Total:</span>
                <strong>R$ {Number(detalhe.compra.valor_total).toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {detalhe.compra.status === "PENDENTE" && (
                <button
                  className="btn-checkout ok"
                  onClick={() => receberCompra(detalhe.compra.id)}
                  style={{ flex: 1, padding: 16, fontSize: 16, fontWeight: 700 }}
                >
                  ✓ Confirmar Recebimento
                </button>
              )}
              <button
                className="btn-mini"
                onClick={() => setDetalhe(null)}
                style={{ padding: "10px 16px" }}
              >
                {detalhe.compra.status === "RECEBIDA" ? "✓ Pronto" : "✕ Cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
