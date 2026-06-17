import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function PDV() {
  const { can } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catAtiva, setCatAtiva] = useState(null);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("DINHEIRO");
  const [descontoTotal, setDescontoTotal] = useState(0);
  const [caixa, setCaixa] = useState({ aberto: false, saldo: 0 });
  const [kpis, setKpis] = useState({ hoje: { total: 0, qtd: 0 }, ticketMedio: 0 });
  const [vendaOk, setVendaOk] = useState(null);
  const [erro, setErro] = useState("");
  const buscaRef = useRef(null);

  // ---- carregamento ----
  const carregarProdutos = useCallback(async () => {
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (catAtiva) params.set("categoria", catAtiva);
    // sem busca e sem categoria: traz catálogo (q vazio retorna tudo da empresa)
    setProdutos(await api.get(`/produtos?${params.toString()}`));
  }, [busca, catAtiva]);

  useEffect(() => { api.get("/categorias").then(setCategorias).catch(() => {}); }, []);
  useEffect(() => { api.get("/clientes").then(setClientes).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(carregarProdutos, 200); return () => clearTimeout(t); }, [carregarProdutos]);

  async function atualizarPainel() {
    try { setCaixa(await api.get("/caixa/atual")); } catch { /* */ }
    try { setKpis(await api.get("/relatorios/resumo")); } catch { /* */ }
  }
  useEffect(() => { atualizarPainel(); }, []);

  // ---- carrinho ----
  const subtotal = carrinho.reduce((a, i) => a + i.quantidade * i.precoUnitario, 0);
  const total = Math.max(0, subtotal - Number(descontoTotal || 0));

  function adicionar(p) {
    setErro("");
    setCarrinho((prev) => {
      const ex = prev.find((i) => i.produtoId === p.id);
      if (ex) return prev.map((i) => i.produtoId === p.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { produtoId: p.id, nome: p.nome, quantidade: 1, precoUnitario: Number(p.preco_venda), estoque: Number(p.estoque_atual) }];
    });
  }
  function alterarQtd(id, q) {
    if (q <= 0) return remover(id);
    setCarrinho((prev) => prev.map((i) => i.produtoId === id ? { ...i, quantidade: q } : i));
  }
  function remover(id) { setCarrinho((prev) => prev.filter((i) => i.produtoId !== id)); }
  function limpar() { setCarrinho([]); setClienteId(""); setDescontoTotal(0); setErro(""); }

  async function finalizar() {
    if (carrinho.length === 0) return;
    setErro("");
    try {
      const data = await api.post("/vendas", {
        clienteId: clienteId ? Number(clienteId) : null,
        itens: carrinho.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, precoUnitario: i.precoUnitario, desconto: 0 })),
        pagamentos: [{ forma: formaPagamento, valor: total }],
      });
      setVendaOk({ id: data.id, total });
      limpar(); carregarProdutos(); atualizarPainel();
      setTimeout(() => setVendaOk(null), 4000);
    } catch (err) {
      setErro(err.message || "Erro ao finalizar venda");
    }
  }

  // ---- atalhos de teclado F2–F10 + ESC ----
  useEffect(() => {
    function onKey(e) {
      const k = e.key;
      if (["F2","F3","F4","F5","F6","F7","F8","F9","F10"].includes(k)) e.preventDefault();
      if (k === "F2") document.getElementById("pdv-cliente")?.focus();
      else if (k === "F3") buscaRef.current?.focus();
      else if (k === "F4") document.getElementById("pdv-desconto")?.focus();
      else if (k === "F5") finalizar();
      else if (k === "F6") { if (carrinho.length) remover(carrinho[carrinho.length - 1].produtoId); }
      else if (k === "F7") abrirCaixaRapido();
      else if (k === "F8") fecharCaixaRapido();
      else if (k === "F9") movimentarCaixa("SANGRIA");
      else if (k === "F10") movimentarCaixa("SUPRIMENTO");
      else if (k === "Escape") limpar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function abrirCaixaRapido() {
    if (caixa.aberto || !can("caixa.operar")) return;
    const v = Number(prompt("Abrir caixa — valor inicial:", "0") || 0);
    await api.post("/caixa/abrir", { valorAbertura: v }); atualizarPainel();
  }
  async function fecharCaixaRapido() {
    if (!caixa.aberto || !can("caixa.operar")) return;
    if (!confirm("Fechar o caixa?")) return;
    const r = await api.post("/caixa/fechar", {});
    alert(`Caixa fechado. Saldo: R$ ${Number(r.saldoFinal).toFixed(2)}`); atualizarPainel();
  }
  async function movimentarCaixa(tipo) {
    if (!caixa.aberto || !can("caixa.sangria")) return;
    const v = Number(prompt(`${tipo} — valor:`, "0") || 0);
    if (v <= 0) return;
    await api.post("/caixa/movimentar", { tipo, valor: v }); atualizarPainel();
  }

  return (
    <div className="pdv2">
      {/* faixa de KPIs / dashboard */}
      <div className="pdv2-kpis">
        <div className="kpi"><span>Vendas hoje</span><strong>R$ {kpis.hoje.total.toFixed(2)}</strong></div>
        <div className="kpi"><span>Nº vendas</span><strong>{kpis.hoje.qtd}</strong></div>
        <div className="kpi"><span>Ticket médio</span><strong>R$ {kpis.ticketMedio.toFixed(2)}</strong></div>
        <div className={`kpi ${caixa.aberto ? "ok" : "off"}`}>
          <span>Caixa {caixa.aberto ? "aberto" : "fechado"}</span>
          <strong>R$ {Number(caixa.saldo || 0).toFixed(2)}</strong>
        </div>
      </div>

      <div className="pdv2-grid">
        {/* coluna central: categorias + produtos */}
        <div className="pdv2-center">
          <div className="pdv2-cats">
            <button className={`cat-btn ${!catAtiva ? "ativo" : ""}`} onClick={() => setCatAtiva(null)}>Todos</button>
            {categorias.map((c) => (
              <button key={c.id} className={`cat-btn ${catAtiva == c.id ? "ativo" : ""}`}
                style={catAtiva == c.id ? { background: c.cor, borderColor: c.cor, color: "#fff" } : { borderColor: c.cor }}
                onClick={() => setCatAtiva(c.id)}>{c.icone} {c.nome}</button>
            ))}
          </div>

          <div className="pdv2-busca">
            <input ref={buscaRef} autoFocus placeholder="🔍 Buscar produto ou código de barras… (F3)"
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          <div className="pdv2-produtos">
            {produtos.length === 0 ? (
              <div className="vazio"><div className="vazio-icon">📦</div><p>Nenhum produto encontrado</p></div>
            ) : produtos.map((p) => {
              const semEstoque = Number(p.estoque_atual) <= 0;
              return (
                <button key={p.id} className={`prod-card ${semEstoque ? "sem-estoque" : ""}`}
                  onClick={() => !semEstoque && adicionar(p)} disabled={semEstoque}>
                  <span className={`prod-badge ${Number(p.estoque_atual) <= Number(p.estoque_minimo) ? "baixo" : ""}`}>
                    {Number(p.estoque_atual)}
                  </span>
                  <span className="prod-nome">{p.nome.substring(0, 40)}</span>
                  <span className="prod-cod">Cód {p.codigo}</span>
                  <span className="prod-preco">R$ {Number(p.preco_venda).toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* coluna direita: carrinho */}
        <aside className="pdv2-cart">
          <div className="cart-head">
            <h3>🛒 Carrinho</h3>
            <span className="cart-count">{carrinho.length}</span>
          </div>

          <div className="cart-cliente">
            <label>Cliente (opcional) <kbd>F2</kbd></label>
            <select id="pdv-cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Consumidor final</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="cart-itens">
            {carrinho.length === 0 ? (
              <div className="cart-vazio">Nenhum item — clique nos produtos</div>
            ) : carrinho.map((i) => (
              <div key={i.produtoId} className="cart-item">
                <div className="ci-nome">{i.nome.substring(0, 22)}<small>R$ {i.precoUnitario.toFixed(2)}</small></div>
                <input className="ci-qtd" type="number" min="1" value={i.quantidade}
                  onChange={(e) => alterarQtd(i.produtoId, Number(e.target.value))} />
                <div className="ci-sub">R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</div>
                <button className="ci-x" onClick={() => remover(i.produtoId)}>✕</button>
              </div>
            ))}
          </div>

          {erro && <div className="cart-erro">⚠️ {erro}</div>}

          <div className="cart-foot">
            <div className="cart-linha"><span>Subtotal</span><b>R$ {subtotal.toFixed(2)}</b></div>
            <div className="cart-linha desconto">
              <span>Desconto <kbd>F4</kbd></span>
              <input id="pdv-desconto" type="number" min="0" value={descontoTotal}
                onChange={(e) => setDescontoTotal(e.target.value)} />
            </div>
            <div className="cart-total"><span>TOTAL</span><strong>R$ {total.toFixed(2)}</strong></div>

            <select className="cart-pgto" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="DINHEIRO">💵 Dinheiro</option>
              <option value="DEBITO">🏧 Débito</option>
              <option value="CREDITO">💳 Crédito</option>
              <option value="PIX">📱 PIX</option>
              <option value="CREDIARIO">📋 Crediário</option>
            </select>

            <button className="cart-finalizar" onClick={finalizar} disabled={carrinho.length === 0}>
              ✓ FINALIZAR VENDA <kbd>F5</kbd>
            </button>
          </div>
        </aside>
      </div>

      {vendaOk && (
        <div className="venda-toast">✓ Venda #{vendaOk.id} finalizada — R$ {vendaOk.total.toFixed(2)}</div>
      )}
    </div>
  );
}
