import { useState, useEffect } from "react";
import "./App.css";
import Estoque from "./pages/Estoque";
import Clientes from "./pages/Clientes";
import Relatorios from "./pages/Relatorios";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";

const API_URL = "http://localhost:3001/api";

function App() {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [formaPagamento, setFormaPagamento] = useState("DINHEIRO");
  const [menuAberto, setMenuAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState("pdv");
  const [vendaRealizada, setVendaRealizada] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/clientes`).then((r) => r.json()).then(setClientes).catch(() => {});
  }, [paginaAtual]);

  const subtotal = carrinho.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);
  const icms = subtotal * 0.12;
  const pis = subtotal * 0.0165;
  const cofins = subtotal * 0.076;
  const total = subtotal + icms + pis + cofins;

  async function buscarProdutos(termo) {
    setBusca(termo);
    if (!termo) {
      setResultados([]);
      return;
    }
    const res = await fetch(`${API_URL}/produtos?q=${encodeURIComponent(termo)}`);
    const data = await res.json();
    setResultados(data);
  }

  function adicionarAoCarrinho(produto) {
    setCarrinho((prev) => {
      const existente = prev.find((i) => i.produtoId === produto.id);
      if (existente) {
        return prev.map((i) =>
          i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [
        ...prev,
        {
          produtoId: produto.id,
          nome: produto.nome,
          quantidade: 1,
          precoUnitario: Number(produto.preco_venda),
        },
      ];
    });
    setBusca("");
    setResultados([]);
  }

  function alterarQuantidade(produtoId, quantidade) {
    if (quantidade <= 0) {
      removerItem(produtoId);
      return;
    }
    setCarrinho((prev) =>
      prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade } : i))
    );
  }

  function removerItem(produtoId) {
    setCarrinho((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  async function finalizarVenda() {
    if (carrinho.length === 0) return;
    const res = await fetch(`${API_URL}/vendas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: clienteId ? Number(clienteId) : null,
        itens: carrinho,
        pagamentos: [{ forma: formaPagamento, valor: total }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setVendaRealizada({ ...data, itens: carrinho, subtotal, icms, pis, cofins, total });
      setCarrinho([]);
      setClienteId("");
      setTimeout(() => setVendaRealizada(null), 6000);
    }
  }

  if (vendaRealizada) {
    return (
      <div className="cupom-page">
        <div className="cupom">
          <h2>✓ Venda Finalizada</h2>
          <div className="cupom-numero">#{vendaRealizada.id}</div>
          <table className="cupom-itens">
            <tbody>
              {vendaRealizada.itens.map((item) => (
                <tr key={item.produtoId}>
                  <td>{item.nome.substring(0, 40)}</td>
                  <td>{item.quantidade}x</td>
                  <td>R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cupom-totais">
            <div>Subtotal: R$ {vendaRealizada.subtotal.toFixed(2)}</div>
            <div className="small">ICMS: R$ {vendaRealizada.icms.toFixed(2)}</div>
            <div className="small">PIS: R$ {vendaRealizada.pis.toFixed(2)}</div>
            <div className="small">COFINS: R$ {vendaRealizada.cofins.toFixed(2)}</div>
            <div className="total">TOTAL: R$ {vendaRealizada.total.toFixed(2)}</div>
          </div>
        </div>
      </div>
    );
  }

  const menu = [
    { id: "pdv", icon: "🛒", label: "PDV" },
    { id: "produtos", icon: "🏷️", label: "Produtos" },
    { id: "estoque", icon: "📦", label: "Estoque" },
    { id: "vendas", icon: "📊", label: "Vendas" },
    { id: "clientes", icon: "👥", label: "Clientes" },
    { id: "relatorios", icon: "📈", label: "Relatórios" },
  ];

  function irPara(id) {
    setPaginaAtual(id);
    setMenuAberto(false);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>💳 SnapPay</h1>
          <p>Seu PDV na Nuvem</p>
        </div>
        <div className="header-info">
          <span>👤 Admin</span>
          <span>📍 Loja 001</span>
          <span>🟢 Online</span>
        </div>
      </header>

      <div className="main-layout">
        <aside className={`sidebar ${menuAberto ? "aberto" : ""}`}>
          <nav className="menu">
            {menu.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className={`menu-item ${paginaAtual === m.id ? "ativo" : ""}`}
                onClick={(e) => { e.preventDefault(); irPara(m.id); }}
              >
                <span className="icon">{m.icon}</span>
                <span>{m.label}</span>
              </a>
            ))}
            <hr className="menu-divisor" />
            <a href="#config" className="menu-item">
              <span className="icon">⚙️</span>
              <span>Configurações</span>
            </a>
            <a href="#sair" className="menu-item sair">
              <span className="icon">🚪</span>
              <span>Sair</span>
            </a>
          </nav>
        </aside>

        <main className="content">
          {paginaAtual === "produtos" && <Produtos apiUrl={API_URL} />}
          {paginaAtual === "estoque" && <Estoque apiUrl={API_URL} />}
          {paginaAtual === "vendas" && <Vendas apiUrl={API_URL} />}
          {paginaAtual === "clientes" && <Clientes apiUrl={API_URL} />}
          {paginaAtual === "relatorios" && <Relatorios apiUrl={API_URL} />}

          {paginaAtual === "pdv" && (
            <>
              <div className="page-header">
                <h2>Ponto de Venda</h2>
                <div className="busca-container">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Busque produtos, código de barras..."
                    value={busca}
                    onChange={(e) => buscarProdutos(e.target.value)}
                    className="busca-input"
                  />
                  <span className="search-icon">🔍</span>
                </div>
              </div>

              <div className="pdv-grid">
                <div className="produtos-section">
                  <div className="produtos-container">
                    {resultados.length > 0 ? (
                      <div className="produtos-grid">
                        {resultados.map((p) => (
                          <div key={p.id} className="produto-card" onClick={() => adicionarAoCarrinho(p)}>
                            <div className="produto-header">
                              <span className="badge">{Number(p.estoque_atual)}</span>
                            </div>
                            <div className="produto-info">
                              <h4>{p.nome.substring(0, 45)}</h4>
                              <small>Cód: {p.codigo}</small>
                            </div>
                            <div className="produto-preco">
                              <span>R$ {Number(p.preco_venda).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="vazio">
                        <div className="vazio-icon">🔍</div>
                        <p>Digite o código ou nome do produto</p>
                        <small>Comece digitando para ver produtos disponíveis</small>
                      </div>
                    )}
                  </div>
                </div>

                <aside className="carrinho-sidebar">
                  <div className="carrinho-header">
                    <h3>🛒 Carrinho</h3>
                    <span className="badge-count">{carrinho.length}</span>
                  </div>

                  <div className="carrinho-items">
                    {carrinho.length === 0 ? (
                      <div className="carrinho-vazio">
                        <div className="icon">🛍️</div>
                        <p>Nenhum item</p>
                      </div>
                    ) : (
                      <table>
                        <tbody>
                          {carrinho.map((item) => (
                            <tr key={item.produtoId}>
                              <td className="nome">
                                <div>{item.nome.substring(0, 20)}</div>
                                <div className="preco-item">R$ {item.precoUnitario.toFixed(2)}</div>
                              </td>
                              <td className="qty">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantidade}
                                  onChange={(e) => alterarQuantidade(item.produtoId, Number(e.target.value))}
                                />
                              </td>
                              <td className="subtotal">R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</td>
                              <td className="remove">
                                <button onClick={() => removerItem(item.produtoId)}>✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="carrinho-footer">
                    <div className="resumo">
                      <div className="linha">
                        <span>Subtotal</span>
                        <strong>R$ {subtotal.toFixed(2)}</strong>
                      </div>
                      <div className="linha tax">
                        <small>ICMS (12%)</small>
                        <small>R$ {icms.toFixed(2)}</small>
                      </div>
                      <div className="linha tax">
                        <small>PIS (1.65%)</small>
                        <small>R$ {pis.toFixed(2)}</small>
                      </div>
                      <div className="linha tax">
                        <small>COFINS (7.6%)</small>
                        <small>R$ {cofins.toFixed(2)}</small>
                      </div>
                      <hr />
                      <div className="linha total">
                        <span>TOTAL</span>
                        <strong>R$ {total.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="pagamento">
                      <label>Cliente:</label>
                      <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                        <option value="">Consumidor final</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>

                      <label>Pagamento:</label>
                      <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                        <option value="DINHEIRO">💵 DINHEIRO</option>
                        <option value="DEBITO">🏧 DÉBITO</option>
                        <option value="CREDITO">💳 CRÉDITO</option>
                        <option value="PIX">📱 PIX</option>
                        <option value="CREDIARIO">📋 CREDIÁRIO</option>
                      </select>

                      <button onClick={finalizarVenda} disabled={carrinho.length === 0} className="btn-checkout">
                        ✓ FINALIZAR
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>

      <button className="menu-toggle" onClick={() => setMenuAberto(!menuAberto)}>
        ☰
      </button>
    </div>
  );
}

export default App;
