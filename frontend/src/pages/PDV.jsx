import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ClienteModal } from "../components/ClienteModal";
import { DescontoModal } from "../components/DescontoModal";
import { PagamentoModal } from "../components/PagamentoModal";
import { CaixaRapido } from "../components/CaixaRapido";
import { ComprovanteVenda } from "../components/ComprovanteVenda";
import {
  observarConexao, adicionarVendaLocal, listarPendentes,
  sincronizar, removerSincronizadas, getDeviceId,
} from "../lib/offline";

const MODOS = [
  { id: "mercado", label: "Mercado", icon: "🏪" },
  { id: "loja", label: "Loja", icon: "🛍️" },
];

export default function PDV() {
  const { usuario, can } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catAtiva, setCatAtiva] = useState(null);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [desconto, setDesconto] = useState({ tipo: "valor", valor: 0, final: 0 });
  const [pagamentos, setPagamentos] = useState([]);
  const [caixa, setCaixa] = useState(null);
  const [vendaAtual, setVendaAtual] = useState(null);
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState(() => localStorage.getItem("snappay_pdv_modo") || "mercado");
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Offline First (transparente para o operador)
  const [online, setOnline] = useState(navigator.onLine);
  const [pendentesCount, setPendentesCount] = useState(0);
  const [syncErro, setSyncErro] = useState(false);
  const [aviso, setAviso] = useState("");

  // Modais
  const [modalCliente, setModalCliente] = useState(false);
  const [modalDesconto, setModalDesconto] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalCaixa, setModalCaixa] = useState(false);
  const [modalComprovante, setModalComprovante] = useState(false);

  const buscaRef = useRef(null);

  useEffect(() => { localStorage.setItem("snappay_pdv_modo", modo); }, [modo]);

  // Carregar dados iniciais
  useEffect(() => {
    api.get("/categorias").then(setCategorias).catch(() => {});
    api.get("/clientes").then(setClientes).catch(() => {});
    carregarCaixa();
  }, []);

  // Carregar produtos quando busca ou categoria muda
  const carregarProdutos = useCallback(async () => {
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (catAtiva) params.set("categoria", catAtiva);
    try {
      setProdutos(await api.get(`/produtos?${params.toString()}`));
    } catch (err) {
      setErro("Erro ao carregar produtos");
    }
  }, [busca, catAtiva]);

  useEffect(() => { const t = setTimeout(carregarProdutos, 200); return () => clearTimeout(t); }, [carregarProdutos]);

  async function carregarCaixa() {
    try {
      const c = await api.get("/caixa/atual");
      setCaixa(c);
    } catch (err) {
      // offline: mantém último status conhecido do caixa
    }
  }

  // ---- Offline First (background) ----
  async function atualizarPendentes() {
    const pend = (await listarPendentes()).filter((p) => p.status === "PENDENTE" || p.status === "ERRO");
    setPendentesCount(pend.length);
    return pend.length;
  }

  // Sincroniza pendentes em background (sem expor detalhes técnicos).
  async function sincronizarBackground() {
    const dev = getDeviceId();
    const qtd = await atualizarPendentes();
    if (!dev || qtd === 0) { setSyncErro(qtd > 0 && !dev); return; }
    try {
      await sincronizar(api, dev);
      await removerSincronizadas();
      const restantes = await atualizarPendentes();
      setSyncErro(restantes > 0);
      if (restantes === 0) { carregarCaixa(); carregarProdutos(); }
    } catch {
      setSyncErro(true);
    }
  }

  // Observa conexão e dispara sync ao voltar online.
  useEffect(() => observarConexao(setOnline), []);
  useEffect(() => {
    atualizarPendentes();
    if (online) sincronizarBackground();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ---- Carrinho ----
  const subtotal = carrinho.reduce((a, i) => a + i.quantidade * i.precoUnitario, 0);
  const total = Math.max(0, subtotal - desconto.final);

  function adicionar(p) {
    setErro("");
    if (!caixa?.aberto) {
      setErro("⚠️ Caixa fechado. Abra com F7 antes de vender.");
      return;
    }

    const estoque = Number(p.estoque_atual);
    const novaQtd = (carrinho.find((i) => i.produtoId === p.id)?.quantidade || 0) + 1;
    if (novaQtd > estoque) {
      setErro(`❌ Estoque insuficiente: ${estoque} un disponível`);
      return;
    }

    setCarrinho((prev) => {
      const ex = prev.find((i) => i.produtoId === p.id);
      if (ex) return prev.map((i) => i.produtoId === p.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, {
        produtoId: p.id,
        nome: p.nome,
        quantidade: 1,
        precoUnitario: Number(p.preco_venda),
        estoque: estoque,
      }];
    });

    // Voltar foco para busca
    setTimeout(() => {
      setBusca("");
      buscaRef.current?.focus();
    }, 0);
  }

  function alterarQtd(id, q) {
    const prod = carrinho.find((i) => i.produtoId === id);
    if (q > prod.estoque) {
      setErro(`❌ Estoque insuficiente: máximo ${prod.estoque} un`);
      return;
    }
    setErro("");
    if (q <= 0) return remover(id);
    setCarrinho((prev) => prev.map((i) => i.produtoId === id ? { ...i, quantidade: q } : i));
  }

  function remover(id) {
    setCarrinho((prev) => prev.filter((i) => i.produtoId !== id));
    setItemSelecionado(null);
    setErro("");
  }

  function limpar() {
    setCarrinho([]);
    setClienteId("");
    setDesconto({ tipo: "valor", valor: 0, final: 0 });
    setPagamentos([]);
    setItemSelecionado(null);
    setErro("");
    buscaRef.current?.focus();
  }

  // Atalhos de teclado
  useEffect(() => {
    function onKey(e) {
      const k = e.key;
      if (["F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"].includes(k)) e.preventDefault();

      if (k === "F2") setModalCliente(true);
      else if (k === "F3") buscaRef.current?.focus();
      else if (k === "F4") setModalDesconto(true);
      else if (k === "F5") {
        if (carrinho.length === 0) setErro("⚠️ Adicione produtos antes de finalizar");
        else setModalPagamento(true);
      }
      else if (k === "F6") {
        if (carrinho.length > 0) remover(carrinho[carrinho.length - 1].produtoId);
      }
      else if (k === "F7" || k === "F8") setModalCaixa(true);
      else if (k === "F9" || k === "F10") setModalCaixa(true);
      else if (k === "Escape") limpar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [carrinho]);

  // Enter na busca: adiciona 1º resultado
  function onBuscaKeyDown(e) {
    if (e.key === "Enter" && produtos.length > 0) {
      adicionar(produtos[0]);
    }
  }

  // Finalizar venda
  async function finalizarVenda(pagsPagamento) {
    if (carrinho.length === 0) {
      setErro("⚠️ Adicione produtos antes de finalizar");
      return;
    }

    if (!caixa?.aberto) {
      setErro("⚠️ Caixa fechado. Abra com F7 antes de vender.");
      return;
    }

    setErro("");
    setModalPagamento(false);

    // OFFLINE: grava a venda localmente (IndexedDB) e segue vendendo.
    if (!online) {
      try {
        await adicionarVendaLocal({
          cliente_id: clienteId ? Number(clienteId) : null,
          itens: carrinho.map((i) => ({
            produto_id: i.produtoId,
            quantidade: i.quantidade,
            preco_unitario: i.precoUnitario,
            desconto: desconto.final / carrinho.length,
          })),
          pagamentos: pagsPagamento,
        });
        // ajusta estoque local p/ manter a venda seguinte consistente
        setProdutos((prev) => prev.map((p) => {
          const it = carrinho.find((c) => c.produtoId === p.id);
          return it ? { ...p, estoque_atual: Number(p.estoque_atual) - it.quantidade } : p;
        }));
        setAviso("✓ Venda registrada. Será sincronizada automaticamente quando a internet voltar.");
        setTimeout(() => setAviso(""), 4000);
        limpar();
        atualizarPendentes();
      } catch (err) {
        setErro(`❌ Não foi possível registrar a venda offline: ${err.message}`);
      }
      return;
    }

    // ONLINE: fluxo normal pelo backend.
    try {
      const venda = await api.post("/vendas", {
        clienteId: clienteId ? Number(clienteId) : null,
        itens: carrinho.map((i) => ({
          produtoId: i.produtoId,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario,
          desconto: desconto.final / carrinho.length, // distribuir desconto
        })),
        pagamentos: pagsPagamento,
      });

      // Buscar dados completos da venda
      const vendaCompleta = await api.get(`/vendas/${venda.id}`);
      setVendaAtual(vendaCompleta);
      setModalComprovante(true);
      limpar();
      carregarCaixa();
    } catch (err) {
      setErro(`❌ ${err.message}`);
    }
  }

  async function cancelarVenda() {
    if (!confirm("Cancelar venda atual? (Limpar carrinho)")) return;
    if (confirm("Tem certeza? Esta ação não pode ser desfeita.")) {
      limpar();
    }
  }

  // ---- Componentes compartilhados ----
  const ClienteNome = clientes.find((c) => c.id == clienteId)?.nome || "Consumidor final";

  const Carrinho = (
    <aside className="pdv2-cart">
      <div className="cart-head">
        <h3>🛒 Carrinho</h3>
        <span className="cart-count">{carrinho.length}</span>
      </div>

      <div className="cart-cliente" onClick={() => setModalCliente(true)} style={{ cursor: "pointer" }}>
        <div className="cliente-badge">
          <span>👤 {ClienteNome}</span>
          <small>F2</small>
        </div>
      </div>

      <div className="cart-itens">
        {carrinho.length === 0 ? (
          <div className="cart-vazio">Nenhum item</div>
        ) : carrinho.map((i) => (
          <div
            key={i.produtoId}
            className={`cart-item ${itemSelecionado === i.produtoId ? "selecionado" : ""}`}
            onClick={() => setItemSelecionado(i.produtoId)}
          >
            <div className="ci-nome">
              {i.nome.substring(0, 20)}
              <small>R$ {i.precoUnitario.toFixed(2)}</small>
            </div>
            <input
              className="ci-qtd"
              type="number"
              min="1"
              value={i.quantidade}
              onChange={(e) => alterarQtd(i.produtoId, Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="ci-sub">R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</div>
            <button
              className="ci-x"
              onClick={() => remover(i.produtoId)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {erro && <div className="cart-erro">⚠️ {erro}</div>}

      <div className="cart-resumo">
        <div className="cart-linha">
          <span>Subtotal:</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </div>
        {desconto.final > 0 && (
          <div className="cart-linha desconto">
            <span>Desconto:</span>
            <span>-R$ {desconto.final.toFixed(2)}</span>
          </div>
        )}
        <div className="cart-total">
          <span>TOTAL</span>
          <strong>R$ {total.toFixed(2)}</strong>
        </div>
      </div>

      <div className="cart-acoes">
        <button
          className="btn-mini"
          onClick={() => setModalDesconto(true)}
          title="Desconto (F4)"
        >
          🏷️ Desconto
        </button>
        <button
          className="btn-checkout"
          onClick={() => carrinho.length > 0 ? setModalPagamento(true) : setErro("Adicione produtos")}
          disabled={carrinho.length === 0}
          title="Finalizar venda (F5)"
        >
          ✓ FINALIZAR <kbd>F5</kbd>
        </button>
        {carrinho.length > 0 && (
          <button
            className="btn-mini danger"
            onClick={cancelarVenda}
            title="Cancelar venda"
          >
            ✕ Cancelar
          </button>
        )}
      </div>

      <div className="cart-footer">
        <small>F2: Cliente | F3: Busca | F4: Desconto | F5: Finalizar</small>
        <small>F6: Remove item | F7/F8: Caixa | F9/F10: Sangria/Suprimento</small>
      </div>
    </aside>
  );

  return (
    <div className="pdv2">
      {!online && (
        <div className="pdv2-aviso offline">
          📴 Offline — vendas serão sincronizadas automaticamente
          {pendentesCount > 0 && <span> · {pendentesCount} venda(s) pendente(s)</span>}
        </div>
      )}
      {online && syncErro && (
        <div className="pdv2-aviso erro">
          ⚠️ Existem vendas pendentes de sincronização. Chame o administrador.
        </div>
      )}
      {online && !syncErro && pendentesCount > 0 && (
        <div className="pdv2-aviso pend">⟳ Sincronizando {pendentesCount} venda(s)…</div>
      )}
      {aviso && <div className="pdv2-aviso ok">{aviso}</div>}

      <div className="pdv2-header">
        <div className="pdv2-modos">
          {MODOS.map((m) => (
            <button
              key={m.id}
              className={`modo-btn ${modo === m.id ? "ativo" : ""}`}
              onClick={() => setModo(m.id)}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        <div className="pdv2-status">
          {caixa?.aberto ? (
            <span className="status-ok">🟢 Caixa aberto | R$ {Number(caixa.saldo).toFixed(2)}</span>
          ) : (
            <span
              className="status-erro"
              onClick={() => setModalCaixa(true)}
              style={{ cursor: "pointer" }}
            >
              🔴 Caixa fechado (F7 para abrir)
            </span>
          )}
        </div>
      </div>

      <div className={`pdv2-grid ${modo === "mercado" ? "modo-mercado" : "modo-loja"}`}>
        <div className="pdv2-center">
          {/* MODO MERCADO */}
          {modo === "mercado" && (
            <>
              <div className="pdv2-busca grande">
                <input
                  ref={buscaRef}
                  autoFocus
                  placeholder="🔍 Código de barras ou nome — Enter adiciona (F3)"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={onBuscaKeyDown}
                />
              </div>
              <div className="pdv2-lista">
                {produtos.length === 0 ? (
                  <div className="vazio"><p>Nenhum produto</p></div>
                ) : produtos.map((p) => {
                  const sem = Number(p.estoque_atual) <= 0;
                  const baixo = Number(p.estoque_atual) <= Number(p.estoque_minimo);
                  return (
                    <button
                      key={p.id}
                      className={`lista-item ${sem ? "sem-estoque" : ""} ${baixo ? "baixo-estoque" : ""}`}
                      disabled={sem}
                      onClick={() => adicionar(p)}
                    >
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

          {/* MODO LOJA */}
          {modo === "loja" && (
            <>
              <div className="pdv2-cats">
                <button
                  className={`cat-btn ${!catAtiva ? "ativo" : ""}`}
                  onClick={() => setCatAtiva(null)}
                >
                  Todos
                </button>
                {categorias.map((c) => (
                  <button
                    key={c.id}
                    className={`cat-btn ${catAtiva == c.id ? "ativo" : ""}`}
                    style={
                      catAtiva == c.id
                        ? { background: c.cor, borderColor: c.cor, color: "#fff" }
                        : { borderColor: c.cor }
                    }
                    onClick={() => setCatAtiva(c.id)}
                  >
                    {c.icone} {c.nome}
                  </button>
                ))}
              </div>
              <div className="pdv2-busca">
                <input
                  ref={buscaRef}
                  placeholder="🔍 Buscar produto (F3)"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="pdv2-produtos">
                {produtos.length === 0 ? (
                  <div className="vazio"><p>Nenhum produto</p></div>
                ) : produtos.map((p) => {
                  const sem = Number(p.estoque_atual) <= 0;
                  const baixo = Number(p.estoque_atual) <= Number(p.estoque_minimo);
                  return (
                    <button
                      key={p.id}
                      className={`prod-card ${sem ? "sem-estoque" : ""} ${baixo ? "baixo-estoque" : ""}`}
                      disabled={sem}
                      onClick={() => adicionar(p)}
                    >
                      <span className={`prod-badge ${baixo ? "baixo" : ""}`}>
                        {Number(p.estoque_atual)}
                      </span>
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

      {/* Modais */}
      {modalCliente && (
        <ClienteModal
          clientes={clientes}
          clienteId={clienteId}
          onSelect={setClienteId}
          onClose={() => setModalCliente(false)}
        />
      )}

      {modalDesconto && (
        <DescontoModal
          subtotal={subtotal}
          desconto={desconto}
          onApply={(d) => setDesconto({ ...d })}
          onClose={() => setModalDesconto(false)}
        />
      )}

      {modalPagamento && (
        <PagamentoModal
          total={total}
          pagamentos={pagamentos}
          onApply={finalizarVenda}
          onClose={() => setModalPagamento(false)}
        />
      )}

      {modalCaixa && (
        <CaixaRapido
          caixa={caixa}
          onClose={() => setModalCaixa(false)}
          onRefresh={carregarCaixa}
        />
      )}

      {modalComprovante && vendaAtual && (
        <ComprovanteVenda
          venda={vendaAtual.venda}
          itens={vendaAtual.itens}
          pagamentos={vendaAtual.pagamentos}
          cliente={ClienteNome}
          onNova={() => {
            setModalComprovante(false);
            setVendaAtual(null);
            buscaRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
