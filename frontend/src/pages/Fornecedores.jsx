import { useState, useEffect } from "react";
import { api } from "../lib/api";

const VAZIO = { nome: "", cnpj: "", email: "", telefone: "", endereco: "", observacoes: "" };

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    const params = busca ? `?q=${encodeURIComponent(busca)}` : "";
    try {
      setFornecedores(await api.get(`/fornecedores${params}`));
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [busca]);

  function editar(f) {
    setEditando(f.id);
    setForm({ nome: f.nome, cnpj: f.cnpj || "", email: f.email || "", telefone: f.telefone || "", endereco: f.endereco || "", observacoes: f.observacoes || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpar() {
    setEditando(null);
    setForm(VAZIO);
    setErro("");
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    if (!form.nome) {
      setErro("Nome é obrigatório");
      return;
    }

    try {
      if (editando) await api.put(`/fornecedores/${editando}`, form);
      else await api.post("/fornecedores", form);
      limpar();
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(f) {
    if (!confirm(`Inativar fornecedor "${f.nome}"?`)) return;
    try {
      await api.del(`/fornecedores/${f.id}`);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>🏭 Fornecedores</h2>
        <div className="busca-container">
          <input
            type="text"
            placeholder="Filtrar por nome ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="busca-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">{editando ? "Editar fornecedor" : "Novo fornecedor"}</h3>
        {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
        <form className="form-grid" onSubmit={salvar}>
          <input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          <input placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          <input placeholder="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          <textarea placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <button className="btn-checkout" type="submit">{editando ? "Atualizar" : "Salvar"}</button>
          {editando && <button type="button" className="btn-mini" onClick={limpar}>Cancelar</button>}
        </form>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CNPJ</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhum fornecedor cadastrado</td></tr>
            ) : fornecedores.map((f) => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>{f.cnpj || "—"}</td>
                <td>{f.telefone || "—"}</td>
                <td>{f.email || "—"}</td>
                <td>
                  <button className="btn-mini" onClick={() => editar(f)}>Editar</button>
                  <button className="btn-mini danger" onClick={() => excluir(f)}>Inativar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
