import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const TIPOS = [
  { v: "PERCENTUAL", label: "Percentual (%)" },
  { v: "VALOR", label: "Valor fixo (R$ por unid.)" },
  { v: "LEVE_X_PAGUE_Y", label: "Leve X Pague Y" },
];
const DIAS = [["0","Dom"],["1","Seg"],["2","Ter"],["3","Qua"],["4","Qui"],["5","Sex"],["6","Sáb"]];
const VAZIO = { nome: "", tipo: "PERCENTUAL", valor: "", leve_qtd: "", pague_qtd: "", escopo: "GERAL", alvo_id: "", hora_inicio: "", hora_fim: "", dias_semana: "", data_inicio: "", data_fim: "", prioridade: 100 };

export default function Promocoes() {
  const { can } = useAuth();
  const podeEditar = can("produtos.editar");
  const [promos, setPromos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");

  async function carregar() { setPromos(await api.get("/promocoes")); }
  useEffect(() => {
    carregar();
    api.get("/produtos").then(setProdutos).catch(() => {});
    api.get("/categorias").then(setCategorias).catch(() => {});
  }, []);

  function toggleDia(d) {
    const set = new Set((form.dias_semana || "").split(",").filter(Boolean));
    set.has(d) ? set.delete(d) : set.add(d);
    setForm({ ...form, dias_semana: [...set].sort().join(",") });
  }

  async function salvar(e) {
    e.preventDefault(); setErro("");
    if (!form.nome) return setErro("Informe o nome");
    const payload = {
      ...form,
      valor: form.valor === "" ? null : Number(form.valor),
      leve_qtd: form.leve_qtd === "" ? null : Number(form.leve_qtd),
      pague_qtd: form.pague_qtd === "" ? null : Number(form.pague_qtd),
      alvo_id: form.alvo_id === "" ? null : Number(form.alvo_id),
      hora_inicio: form.hora_inicio || null, hora_fim: form.hora_fim || null,
      dias_semana: form.dias_semana || null,
      data_inicio: form.data_inicio || null, data_fim: form.data_fim || null,
      prioridade: Number(form.prioridade) || 100,
    };
    try { await api.post("/promocoes", payload); setForm(VAZIO); carregar(); }
    catch (err) { setErro(err.message); }
  }

  async function toggle(p) { await api.put(`/promocoes/${p.id}/ativo`, { ativo: !p.ativo }); carregar(); }
  async function excluir(p) { if (confirm(`Inativar "${p.nome}"?`)) { await api.del(`/promocoes/${p.id}`); carregar(); } }

  function descrTipo(p) {
    if (p.tipo === "PERCENTUAL") return `${Number(p.valor)}%`;
    if (p.tipo === "VALOR") return `R$ ${Number(p.valor).toFixed(2)}/un`;
    if (p.tipo === "LEVE_X_PAGUE_Y") return `Leve ${p.leve_qtd} Pague ${p.pague_qtd}`;
    return p.tipo;
  }

  return (
    <>
      <div className="page-header"><h2>🎁 Promoções</h2></div>

      <div className="grid-2col">
        {podeEditar && (
          <div className="card">
            <h3 className="card-title">Nova promoção</h3>
            {erro && <div className="alerta-card" style={{ marginBottom: 10 }}>{erro}</div>}
            <form className="form-stack" onSubmit={salvar}>
              <input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
              {form.tipo === "LEVE_X_PAGUE_Y" ? (
                <div className="form-inline">
                  <input type="number" min="1" placeholder="Leve" value={form.leve_qtd} onChange={(e) => setForm({ ...form, leve_qtd: e.target.value })} />
                  <input type="number" min="1" placeholder="Pague" value={form.pague_qtd} onChange={(e) => setForm({ ...form, pague_qtd: e.target.value })} />
                </div>
              ) : (
                <input type="number" step="0.01" placeholder={form.tipo === "PERCENTUAL" ? "Percentual (ex: 10)" : "Valor por unidade (R$)"} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              )}
              <div className="form-inline">
                <select value={form.escopo} onChange={(e) => setForm({ ...form, escopo: e.target.value, alvo_id: "" })}>
                  <option value="GERAL">Geral (tudo)</option>
                  <option value="PRODUTO">Produto</option>
                  <option value="CATEGORIA">Categoria</option>
                </select>
                {form.escopo === "PRODUTO" && (
                  <select value={form.alvo_id} onChange={(e) => setForm({ ...form, alvo_id: e.target.value })}>
                    <option value="">Escolha…</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome.substring(0, 24)}</option>)}
                  </select>
                )}
                {form.escopo === "CATEGORIA" && (
                  <select value={form.alvo_id} onChange={(e) => setForm({ ...form, alvo_id: e.target.value })}>
                    <option value="">Escolha…</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}
              </div>
              <div className="form-inline">
                <label className="lbl">Horário<input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></label>
                <label className="lbl">até<input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} /></label>
                <label className="lbl">Prioridade<input type="number" style={{ width: 70 }} value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} title="Menor número = maior prioridade" /></label>
              </div>
              <div className="dias-semana">
                {DIAS.map(([v, l]) => (
                  <button type="button" key={v} className={`dia-btn ${(form.dias_semana || "").split(",").includes(v) ? "on" : ""}`} onClick={() => toggleDia(v)}>{l}</button>
                ))}
              </div>
              <button className="btn-checkout" type="submit">Criar promoção</button>
            </form>
          </div>
        )}

        <div className="card">
          <h3 className="card-title">Promoções cadastradas</h3>
          {promos.length === 0 ? <p className="vazio-txt">Nenhuma promoção.</p> : (
            <table className="data-table">
              <thead><tr><th>Nome</th><th>Regra</th><th>Prior.</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} style={{ opacity: p.ativo ? 1 : 0.5 }}>
                    <td>{p.nome}</td>
                    <td>{descrTipo(p)}{p.escopo !== "GERAL" && <small> · {p.escopo.toLowerCase()}</small>}</td>
                    <td>{p.prioridade}</td>
                    <td><span className="status-badge" style={{ background: p.ativo ? "#22c55e" : "#94a3b8" }}>{p.ativo ? "ATIVA" : "INATIVA"}</span></td>
                    <td>
                      {podeEditar && <>
                        <button className={`btn-mini ${p.ativo ? "" : "ok"}`} onClick={() => toggle(p)}>{p.ativo ? "Pausar" : "Ativar"}</button>
                        <button className="btn-mini danger" onClick={() => excluir(p)}>✕</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
