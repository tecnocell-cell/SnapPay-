import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Kardex() {
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [carregando, setCarregando] = useState(false);

  const TIPOS_MOVIMENTO = {
    ENTRADA_COMPRA: "📦 Entrada (Compra)",
    SAIDA_VENDA: "🛒 Saída (Venda)",
    AJUSTE_ENTRADA: "📈 Ajuste (Entrada)",
    AJUSTE_SAIDA: "📉 Ajuste (Saída)",
    CANCELAMENTO_VENDA: "↩️ Cancelamento de Venda",
    DEVOLUCAO: "↪️ Devolução",
    INVENTARIO: "📋 Inventário",
  };

  useEffect(() => {
    api.get("/produtos").then(setProdutos).catch(() => {});
  }, []);

  async function carregarKardex() {
    if (!produtoSelecionado) {
      alert("Selecione um produto");
      return;
    }

    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);
      if (filtroTipo) params.set("tipo", filtroTipo);

      const movs = await api.get(`/produtos/kardex/${produtoSelecionado}?${params.toString()}`);
      setMovimentacoes(movs);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  const dataBR = (s) => s ? new Date(s).toLocaleString("pt-BR") : "—";

  const produto = produtos.find((p) => p.id === produtoSelecionado);

  return (
    <>
      <div className="page-header">
        <h2>📊 Kardex (Histórico de Movimentação)</h2>
      </div>

      {/* SELETOR DE PRODUTO */}
      <div className="card">
        <h3 className="card-title">Selecione um Produto</h3>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <select value={produtoSelecionado || ""} onChange={(e) => setProdutoSelecionado(Number(e.target.value) || null)}>
            <option value="">-- Selecionar produto --</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.codigo}] {p.nome} — Estoque: {Number(p.estoque_atual).toFixed(3)}
              </option>
            ))}
          </select>
          <button className="btn-checkout" onClick={carregarKardex} disabled={!produtoSelecionado || carregando}>
            {carregando ? "Carregando..." : "📂 Carregar Kardex"}
          </button>
        </div>
      </div>

      {/* INFORMAÇÕES DO PRODUTO */}
      {produto && (
        <div className="card">
          <h3 className="card-title">ℹ️ Informações do Produto</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <div>
              <small style={{ opacity: 0.7 }}>Código</small>
              <div style={{ fontFamily: "monospace" }}>{produto.codigo}</div>
            </div>
            <div>
              <small style={{ opacity: 0.7 }}>SKU</small>
              <div>{produto.sku || "—"}</div>
            </div>
            <div>
              <small style={{ opacity: 0.7 }}>Barras</small>
              <div style={{ fontFamily: "monospace", fontSize: 12 }}>{produto.barras || "—"}</div>
            </div>
            <div>
              <small style={{ opacity: 0.7 }}>Unidade</small>
              <div>{produto.unidade}</div>
            </div>
            <div>
              <small style={{ opacity: 0.7 }}>Preço Custo</small>
              <div>R$ {Number(produto.preco_custo).toFixed(2)}</div>
            </div>
            <div>
              <small style={{ opacity: 0.7 }}>Preço Venda</small>
              <div>R$ {Number(produto.preco_venda).toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: "#eff6ff", padding: 12, borderRadius: 6, borderLeft: "3px solid #3b82f6" }}>
              <small style={{ opacity: 0.7 }}>Estoque Atual</small>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
                {Number(produto.estoque_atual).toFixed(3)}
              </div>
            </div>
            <div>
              <small style={{ opacity: 0.7 }}>Estoque Mínimo</small>
              <div>{Number(produto.estoque_minimo).toFixed(3)}</div>
            </div>
            <div>
              <small style={{ opacity: 0.7 }}>Estoque Máximo</small>
              <div>{Number(produto.estoque_maximo).toFixed(3)}</div>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      {produtoSelecionado && (
        <div className="card">
          <h3 className="card-title">🔍 Filtros</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div className="form-group">
              <label>Tipo de Movimento</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos os tipos</option>
                {Object.entries(TIPOS_MOVIMENTO).map(([tipo, label]) => (
                  <option key={tipo} value={tipo}>{label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Data Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Data Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn-mini ok" onClick={carregarKardex} disabled={carregando}>
                🔎 Filtrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABELA DE MOVIMENTAÇÕES */}
      {produtoSelecionado && (
        <div className="card">
          <h3 className="card-title">
            📋 Movimentações {movimentacoes.length > 0 && `(${movimentacoes.length} registros)`}
          </h3>

          {carregando ? (
            <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
              Carregando movimentações...
            </div>
          ) : movimentacoes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
              Nenhuma movimentação encontrada
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Saldo Anterior</th>
                  <th>Saldo Posterior</th>
                  <th>Origem</th>
                  <th>Usuário</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((mov) => (
                  <tr key={mov.id}>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {dataBR(mov.criado_em)}
                    </td>
                    <td>
                      {TIPOS_MOVIMENTO[mov.tipo] || mov.tipo}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {mov.tipo.includes("SAIDA") ? "-" : "+"}{Number(mov.quantidade).toFixed(3)}
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12 }}>
                      {mov.saldo_anterior !== null ? Number(mov.saldo_anterior).toFixed(3) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                      {mov.saldo_posterior !== null ? Number(mov.saldo_posterior).toFixed(3) : "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {mov.origem || "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {mov.usuario_nome || "Sistema"}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {mov.observacao || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!produtoSelecionado && (
        <div style={{ textAlign: "center", padding: 60, opacity: 0.6 }}>
          <p>Selecione um produto para visualizar seu histórico de movimentação</p>
        </div>
      )}
    </>
  );
}
