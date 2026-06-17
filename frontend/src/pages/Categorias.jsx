import { useState, useEffect } from "react";
import { api } from "../lib/api";

const ICONES = ["🏷️", "🥤", "🍞", "🧽", "🧴", "🍫", "🥩", "🧊", "🧀", "🍎", "📦", "🧹"];

export default function Categorias() {
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ nome: "", cor: "#6366f1", icone: "🏷️", ordem: 100 });
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar() { setCats(await api.get("/categorias")); }
  useEffect(() => { carregar(); }, []);

  function editar(c) { setEditando(c.id); setForm({ nome: c.nome, cor: c.cor, icone: c.icone, ordem: c.ordem }); }
  function limpar() { setEditando(null); setForm({ nome: "", cor: "#6366f1", icone: "🏷️", ordem: 100 }); setErro(""); }

  async function salvar(e) {
    e.preventDefault(); setErro("");
    try {
      if (editando) await api.put(`/categorias/${editando}`, form);
      else await api.post("/categorias", form);
      limpar(); carregar();
    } catch (err) { setErro(err.message); }
  }
  async function excluir(c) {
    if (!confirm(`Inativar categoria "${c.nome}"?`)) return;
    await api.del(`/categorias/${c.id}`); carregar();
  }

  return (
    <>
      <div className="page-header"><h2>🗂️ Categorias</h2></div>
      <div className="card">
        <h3 className="card-title">{editando ? "Editar categoria" : "Nova categoria"}</h3>
        {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
        <form className="form-grid" onSubmit={salvar}>
          <input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <select value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })}>
            {ICONES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} style={{ height: 40 }} />
          <input type="number" placeholder="Ordem" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} />
          <button className="btn-checkout" type="submit">{editando ? "Atualizar" : "Salvar"}</button>
          {editando && <button type="button" className="btn-mini" onClick={limpar}>Cancelar</button>}
        </form>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Ícone</th><th>Nome</th><th>Cor</th><th>Ordem</th><th></th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: 20 }}>{c.icone}</td>
                <td>{c.nome}</td>
                <td><span className="dot" style={{ background: c.cor }} /> {c.cor}</td>
                <td>{c.ordem}</td>
                <td>
                  <button className="btn-mini" onClick={() => editar(c)}>Editar</button>
                  <button className="btn-mini danger" onClick={() => excluir(c)}>Inativar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
