import { useState, useEffect } from "react";

const VAZIO = { codigo: "", barras: "", nome: "", unidade: "UN", preco_custo: "", preco_venda: "", estoque_atual: "", estoque_minimo: "" };

export default function Produtos({ apiUrl }) {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    const res = await fetch(`${apiUrl}/produtos?q=${encodeURIComponent(busca)}`);
    setProdutos(await res.json());
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [busca]);

  function editar(p) {
    setEditando(p.id);
    setForm({
      codigo: p.codigo, barras: p.barras || "", nome: p.nome, unidade: p.unidade || "UN",
      preco_custo: "", preco_venda: p.preco_venda, estoque_atual: p.estoque_atual, estoque_minimo: p.estoque_minimo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelar() { setEditando(null); setForm(VAZIO); setErro(""); }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    const payload = {
      ...form,
      preco_custo: Number(form.preco_custo || 0),
      preco_venda: Number(form.preco_venda || 0),
      estoque_atual: Number(form.estoque_atual || 0),
      estoque_minimo: Number(form.estoque_minimo || 0),
    };
    const url = editando ? `${apiUrl}/produtos/${editando}` : `${apiUrl}/produtos`;
    const res = await fetch(url, {
      method: editando ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const e = await res.json();
      setErro(e.error || "Erro ao salvar");
      return;
    }
    cancelar();
    carregar();
  }

  async function excluir(p) {
    if (!confirm(`Inativar "${p.nome}"?`)) return;
    await fetch(`${apiUrl}/produtos/${p.id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <>
      <div className="page-header">
        <h2>🏷️ Produtos</h2>
        <div className="busca-container">
          <input type="text" placeholder="Filtrar produtos..." value={busca}
            onChange={(e) => setBusca(e.target.value)} className="busca-input" />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">{editando ? `✏️ Editando #${editando}` : "➕ Novo produto"}</h3>
        {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
        <form className="form-grid" onSubmit={salvar}>
          <input placeholder="Código *" value={form.codigo} disabled={!!editando}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          <input placeholder="Cód. barras" value={form.barras}
            onChange={(e) => setForm({ ...form, barras: e.target.value })} />
          <input placeholder="Nome *" value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input placeholder="Unidade" value={form.unidade}
            onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
          <input placeholder="Preço custo" type="number" step="0.01" value={form.preco_custo}
            onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
          <input placeholder="Preço venda" type="number" step="0.01" value={form.preco_venda}
            onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
          {!editando && (
            <input placeholder="Estoque inicial" type="number" value={form.estoque_atual}
              onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })} />
          )}
          <input placeholder="Estoque mínimo" type="number" value={form.estoque_minimo}
            onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
          <button className="btn-checkout" type="submit">{editando ? "Atualizar" : "Salvar"}</button>
          {editando && <button type="button" className="btn-mini" onClick={cancelar}>Cancelar</button>}
        </form>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>Cód</th><th>Produto</th><th>Un</th><th>Preço</th><th>Estoque</th><th></th></tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhum produto</td></tr>
            ) : produtos.map((p) => (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.nome}</td>
                <td>{p.unidade}</td>
                <td>R$ {Number(p.preco_venda).toFixed(2)}</td>
                <td>{Number(p.estoque_atual)}</td>
                <td>
                  <button className="btn-mini" onClick={() => editar(p)}>Editar</button>
                  <button className="btn-mini danger" onClick={() => excluir(p)}>Inativar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
