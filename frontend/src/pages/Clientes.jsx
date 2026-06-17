import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ nome: "", cpf_cnpj: "", telefone: "", email: "", limite_credito: "" });
  const [historico, setHistorico] = useState(null);

  async function carregar() {
    const params = busca ? `?q=${encodeURIComponent(busca)}` : "";
    setClientes(await api.get(`/clientes${params}`));
  }
  useEffect(() => { carregar(); }, []);
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [busca]);

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome) return;
    await api.post("/clientes", { ...form, limite_credito: Number(form.limite_credito || 0) });
    setForm({ nome: "", cpf_cnpj: "", telefone: "", email: "", limite_credito: "" });
    carregar();
  }
  async function verHistorico(c) {
    const vendas = await api.get(`/clientes/${c.id}/historico`);
    setHistorico({ cliente: c, vendas });
  }

  return (
    <>
      <div className="page-header">
        <h2>👥 Clientes</h2>
        <div className="busca-container">
          <input type="text" placeholder="Buscar por nome ou CPF/CNPJ..." value={busca} onChange={(e) => setBusca(e.target.value)} className="busca-input" />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Novo cliente</h3>
        <form className="form-grid" onSubmit={salvar}>
          <input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input placeholder="CPF/CNPJ" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
          <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          <input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Limite crédito" type="number" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: e.target.value })} />
          <button className="btn-checkout" type="submit">Salvar</button>
        </form>
      </div>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>Limite</th><th></th></tr></thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhum cliente cadastrado</td></tr>
            ) : clientes.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td><td>{c.cpf_cnpj || "-"}</td><td>{c.telefone || "-"}</td>
                <td>R$ {Number(c.limite_credito).toFixed(2)}</td>
                <td><button className="btn-mini" onClick={() => verHistorico(c)}>Histórico</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historico && (
        <div className="modal-overlay" onClick={() => setHistorico(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Histórico — {historico.cliente.nome}</h3>
            {historico.vendas.length === 0 ? <p>Sem compras registradas.</p> : (
              <table className="data-table">
                <thead><tr><th>Venda</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {historico.vendas.map((v) => (
                    <tr key={v.id}><td>#{v.id}</td><td>R$ {Number(v.valor_total).toFixed(2)}</td><td>{v.status}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn-checkout" onClick={() => setHistorico(null)}>Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}
