import { useState, useEffect } from "react";
import { api } from "../lib/api";

const VAZIO = {
  codigo: "", sku: "", barras: "", nome: "", descricao: "",
  categoria_id: "", marca_id: "", subcategoria: "",
  unidade: "UN", fornecedor_id: "",
  preco_custo: 0, preco_venda: 0, margem_lucro_pct: 0,
  estoque_minimo: 0, estoque_maximo: 999999,
  controla_estoque: true, permite_estoque_negativo: false,
  localizacao: "",
  preco_promocional: 0, data_inicio_promo: "", data_fim_promo: "",
  ncm: "", cest: "", cfop: "", origem: "", unidade_tributavel: "",
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const [abaSelecionada, setAbaSelecionada] = useState("basico");
  const [modalDetalhes, setModalDetalhes] = useState(null);

  async function carregar() {
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (filtroCategoria) params.set("categoria", filtroCategoria);
    if (filtroEstoque) params.set("estoquebaixo", "1");
    setProdutos(await api.get(`/produtos?${params.toString()}`));
  }

  useEffect(() => {
    api.get("/categorias").then(setCategorias).catch(() => {});
    api.get("/marcas").then(setMarcas).catch(() => {});
  }, []);

  useEffect(() => { carregar(); }, []);
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t); }, [busca, filtroCategoria, filtroEstoque]);

  function editar(p) {
    setEditando(p.id);
    setForm(p);
    setAbaSelecionada("basico");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpar() { setEditando(null); setForm(VAZIO); setErro(""); setAbaSelecionada("basico"); }

  function calcularMargem() {
    if (form.preco_custo > 0) {
      const margem = ((form.preco_venda - form.preco_custo) / form.preco_custo * 100).toFixed(2);
      setForm({ ...form, margem_lucro_pct: margem });
    }
  }

  function aplicarMargemComoPct(pct) {
    if (form.preco_custo > 0) {
      const venda = form.preco_custo * (1 + pct / 100);
      setForm({ ...form, preco_venda: venda.toFixed(2), margem_lucro_pct: pct });
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    if (!form.codigo || !form.nome) {
      setErro("Código e nome são obrigatórios");
      return;
    }

    try {
      if (editando) await api.put(`/produtos/${editando}`, form);
      else await api.post("/produtos", form);
      limpar();
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(p) {
    if (!confirm(`Inativar "${p.nome}"?`)) return;
    await api.del(`/produtos/${p.id}`);
    carregar();
  }

  const catNome = (id) => categorias.find((c) => c.id === id)?.nome || "—";
  const marcaNome = (id) => marcas.find((m) => m.id === id)?.nome || "—";
  const temEstoqueBaixo = (p) => p.controla_estoque && p.estoque_atual <= p.estoque_minimo;

  return (
    <>
      <div className="page-header">
        <h2>🏷️ Produtos Profissionais</h2>
        <div className="busca-container">
          <input type="text" placeholder="Buscar por nome, código, barras ou SKU..." value={busca}
            onChange={(e) => setBusca(e.target.value)} className="busca-input" />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="card">
        <h3 className="card-title">{editando ? `✏️ Editando #${editando}` : "➕ Novo produto"}</h3>
        {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
          {["basico", "estoque", "fiscal"].map((aba) => (
            <button
              key={aba}
              className={`btn-mini ${abaSelecionada === aba ? "ativo" : ""}`}
              onClick={() => setAbaSelecionada(aba)}
              type="button"
            >
              {aba === "basico" && "ℹ️ Básico"}
              {aba === "estoque" && "📦 Estoque"}
              {aba === "fiscal" && "📋 Fiscal"}
            </button>
          ))}
        </div>

        <form className="form-grid" onSubmit={salvar}>
          {/* ABA: BÁSICO */}
          {abaSelecionada === "basico" && (
            <>
              <input placeholder="Código *" value={form.codigo} disabled={!!editando}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              <input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              <input placeholder="Cód. barras (EAN)" value={form.barras} onChange={(e) => setForm({ ...form, barras: e.target.value })} />
              <input placeholder="Nome do produto *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={{ gridColumn: "1 / -1" }} />

              <textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} style={{ gridColumn: "1 / -1" }} />

              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Selecione categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
              </select>

              <select value={form.marca_id} onChange={(e) => setForm({ ...form, marca_id: e.target.value })}>
                <option value="">Selecione marca</option>
                {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>

              <input placeholder="Subcategoria" value={form.subcategoria} onChange={(e) => setForm({ ...form, subcategoria: e.target.value })} />
              <input placeholder="Unidade (UN, KG, L)" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
            </>
          )}

          {/* ABA: ESTOQUE */}
          {abaSelecionada === "estoque" && (
            <>
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>💰 Preços e Margens</strong>
              </div>

              <div>
                <label>Preço de custo</label>
                <input placeholder="0.00" type="number" step="0.01" value={form.preco_custo}
                  onChange={(e) => setForm({ ...form, preco_custo: parseFloat(e.target.value) || 0 })}
                  onBlur={calcularMargem} />
              </div>

              <div>
                <label>Preço de venda</label>
                <input placeholder="0.00" type="number" step="0.01" value={form.preco_venda}
                  onChange={(e) => setForm({ ...form, preco_venda: parseFloat(e.target.value) || 0 })}
                  onBlur={calcularMargem} />
              </div>

              <div>
                <label>Margem (%)</label>
                <input placeholder="0" type="number" step="0.01" value={form.margem_lucro_pct}
                  onChange={(e) => setForm({ ...form, margem_lucro_pct: e.target.value })} />
                <small>Clique rápido: <button type="button" onClick={() => aplicarMargemComoPct(20)}>20%</button> <button type="button" onClick={() => aplicarMargemComoPct(30)}>30%</button> <button type="button" onClick={() => aplicarMargemComoPct(50)}>50%</button></small>
              </div>

              <div>
                <label>Preço promocional</label>
                <input placeholder="0.00" type="number" step="0.01" value={form.preco_promocional || 0}
                  onChange={(e) => setForm({ ...form, preco_promocional: parseFloat(e.target.value) || 0 })} />
              </div>

              <div>
                <label>Início promoção</label>
                <input type="date" value={form.data_inicio_promo || ""} onChange={(e) => setForm({ ...form, data_inicio_promo: e.target.value })} />
              </div>

              <div>
                <label>Fim promoção</label>
                <input type="date" value={form.data_fim_promo || ""} onChange={(e) => setForm({ ...form, data_fim_promo: e.target.value })} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <strong>📦 Controle de Estoque</strong>
              </div>

              <div>
                <label>Estoque mínimo</label>
                <input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: parseFloat(e.target.value) || 0 })} />
              </div>

              <div>
                <label>Estoque máximo</label>
                <input type="number" value={form.estoque_maximo} onChange={(e) => setForm({ ...form, estoque_maximo: parseFloat(e.target.value) || 0 })} />
              </div>

              <div>
                <label>
                  <input type="checkbox" checked={form.controla_estoque} onChange={(e) => setForm({ ...form, controla_estoque: e.target.checked })} />
                  Controla estoque
                </label>
              </div>

              <div>
                <label>
                  <input type="checkbox" checked={form.permite_estoque_negativo} onChange={(e) => setForm({ ...form, permite_estoque_negativo: e.target.checked })} />
                  Permite estoque negativo
                </label>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>Localização no estoque</label>
                <input placeholder="Ex: Corredor A, Prateleira 2" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} />
              </div>
            </>
          )}

          {/* ABA: FISCAL */}
          {abaSelecionada === "fiscal" && (
            <>
              <div style={{ gridColumn: "1 / -1", color: "#64748b", fontSize: 12 }}>
                ℹ️ Campos preparados para fase fiscal (não geram emissão nesta fase)
              </div>

              <input placeholder="NCM (20 dígitos)" value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} />
              <input placeholder="CEST (7 dígitos)" value={form.cest} onChange={(e) => setForm({ ...form, cest: e.target.value })} />
              <input placeholder="CFOP (4 dígitos)" value={form.cfop} onChange={(e) => setForm({ ...form, cfop: e.target.value })} />

              <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
                <option value="">Origem do produto</option>
                <option value="0">0 - Nacional</option>
                <option value="1">1 - Estrangeira (importação direta)</option>
                <option value="2">2 - Estrangeira (adquirida no mercado interno)</option>
              </select>

              <input placeholder="Unidade tributável" value={form.unidade_tributavel} onChange={(e) => setForm({ ...form, unidade_tributavel: e.target.value })} />
            </>
          )}

          {/* BOTÕES FINAIS */}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-checkout" type="submit">{editando ? "✓ Atualizar" : "✓ Salvar"}</button>
            {editando && <button type="button" className="btn-mini" onClick={limpar}>✕ Cancelar</button>}
          </div>
        </form>
      </div>

      {/* FILTROS */}
      <div className="card">
        <h3 className="card-title">🔍 Filtros</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button className={`btn-mini ${filtroEstoque ? "ativo" : ""}`} onClick={() => setFiltroEstoque(!filtroEstoque)}>
            ⚠️ Estoque Baixo
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th>Marca</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Margem</th>
              <th>Estoque</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhum produto</td></tr>
            ) : produtos.map((p) => (
              <tr key={p.id} style={{ backgroundColor: temEstoqueBaixo(p) ? "#fee2e2" : "" }}>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.codigo}</td>
                <td>
                  {temEstoqueBaixo(p) && "⚠️ "}
                  <strong>{p.nome}</strong>
                  {p.sku && <div style={{ fontSize: 11, opacity: 0.7 }}>SKU: {p.sku}</div>}
                </td>
                <td>{marcaNome(p.marca_id)}</td>
                <td>{catNome(p.categoria_id)}</td>
                <td>R$ {Number(p.preco_venda).toFixed(2)}</td>
                <td>{Number(p.margem_lucro_pct).toFixed(1)}%</td>
                <td style={{ textAlign: "center" }}>
                  {p.controla_estoque ? (
                    <span style={{ color: Number(p.estoque_atual) <= p.estoque_minimo ? "#ef4444" : "#22c55e" }}>
                      {Number(p.estoque_atual).toFixed(3)}
                    </span>
                  ) : "—"}
                </td>
                <td>
                  <button className="btn-mini" onClick={() => { setModalDetalhes(p); setAbaSelecionada("basico"); }}>Ver</button>
                  <button className="btn-mini" onClick={() => editar(p)}>Editar</button>
                  <button className="btn-mini danger" onClick={() => excluir(p)}>Inativar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DETALHES */}
      {modalDetalhes && (
        <div className="modal-overlay" onClick={() => setModalDetalhes(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modalDetalhes.nome}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <small style={{ opacity: 0.7 }}>Código</small>
                <div>{modalDetalhes.codigo}</div>
              </div>
              <div>
                <small style={{ opacity: 0.7 }}>SKU</small>
                <div>{modalDetalhes.sku || "—"}</div>
              </div>
              <div>
                <small style={{ opacity: 0.7 }}>Barras</small>
                <div style={{ fontFamily: "monospace" }}>{modalDetalhes.barras || "—"}</div>
              </div>
              <div>
                <small style={{ opacity: 0.7 }}>Marca</small>
                <div>{marcaNome(modalDetalhes.marca_id)}</div>
              </div>
              <div>
                <small style={{ opacity: 0.7 }}>Preço Custo</small>
                <div>R$ {Number(modalDetalhes.preco_custo).toFixed(2)}</div>
              </div>
              <div>
                <small style={{ opacity: 0.7 }}>Preço Venda</small>
                <div>R$ {Number(modalDetalhes.preco_venda).toFixed(2)}</div>
              </div>
              <div>
                <small style={{ opacity: 0.7 }}>Margem</small>
                <div>{Number(modalDetalhes.margem_lucro_pct).toFixed(2)}%</div>
              </div>
              <div>
                <small style={{ opacity: 0.7 }}>Estoque</small>
                <div>{Number(modalDetalhes.estoque_atual).toFixed(3)} / {Number(modalDetalhes.estoque_maximo).toFixed(3)}</div>
              </div>
            </div>
            <button className="btn-mini" onClick={() => setModalDetalhes(null)}>Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}
