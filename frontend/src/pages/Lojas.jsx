import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Lojas() {
  const { can } = useAuth();
  const podeEditar = can("config.editar");
  const podeTransferir = can("estoque.editar");
  const [lojas, setLojas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState({ nome: "", codigo: "" });
  const [editId, setEditId] = useState(null);
  const [estoqueSel, setEstoqueSel] = useState(null); // { loja, itens }
  const [transf, setTransf] = useState({ origem: "", destino: "", produto_id: "", quantidade: "", observacao: "" });
  const [historico, setHistorico] = useState([]);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  async function carregar() {
    setLojas(await api.get("/unidades"));
    setHistorico(await api.get("/unidades/transferencias/historico").catch(() => []));
  }
  useEffect(() => { carregar(); api.get("/produtos").then(setProdutos).catch(() => {}); }, []);

  async function salvarLoja(e) {
    e.preventDefault(); setErro("");
    if (!form.nome) return setErro("Informe o nome da loja");
    try {
      if (editId) await api.put(`/unidades/${editId}`, form);
      else await api.post("/unidades", form);
      setForm({ nome: "", codigo: "" }); setEditId(null); carregar();
    } catch (err) { setErro(err.message); }
  }
  function editar(l) { setEditId(l.id); setForm({ nome: l.nome, codigo: l.codigo }); }

  async function verEstoque(l) { setEstoqueSel({ loja: l, itens: await api.get(`/unidades/${l.id}/estoque`) }); }

  async function transferir(e) {
    e.preventDefault(); setErro(""); setMsg("");
    if (!transf.origem || !transf.destino || transf.origem === transf.destino) return setErro("Escolha origem e destino diferentes");
    if (!transf.produto_id || !transf.quantidade) return setErro("Escolha produto e quantidade");
    try {
      await api.post("/unidades/transferir", {
        origem: Number(transf.origem), destino: Number(transf.destino),
        itens: [{ produto_id: Number(transf.produto_id), quantidade: Number(transf.quantidade) }],
        observacao: transf.observacao || null,
      });
      setMsg("✓ Transferência concluída");
      setTransf({ origem: "", destino: "", produto_id: "", quantidade: "", observacao: "" });
      carregar();
      if (estoqueSel) verEstoque(estoqueSel.loja);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { setErro(err.message); }
  }

  return (
    <>
      <div className="page-header"><h2>🏬 Lojas / Unidades</h2></div>

      <div className="grid-2col">
        <div className="card">
          <h3 className="card-title">Lojas</h3>
          <table className="data-table">
            <thead><tr><th>Código</th><th>Nome</th><th></th></tr></thead>
            <tbody>
              {lojas.map((l) => (
                <tr key={l.id} className={estoqueSel?.loja.id === l.id ? "row-sel" : ""}>
                  <td>{l.codigo}</td><td>{l.nome}</td>
                  <td>
                    <button className="btn-mini" onClick={() => verEstoque(l)}>Estoque</button>
                    {podeEditar && <button className="btn-mini" onClick={() => editar(l)}>Editar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {podeEditar && (
            <form className="form-inline" onSubmit={salvarLoja} style={{ marginTop: 12 }}>
              <input placeholder="Nome da loja" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <input placeholder="Cód" style={{ width: 70 }} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              <button className="btn-mini ok" type="submit">{editId ? "Salvar" : "+ Loja"}</button>
              {editId && <button type="button" className="btn-mini" onClick={() => { setEditId(null); setForm({ nome: "", codigo: "" }); }}>Cancelar</button>}
            </form>
          )}
        </div>

        <div className="card">
          {!estoqueSel ? <p className="vazio-txt">Clique em “Estoque” para ver o saldo de uma loja.</p> : (
            <>
              <h3 className="card-title">Estoque — {estoqueSel.loja.nome}</h3>
              <table className="data-table">
                <thead><tr><th>Cód</th><th>Produto</th><th>Qtd</th></tr></thead>
                <tbody>
                  {estoqueSel.itens.length === 0 ? <tr><td colSpan="3" className="vazio-txt">Sem itens nesta loja.</td></tr> :
                    estoqueSel.itens.map((i) => (
                      <tr key={i.produto_id}><td>{i.codigo}</td><td>{i.nome}</td><td>{Number(i.quantidade)}</td></tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {podeTransferir && (
        <div className="card">
          <h3 className="card-title">🔄 Transferência entre lojas</h3>
          {erro && <div className="alerta-card" style={{ marginBottom: 10 }}>{erro}</div>}
          {msg && <div className="ok-card" style={{ marginBottom: 10 }}>{msg}</div>}
          <form className="form-inline" onSubmit={transferir}>
            <select value={transf.origem} onChange={(e) => setTransf({ ...transf, origem: e.target.value })}>
              <option value="">Origem…</option>{lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
            <span>→</span>
            <select value={transf.destino} onChange={(e) => setTransf({ ...transf, destino: e.target.value })}>
              <option value="">Destino…</option>{lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
            <select value={transf.produto_id} onChange={(e) => setTransf({ ...transf, produto_id: e.target.value })}>
              <option value="">Produto…</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome.substring(0, 24)}</option>)}
            </select>
            <input type="number" min="1" placeholder="Qtd" style={{ width: 80 }} value={transf.quantidade} onChange={(e) => setTransf({ ...transf, quantidade: e.target.value })} />
            <button className="btn-checkout" style={{ width: "auto", padding: "8px 16px" }} type="submit">Transferir</button>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Histórico de transferências</h3>
        {historico.length === 0 ? <p className="vazio-txt">Nenhuma transferência ainda.</p> : (
          <table className="data-table">
            <thead><tr><th>Data</th><th>Origem</th><th>Destino</th><th>Itens</th></tr></thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.criado_em).toLocaleString("pt-BR")}</td>
                  <td>{h.origem_nome}</td><td>{h.destino_nome}</td><td>{Number(h.total_itens)} un</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
