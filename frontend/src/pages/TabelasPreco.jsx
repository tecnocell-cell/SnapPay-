import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const TIPOS = ["VAREJO", "ATACADO", "ESPECIAL"];

export default function TabelasPreco() {
  const { can } = useAuth();
  const podeEditar = can("produtos.editar");
  const [tabelas, setTabelas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [sel, setSel] = useState(null); // { tabela, itens }
  const [novaTabela, setNovaTabela] = useState({ nome: "", tipo: "VAREJO", padrao: false });
  const [item, setItem] = useState({ produto_id: "", qtd_min: 1, preco: "" });
  const [teste, setTeste] = useState({ produto_id: "", quantidade: 1, resultado: null });
  const [erro, setErro] = useState("");

  async function carregar() { setTabelas(await api.get("/precos/tabelas")); }
  useEffect(() => { carregar(); api.get("/produtos").then(setProdutos).catch(() => {}); }, []);

  async function abrir(id) { setSel(await api.get(`/precos/tabelas/${id}`)); }

  async function criarTabela(e) {
    e.preventDefault(); setErro("");
    if (!novaTabela.nome) return setErro("Informe o nome");
    try {
      const t = await api.post("/precos/tabelas", novaTabela);
      setNovaTabela({ nome: "", tipo: "VAREJO", padrao: false });
      await carregar(); abrir(t.id);
    } catch (err) { setErro(err.message); }
  }

  async function inativar(t) {
    if (!confirm(`Inativar a tabela "${t.nome}"?`)) return;
    await api.del(`/precos/tabelas/${t.id}`);
    if (sel?.tabela.id === t.id) setSel(null);
    carregar();
  }
  async function tornarPadrao(t) { await api.put(`/precos/tabelas/${t.id}`, { padrao: true }); carregar(); }

  async function addItem(e) {
    e.preventDefault(); setErro("");
    if (!item.produto_id || item.preco === "") return setErro("Produto e preço são obrigatórios");
    try {
      await api.post(`/precos/tabelas/${sel.tabela.id}/itens`, {
        produto_id: Number(item.produto_id), qtd_min: Number(item.qtd_min) || 1, preco: Number(item.preco),
      });
      setItem({ produto_id: "", qtd_min: 1, preco: "" });
      abrir(sel.tabela.id);
    } catch (err) { setErro(err.message); }
  }

  async function resolver() {
    if (!teste.produto_id) return;
    const r = await api.get(`/precos/resolver?produto_id=${teste.produto_id}&quantidade=${teste.quantidade || 1}`);
    setTeste((t) => ({ ...t, resultado: r }));
  }

  return (
    <>
      <div className="page-header"><h2>🏷️ Tabelas de Preço</h2></div>

      <div className="grid-2col">
        {/* lista + nova */}
        <div className="card">
          <h3 className="card-title">Tabelas</h3>
          {tabelas.length === 0 ? <p className="vazio-txt">Nenhuma tabela ainda.</p> : (
            <table className="data-table">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Padrão</th><th></th></tr></thead>
              <tbody>
                {tabelas.map((t) => (
                  <tr key={t.id} className={sel?.tabela.id === t.id ? "row-sel" : ""}>
                    <td><button className="link-btn" onClick={() => abrir(t.id)}>{t.nome}</button></td>
                    <td><span className="tag">{t.tipo}</span></td>
                    <td>{t.padrao ? "★" : <button className="link-btn" disabled={!podeEditar} onClick={() => tornarPadrao(t)}>definir</button>}</td>
                    <td>{podeEditar && <button className="btn-mini danger" onClick={() => inativar(t)}>Inativar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {podeEditar && (
            <form className="form-inline" onSubmit={criarTabela} style={{ marginTop: 14 }}>
              <input placeholder="Nova tabela" value={novaTabela.nome} onChange={(e) => setNovaTabela({ ...novaTabela, nome: e.target.value })} />
              <select value={novaTabela.tipo} onChange={(e) => setNovaTabela({ ...novaTabela, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <label className="chk"><input type="checkbox" checked={novaTabela.padrao} onChange={(e) => setNovaTabela({ ...novaTabela, padrao: e.target.checked })} /> padrão</label>
              <button className="btn-mini ok" type="submit">+ Criar</button>
            </form>
          )}

          <div className="box-teste">
            <h4>🧪 Testar preço (resolver)</h4>
            <div className="form-inline">
              <select value={teste.produto_id} onChange={(e) => setTeste({ ...teste, produto_id: e.target.value })}>
                <option value="">Produto…</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome.substring(0, 28)}</option>)}
              </select>
              <input type="number" min="1" style={{ width: 70 }} value={teste.quantidade} onChange={(e) => setTeste({ ...teste, quantidade: e.target.value })} />
              <button className="btn-mini" onClick={resolver}>Resolver</button>
            </div>
            {teste.resultado && (
              <p className="teste-res">→ R$ {Number(teste.resultado.preco).toFixed(2)} <small>({teste.resultado.origem}, faixa ≥ {teste.resultado.faixa_qtd_min})</small></p>
            )}
          </div>
        </div>

        {/* itens da tabela */}
        <div className="card">
          {!sel ? <p className="vazio-txt">Selecione uma tabela para configurar faixas de preço.</p> : (
            <>
              <h3 className="card-title">{sel.tabela.nome} <span className="tag">{sel.tabela.tipo}</span></h3>
              {podeEditar && (
                <form className="form-inline" onSubmit={addItem}>
                  <select value={item.produto_id} onChange={(e) => setItem({ ...item, produto_id: e.target.value })}>
                    <option value="">Produto…</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome.substring(0, 24)}</option>)}
                  </select>
                  <input type="number" min="1" placeholder="Qtd mín" style={{ width: 80 }} value={item.qtd_min} onChange={(e) => setItem({ ...item, qtd_min: e.target.value })} title="Faixa: a partir de quantas unidades" />
                  <input type="number" step="0.01" placeholder="Preço" style={{ width: 90 }} value={item.preco} onChange={(e) => setItem({ ...item, preco: e.target.value })} />
                  <button className="btn-mini ok" type="submit">+ Faixa</button>
                </form>
              )}
              {erro && <div className="alerta-card" style={{ margin: "10px 0" }}>{erro}</div>}
              <table className="data-table" style={{ marginTop: 10 }}>
                <thead><tr><th>Produto</th><th>A partir de</th><th>Preço</th></tr></thead>
                <tbody>
                  {sel.itens.length === 0 ? <tr><td colSpan="3" className="vazio-txt">Sem faixas. Adicione acima.</td></tr> :
                    sel.itens.map((i) => (
                      <tr key={i.id}><td>{i.produto_nome}</td><td>{Number(i.qtd_min)} un</td><td>R$ {Number(i.preco).toFixed(2)}</td></tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
      {erro && !sel && <div className="alerta-card">{erro}</div>}
    </>
  );
}
