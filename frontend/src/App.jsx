import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3001/api";

function App() {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [formaPagamento, setFormaPagamento] = useState("DINHEIRO");
  const [vendaRealizada, setVendaRealizada] = useState(null);

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
          precoUnitario: produto.preco_venda,
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
        itens: carrinho,
        pagamentos: [{ forma: formaPagamento, valor: total }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setVendaRealizada({ ...data, itens: carrinho, subtotal, icms, pis, cofins, total });
      setCarrinho([]);
      setTimeout(() => {
        setVendaRealizada(null);
        setBusca("");
      }, 6000);
    }
  }

  if (vendaRealizada) {
    return (
      <div className="cupom-page">
        <div className="cupom">
          <div className="cupom-header">
            <h2>🏪 CUPOM FISCAL</h2>
            <p>ID: #{vendaRealizada.id}</p>
            <p>{new Date().toLocaleString("pt-BR")}</p>
          </div>

          <table className="cupom-itens">
            <tbody>
              {vendaRealizada.itens.map((item) => (
                <tr key={item.produtoId}>
                  <td className="nome">{item.nome.substring(0, 35)}</td>
                  <td className="qty">{item.quantidade}x</td>
                  <td className="valor">R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cupom-totais">
            <div className="linha">
              <span>Subtotal:</span>
              <span>R$ {vendaRealizada.subtotal.toFixed(2)}</span>
            </div>
            <div className="linha small">
              <span>ICMS (12%):</span>
              <span>R$ {vendaRealizada.icms.toFixed(2)}</span>
            </div>
            <div className="linha small">
              <span>PIS (1.65%):</span>
              <span>R$ {vendaRealizada.pis.toFixed(2)}</span>
            </div>
            <div className="linha small">
              <span>COFINS (7.6%):</span>
              <span>R$ {vendaRealizada.cofins.toFixed(2)}</span>
            </div>
            <div className="linha total">
              <span>TOTAL:</span>
              <span>R$ {vendaRealizada.total.toFixed(2)}</span>
            </div>
            <div className="linha">
              <span>Forma:</span>
              <span>{formaPagamento}</span>
            </div>
          </div>

          <div className="cupom-rodape">
            <p>✓ Venda autenticada</p>
            <p>Obrigado pela compra!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdv-container">
      <header className="pdv-header">
        <div className="header-left">
          <h1>🏪 EasySAC PDV</h1>
          <p>Sistema de Frente de Caixa</p>
        </div>
        <div className="header-right">
          <span>👤 Admin</span>
          <span>📍 Loja 001</span>
          <span>⏰ {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </header>

      <div className="pdv-main">
        {/* AREA DE PRODUTOS */}
        <div className="produtos-area">
          <div className="busca-section">
            <input
              autoFocus
              type="text"
              placeholder="🔍 Digite código de barras ou nome do produto..."
              value={busca}
              onChange={(e) => buscarProdutos(e.target.value)}
              className="busca-input"
            />
          </div>

          <div className="produtos-grid">
            {resultados.length > 0 ? (
              resultados.map((p) => (
                <div
                  key={p.id}
                  className="produto-card"
                  onClick={() => adicionarAoCarrinho(p)}
                >
                  <div className="produto-info">
                    <h4>{p.nome.substring(0, 40)}</h4>
                    <small>Cód: {p.codigo}</small>
                  </div>
                  <div className="produto-preco">
                    <span className="preco">R$ {Number(p.preco_venda).toFixed(2)}</span>
                    <span className="estoque">Est: {p.estoque_atual}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="vazio-message">
                <p>🔍 Digite para buscar produtos...</p>
              </div>
            )}
          </div>
        </div>

        {/* CARRINHO LATERAL */}
        <aside className="carrinho-lateral">
          <div className="carrinho-header">
            <h3>🛒 CARRINHO</h3>
            <span className="item-count">{carrinho.length}</span>
          </div>

          <div className="carrinho-itens">
            {carrinho.length === 0 ? (
              <p className="vazio">Nenhum item</p>
            ) : (
              <table>
                <tbody>
                  {carrinho.map((item) => (
                    <tr key={item.produtoId} className="item-row">
                      <td className="item-nome">
                        <div>{item.nome.substring(0, 25)}</div>
                        <div className="item-preco">R$ {item.precoUnitario.toFixed(2)}</div>
                      </td>
                      <td className="item-qty">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) =>
                            alterarQuantidade(item.produtoId, Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="item-subtotal">
                        R$ {(item.quantidade * item.precoUnitario).toFixed(2)}
                      </td>
                      <td className="item-remove">
                        <button onClick={() => removerItem(item.produtoId)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="carrinho-resumo">
            <div className="resumo-line">
              <span>Subtotal:</span>
              <strong>R$ {subtotal.toFixed(2)}</strong>
            </div>
            <div className="resumo-line imposto">
              <small>ICMS:</small>
              <small>R$ {icms.toFixed(2)}</small>
            </div>
            <div className="resumo-line imposto">
              <small>PIS:</small>
              <small>R$ {pis.toFixed(2)}</small>
            </div>
            <div className="resumo-line imposto">
              <small>COFINS:</small>
              <small>R$ {cofins.toFixed(2)}</small>
            </div>
            <hr />
            <div className="resumo-line total">
              <span>TOTAL:</span>
              <strong>R$ {total.toFixed(2)}</strong>
            </div>
          </div>

          <div className="pagamento-section">
            <label>Forma de Pagamento:</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option>DINHEIRO</option>
              <option>DÉBITO</option>
              <option>CRÉDITO</option>
              <option>PIX</option>
              <option>CREDIÁRIO</option>
            </select>

            <button
              onClick={finalizarVenda}
              disabled={carrinho.length === 0}
              className="btn-finalizar"
            >
              💳 FINALIZAR VENDA
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
