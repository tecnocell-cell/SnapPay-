import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const MODOS = [
  { id: "mercado", label: "Mercado", icon: "🏪" },
  { id: "loja", label: "Loja", icon: "🛍️" },
];

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
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [vendaOk, setVendaOk] = useState(null);
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState(() => localStorage.getItem("snappay_pdv_modo") || "mercado");
  const buscaRef = useRef(null);

  useEffect(() => { localStorage.setItem("snappay_pdv_modo", modo); }, [modo]);

  // ---- carregamento ----
  const carregarProdutos = useCallback(async () => {
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (catAtiva) params.set("categoria", catAtiva);
    setProdutos(await api.get(`/produtos?${params.toString()}`));
  }, [busca, catAtiva]);

  useEffect(() => { api.get("/categorias").then(setCategorias).catch(() => {}); }, []);
  useEffect(() => { api.get("/clientes").then(setClientes).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(carregarProdutos, 200); return () => clearTimeout(t); }, [carregarProdutos]);
  useEffect(() => { api.get("/caixa/atual").then((c) => setCaixaAberto(c.aberto)).catch(() => {}); }, []);

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

  // Enter na busca do Modo Mercado: adiciona 1º resultado (fluxo leitor de código)
  function onBuscaKeyDown(e) {
    if (e.key === "Enter" && produtos.length > 0) {
      adicionar(produtos[0]);
      setBusca("");
    }
  }

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
      limpar(); carregarProdutos();
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
      else if (k === "F7") caixaRapido("/caixa/abrir", { valorAbertura: 0 }, "caixa.operar", caixaAberto, false);
      else if (k === "F8") caixaRapido("/caixa/fechar", {}, "caixa.operar", !caixaAberto, true);
      else if (k === "F9") movimentarCaixa("SANGRIA");
      else if (k === "F10") movimentarCaixa("SUPRIMENTO");
      else if (k === "Escape") limpar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function caixaRapido(rota, body, perm, bloqueado, isFechar) {
    if (bloqueado || !can(perm)) return;
    if (isFechar && !confirm("Fechar o caixa?")) return;
    const r = await api.post(rota, body);
    if (isFechar && r) alert(`Caixa fechado. Saldo: R$ ${Number(r.saldoFinal).toFixed(2)}`);
    api.get("/caixa/atual").then((c) => setCaixaAberto(c.aberto));
  }
  async function movimentarCaixa(tipo) {
    if (!caixaAberto || !can("caixa.sangria")) return;
    const v = Number(prompt(`${tipo} — valor:`, "0") || 0);
    if (v <= 0) return;
    await api.post("/caixa/movimentar", { tipo, valor: v });
  }

  // ----- carrinho compartilhado entre os modos -----
  const Carrinho = (
    <aside className="pdv2-cart">
      <div className="cart-head">
        <h3>🛒 Carrinho</h3>
        <span className="cart-count">{carrinho.length}</span>
      </div>

      <div className="cart-cliente">
        <select id="pdv-cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} title="Cliente (F2)">
          <option value="">Consumidor final</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="cart-itens">
        {carrinho.length === 0 ? (
          <div className="cart-vazio">Nenhum item</div>
        ) : carrinho.map((i) => (
          <div key={i.produtoId} className="cart-item">
            <div className="ci-nome">{i.nome.substring(0, 24)}<small>R$ {i.precoUnitario.toFixed(2)}</small></div>
            <input className="ci-qtd" type="number" min="1" value={i.quantidade}
              onChange={(e) => alterarQtd(i.produtoId, Number(e.target.value))} />
            <div className="ci-sub">R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</div>
            <button className="ci-x" onClick={() => remover(i.produtoId)}>✕</button>
          </div>
        ))}
      </div>

      {erro && <div className="cart-erro">⚠️ {erro}</div>}

      <div className="cart-foot">
        <div className="cart-total"><span>TOTAL</span><strong>R$ {total.toFixed(2)}</strong></div>
        <button className="cart-finalizar" onClick={finalizar} disabled={carrinho.length === 0}>
          ✓ FINALIZAR <kbd>F5</kbd>
        </button>
        <details className="cart-extras">
          <summary>Desconto e pagamento</summary>
          <div className="cart-linha desconto">
            <span>Desconto <kbd>F4</kbd></span>
            <input id="pdv-desconto" type="number" min="0" value={descontoTotal}
              onChange={(e) => setDescontoTotal(e.target.value)} />
          </div>
          <select className="cart-pgto" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
            <option value="DINHEIRO">💵 Dinheiro</option>
            <option value="DEBITO">🏧 Débito</option>
            <option value="CREDITO">💳 Crédito</option>
            <option value="PIX">📱 PIX</option>
            <option value="CREDIARIO">📋 Crediário</option>
          </select>
        </details>
      </div>
    </aside>
  );

  return (
    <div className="pdv2">
      {/* barra de modos */}
      <div className="pdv2-modos">
        {MODOS.map((m) => (
          <button key={m.id} className={`modo-btn ${modo === m.id ? "ativo" : ""}`} onClick={() => setModo(m.id)}>
            {m.icon} {m.label}
          </button>
        ))}
        {!caixaAberto && <span className="pdv2-caixa-aviso">⚠️ Caixa fechado — abra com F7</span>}
      </div>

      <div className={`pdv2-grid ${modo === "mercado" ? "modo-mercado" : "modo-loja"}`}>
        <div className="pdv2-center">
          {/* MODO MERCADO: busca gigante + lista compacta */}
          {modo === "mercado" && (
            <>
              <div className="pdv2-busca grande">
                <input ref={buscaRef} autoFocus placeholder="🔍 Código de barras ou nome — Enter adiciona (F3)"
                  value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={onBuscaKeyDown} />
              </div>
              <div className="pdv2-lista">
                {produtos.length === 0 ? (
                  <div className="vazio"><p>Nenhum produto</p></div>
                ) : produtos.map((p) => {
                  const sem = Number(p.estoque_atual) <= 0;
                  return (
                    <button key={p.id} className={`lista-item ${sem ? "sem-estoque" : ""}`} disabled={sem} onClick={() => adicionar(p)}>
                      <span className="li-cod">{p.codigo}</span>
                      <span className="li-nome">{p.nome.substring(0, 50)}</span>
                      <span className="li-est">{Number(p.estoque_atual)} un</span>
                      <span className="li-preco">R$ {Number(p.preco_venda).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* MODO LOJA: categorias + cards compactos */}
          {modo === "loja" && (
            <>
              <div className="pdv2-cats">
                <button className={`cat-btn ${!catAtiva ? "ativo" : ""}`} onClick={() => setCatAtiva(null)}>Todos</button>
                {categorias.map((c) => (
                  <button key={c.id} className={`cat-btn ${catAtiva == c.id ? "ativo" : ""}`}
                    style={catAtiva == c.id ? { background: c.cor, borderColor: c.cor, color: "#fff" } : { borderColor: c.cor }}
                    onClick={() => setCatAtiva(c.id)}>{c.icone} {c.nome}</button>
                ))}
              </div>
              <div className="pdv2-busca">
                <input ref={buscaRef} placeholder="🔍 Buscar produto (F3)" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <div className="pdv2-produtos">
                {produtos.length === 0 ? (
                  <div className="vazio"><p>Nenhum produto</p></div>
                ) : produtos.map((p) => {
                  const sem = Number(p.estoque_atual) <= 0;
                  return (
                    <button key={p.id} className={`prod-card ${sem ? "sem-estoque" : ""}`} disabled={sem} onClick={() => adicionar(p)}>
                      <span className={`prod-badge ${Number(p.estoque_atual) <= Number(p.estoque_minimo) ? "baixo" : ""}`}>{Number(p.estoque_atual)}</span>
                      <span className="prod-nome">{p.nome.substring(0, 34)}</span>
                      <span className="prod-cod">{p.codigo}</span>
                      <span className="prod-preco">R$ {Number(p.preco_venda).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {Carrinho}
      </div>

      {vendaOk && <div className="venda-toast">✓ Venda #{vendaOk.id} finalizada — R$ {vendaOk.total.toFixed(2)}</div>}
    </div>
  );
}
