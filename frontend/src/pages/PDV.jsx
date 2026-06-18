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

// Layout do PDV é determinado pelo segmento configurado em Configurações → Tipo de Operação.
// O operador NÃO escolhe o segmento. Cada layout é independente.
const LAYOUT_POR_SEGMENTO = {
  mercado: "venda",        // foco em velocidade (scanner + teclado)
  conveniencia: "venda",
  farmacia: "venda",
  padaria: "venda",
  loja: "catalogo",        // categorias + cards
  restaurante: "restaurante",
};

const NOME_SEGMENTO = {
  mercado: "Mercado", loja: "Loja", padaria: "Padaria",
  restaurante: "Restaurante", conveniencia: "Conveniência", farmacia: "Farmácia",
};

export default function PDV() {
  const { usuario, can, empresa } = useAuth();
  const segmento = empresa?.segmento || "mercado";
  const layout = LAYOUT_POR_SEGMENTO[segmento] || "venda";

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
  const [itemSelecionado, setItemSelecionado] = useState(null);
  // Preço AUTORITATIVO vindo do backend (POST /precos/preview). Nada de cálculo local.
  const [preview, setPreview] = useState(null);
  const [previewCarregando, setPreviewCarregando] = useState(false);

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
  // Cancelamento protegido (exige autorização de gerente/admin)
  const [modalCancelar, setModalCancelar] = useState(false);
  const [cancelSenha, setCancelSenha] = useState("");
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelErro, setCancelErro] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const buscaRef = useRef(null);
  const vendaKeyRef = useRef(null); // idempotency_key da venda em curso (A2)

  // Carregar dados iniciais
  useEffect(() => {
    api.get("/categorias").then(setCategorias).catch(() => {});
    api.get("/clientes").then(setClientes).catch(() => {});
    carregarCaixa();
  }, []);

  // Carregar produtos.
  // No layout "venda" (mercado) a tela inicia VAZIA: só busca quando há texto digitado
  // ou categoria — nunca exibe o catálogo automaticamente.
  const carregarProdutos = useCallback(async () => {
    if (layout === "venda" && !busca) { setProdutos([]); return; }
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (catAtiva) params.set("categoria", catAtiva);
    try {
      setProdutos(await api.get(`/produtos?${params.toString()}`));
    } catch (err) {
      setErro("Erro ao carregar produtos");
    }
  }, [busca, catAtiva, layout]);

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

  useEffect(() => observarConexao(setOnline), []);
  useEffect(() => {
    atualizarPendentes();
    if (online) sincronizarBackground();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ---- Preço autoritativo (preview do backend) ----
  // Recalcula no servidor a cada mudança de carrinho/cliente. Offline: usa o
  // preço local do produto apenas como fallback (a venda offline já grava o
  // preço praticado e o backend reconcilia ao sincronizar).
  const recalcularPreview = useCallback(async () => {
    if (carrinho.length === 0) { setPreview(null); return; }
    if (!online) { setPreview(null); return; }
    setPreviewCarregando(true);
    try {
      const r = await api.post("/precos/preview", {
        cliente_id: clienteId ? Number(clienteId) : null,
        itens: carrinho.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade })),
      });
      const porProduto = {};
      r.itens.forEach((it) => { porProduto[it.produto_id] = it; });
      setPreview({ ...r, porProduto });
    } catch {
      setPreview(null); // fallback local
    } finally {
      setPreviewCarregando(false);
    }
  }, [carrinho, clienteId, online]);

  useEffect(() => { const t = setTimeout(recalcularPreview, 150); return () => clearTimeout(t); }, [recalcularPreview]);

  // Helpers de exibição: SEMPRE preferem o valor autoritativo do preview.
  const precoItem = (i) => preview?.porProduto?.[i.produtoId]?.preco_final ?? i.precoUnitario;
  const totalItem = (i) => preview?.porProduto?.[i.produtoId]?.valor_total ?? (i.quantidade * i.precoUnitario);
  const infoItem = (i) => preview?.porProduto?.[i.produtoId] || null;

  // ---- Carrinho (venda em andamento) ----
  const subtotalLocal = carrinho.reduce((a, i) => a + i.quantidade * i.precoUnitario, 0);
  const subtotal = preview ? preview.subtotal : subtotalLocal;
  const descontoPromo = preview ? preview.desconto_total : 0;
  // total = total autoritativo (base/tabela/promoção) menos o desconto manual do operador
  const total = Math.max(0, (preview ? preview.total : subtotalLocal) - desconto.final);

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

    // Scanner flow: limpa busca e devolve o foco para o campo de busca.
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
    vendaKeyRef.current = null; // próxima venda recebe nova idempotency_key
    buscaRef.current?.focus();
  }

  const algumModalAberto = modalCliente || modalDesconto || modalPagamento || modalCaixa || modalComprovante || modalCancelar;

  function fecharModais() {
    setModalCliente(false); setModalDesconto(false); setModalPagamento(false);
    setModalCaixa(false); setModalCancelar(false);
    // comprovante fecha pelo próprio botão "Nova venda"
  }

  // Atalhos de teclado — operação completa sem mouse
  useEffect(() => {
    function onKey(e) {
      const k = e.key;
      if (["F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F12"].includes(k)) e.preventDefault();

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
      // Cancelamento de venda em andamento é AÇÃO PROTEGIDA: abre modal (senha gerente).
      else if (k === "F12") { if (carrinho.length > 0) abrirCancelamento(); }
      else if (k === "Escape") {
        // ESC NUNCA cancela a venda. Só fecha modal / limpa busca / desfaz seleção.
        if (algumModalAberto) fecharModais();
        else if (busca) setBusca("");
        else if (itemSelecionado) setItemSelecionado(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [carrinho, busca, itemSelecionado, algumModalAberto]);

  // Enter na busca: adiciona 1º resultado (fluxo scanner)
  function onBuscaKeyDown(e) {
    if (e.key === "Enter" && produtos.length > 0) {
      adicionar(produtos[0]);
    }
  }

  // Finalizar venda
  async function finalizarVenda(pagsPagamento) {
    if (carrinho.length === 0) { setErro("⚠️ Adicione produtos antes de finalizar"); return; }
    if (!caixa?.aberto) { setErro("⚠️ Caixa fechado. Abra com F7 antes de vender."); return; }

    setErro("");
    setModalPagamento(false);

    if (!online) {
      try {
        await adicionarVendaLocal({
          cliente_id: clienteId ? Number(clienteId) : null,
          itens: carrinho.map((i) => ({
            produto_id: i.produtoId,
            quantidade: i.quantidade,
            preco_unitario: Number(precoItem(i)),
            desconto: desconto.final / carrinho.length,
          })),
          pagamentos: pagsPagamento,
        });
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

    // Preço autoritativo: envia os preços do PREVIEW e o total previsto. O backend
    // recalcula e, se divergir, pede confirmação (reconciliação).
    // A2 — idempotência: mesma chave para o disparo e eventual reenvio (confirmação).
    const idemKey = vendaKeyRef.current || (vendaKeyRef.current = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`));
    async function enviarVenda(confirmarAjuste) {
      return api.post("/vendas", {
        clienteId: clienteId ? Number(clienteId) : null,
        itens: carrinho.map((i) => ({
          produtoId: i.produtoId,
          quantidade: i.quantidade,
          precoUnitario: Number(precoItem(i)),
          desconto: desconto.final / carrinho.length, // desconto MANUAL distribuído (promo é do servidor)
        })),
        pagamentos: pagsPagamento,
        total_esperado: total,
        confirmar_ajuste: confirmarAjuste === true,
        idempotency_key: idemKey,
      });
    }

    try {
      let venda;
      try {
        venda = await enviarVenda(false);
      } catch (err) {
        // Divergência preview×fechamento: confirma o total correto com o operador.
        if (err.status === 409 && err.data?.requer_confirmacao) {
          const ok = confirm(`⚠️ O preço foi recalculado pelo sistema.\n\nTotal correto: R$ ${Number(err.data.total_correto).toFixed(2)}\n(previsto: R$ ${Number(err.data.total_previsto).toFixed(2)})\n\nConfirmar a venda pelo valor correto?`);
          if (!ok) { setModalPagamento(true); return; }
          venda = await enviarVenda(true);
        } else {
          throw err;
        }
      }

      const vendaCompleta = await api.get(`/vendas/${venda.id}`);
      setVendaAtual(vendaCompleta);
      setModalComprovante(true);
      setAviso(`✅ Venda #${venda.id} finalizada com sucesso!`);
      setTimeout(() => setAviso(""), 3000);
      limpar();
      carregarCaixa();
    } catch (err) {
      setErro(`❌ ${err.message}`);
    }
  }

  // Abre o modal protegido de cancelamento da venda em andamento.
  function abrirCancelamento() {
    if (carrinho.length === 0) return;
    setCancelSenha(""); setCancelMotivo(""); setCancelErro("");
    setModalCancelar(true);
  }

  // Cancelamento da venda EM ANDAMENTO exige autorização de gerente/admin + motivo.
  async function confirmarCancelamento() {
    setCancelErro("");
    if (!cancelMotivo.trim()) { setCancelErro("Informe o motivo do cancelamento."); return; }
    if (!cancelSenha) { setCancelErro("Senha do gerente/administrador é obrigatória."); return; }
    setCancelLoading(true);
    try {
      await api.post("/auth/autorizar-operacao", {
        operacao: "CANCELAR_VENDA",
        senha: cancelSenha,
        motivo: cancelMotivo,
      });
      setModalCancelar(false);
      limpar();
      setAviso("Venda cancelada com autorização do gerente.");
      setTimeout(() => setAviso(""), 3000);
    } catch (err) {
      // Sem autorização válida: orienta a chamar o gerente.
      setCancelErro(err.status === 403
        ? "Chame o gerente para autorizar o cancelamento."
        : (err.message || "Falha na autorização"));
    } finally {
      setCancelLoading(false);
    }
  }

  const ClienteNome = clientes.find((c) => c.id == clienteId)?.nome || "Consumidor final";

  // ===================== ÁREA DE VENDA (cliente acompanha) =====================
  // Lista grande dos itens da venda em andamento — fonte grande, voltada ao cliente.
  const ListaVenda = (
    <div className="venda-lista">
      {carrinho.length === 0 ? (
        <div className="venda-vazia">
          <p>Aguardando leitura de produto…</p>
        </div>
      ) : (
        <>
          <div className="venda-linha venda-cabecalho">
            <span className="vl-qtd">QTD</span>
            <span className="vl-nome">PRODUTO</span>
            <span className="vl-unit">UNITÁRIO</span>
            <span className="vl-total">TOTAL</span>
            <span className="vl-x"></span>
          </div>
          {carrinho.map((i) => {
            const info = infoItem(i);
            const temPromo = info?.promocao_id != null;
            const temAtacado = info?.tabela_tipo === "ATACADO";
            const temTabela = info?.tabela_preco_id != null && !temAtacado && info?.preco_final !== info?.preco_base;
            return (
              <div
                key={i.produtoId}
                className={`venda-linha ${itemSelecionado === i.produtoId ? "selecionada" : ""}`}
                onClick={() => setItemSelecionado(i.produtoId)}
              >
                <input
                  className="vl-qtd-input"
                  type="number"
                  min="1"
                  value={i.quantidade}
                  onChange={(e) => alterarQtd(i.produtoId, Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  title="Quantidade"
                />
                <span className="vl-nome">
                  {i.nome}
                  {(temAtacado || temTabela || temPromo) && (
                    <span className="vl-selos">
                      {temAtacado && <span className="selo selo-atacado">🏷️ Atacado</span>}
                      {temTabela && <span className="selo selo-atacado">🏷️ Preço especial</span>}
                      {temPromo && <span className="selo selo-promo">🎁 Promoção</span>}
                    </span>
                  )}
                </span>
                <span className="vl-unit">R$ {Number(precoItem(i)).toFixed(2)}</span>
                <span className="vl-total">R$ {Number(totalItem(i)).toFixed(2)}</span>
                <button className="vl-x" onClick={(e) => { e.stopPropagation(); remover(i.produtoId); }} title="Remover">✕</button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  // Painel de totais + pagamento (sempre visível)
  const PainelTotais = (
    <div className="venda-totais">
      <div className="vt-linha">
        <span>Subtotal{previewCarregando ? " ⟳" : ""}</span>
        <span>R$ {subtotal.toFixed(2)}</span>
      </div>
      {descontoPromo > 0 && (
        <div className="vt-linha" style={{ color: "#d97706" }}>
          <span>🎁 Promoção/atacado</span>
          <span>- R$ {descontoPromo.toFixed(2)}</span>
        </div>
      )}
      <div className="vt-linha vt-desc" onClick={() => setModalDesconto(true)} title="Desconto (F4)">
        <span>Desconto manual {desconto.final > 0 ? "" : "(F4)"}</span>
        <span>{desconto.final > 0 ? `- R$ ${desconto.final.toFixed(2)}` : "R$ 0,00"}</span>
      </div>

      {/* Cliente aparece ACIMA do total (não escondido abaixo) */}
      <button className="vt-cliente" onClick={() => setModalCliente(true)} title="Cliente (F2)">
        <span>👤 {ClienteNome}</span>
        <kbd>F2</kbd>
      </button>

      <div className="vt-total">
        <span>TOTAL</span>
        <strong>R$ {total.toFixed(2)}</strong>
      </div>
      {erro && <div className="cart-erro" style={{ margin: "8px 0" }}>⚠️ {erro}</div>}
      <button
        className="btn-checkout vt-finalizar"
        onClick={() => carrinho.length > 0 ? setModalPagamento(true) : setErro("Adicione produtos")}
        disabled={carrinho.length === 0}
        title="Finalizar venda (F5)"
      >
        <span style={{ fontSize: 22 }}>✓</span> FINALIZAR VENDA <kbd>F5</kbd>
      </button>
      {carrinho.length > 0 && (
        <div className="vt-cancel-hint">🔒 Cancelar venda exige autorização do gerente <kbd>F12</kbd></div>
      )}
    </div>
  );

  // Campo de busca + resultados (dropdown que só aparece com texto)
  const BuscaVenda = (
    <div className="venda-busca">
      <input
        ref={buscaRef}
        autoFocus
        placeholder="🔍 Passe o código de barras ou pesquise um produto — Enter adiciona"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={onBuscaKeyDown}
      />
      {busca && (
        <div className="venda-resultados">
          {produtos.length === 0 ? (
            <div className="vr-vazio">Nenhum produto encontrado para “{busca}”</div>
          ) : produtos.slice(0, 8).map((p) => {
            const sem = Number(p.estoque_atual) <= 0;
            return (
              <button
                key={p.id}
                className={`vr-item ${sem ? "sem-estoque" : ""}`}
                disabled={sem}
                onClick={() => adicionar(p)}
              >
                <span className="vr-cod">{p.codigo}</span>
                <span className="vr-nome">{p.nome}</span>
                <span className="vr-est">{Number(p.estoque_atual)} un</span>
                <span className="vr-preco">R$ {Number(p.preco_venda).toFixed(2)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
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
        <div className="pdv2-segmento">
          <span className="seg-badge">{NOME_SEGMENTO[segmento] || "Mercado"}</span>
        </div>
        <div className="pdv2-status">
          {caixa?.aberto ? (
            <span className="status-ok">🟢 Caixa aberto{caixa.unidade ? ` · 🏬 ${caixa.unidade.nome}` : ""} | R$ {Number(caixa.saldo).toFixed(2)}</span>
          ) : (
            <span className="status-erro" onClick={() => setModalCaixa(true)} style={{ cursor: "pointer" }}>
              🔴 Caixa fechado (F7 para abrir)
            </span>
          )}
        </div>
      </div>

      {/* ===================== LAYOUT VENDA (Mercado / Conveniência / Farmácia / Padaria) ===================== */}
      {layout === "venda" && (
        <div className="pdv-venda">
          <div className="pdv-venda-main">
            {BuscaVenda}
            {ListaVenda}
          </div>
          <aside className="pdv-venda-side">
            {PainelTotais}
            <div className="cart-footer">
              <small>F2: Cliente | F3: Busca | F4: Desconto | F5: Finalizar</small>
              <small>F6: Remove item | F7/F8: Caixa | F9/F10: Sangria/Suprimento</small>
            </div>
          </aside>
        </div>
      )}

      {/* ===================== LAYOUT CATÁLOGO (Loja) ===================== */}
      {layout === "catalogo" && (
        <div className="pdv2-grid modo-loja">
          <div className="pdv2-center">
            <div className="pdv2-cats">
              <button className={`cat-btn ${!catAtiva ? "ativo" : ""}`} onClick={() => setCatAtiva(null)}>Todos</button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  className={`cat-btn ${catAtiva == c.id ? "ativo" : ""}`}
                  style={catAtiva == c.id ? { background: c.cor, borderColor: c.cor, color: "#fff" } : { borderColor: c.cor }}
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
                <div className="vazio"><p>Selecione uma categoria ou busque um produto</p></div>
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
                    <span className={`prod-badge ${baixo ? "baixo" : ""}`}>{Number(p.estoque_atual)}</span>
                    <span className="prod-nome">{p.nome.substring(0, 34)}</span>
                    <span className="prod-cod">{p.codigo}</span>
                    <span className="prod-preco">R$ {Number(p.preco_venda).toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <aside className="pdv-venda-side">
            {ListaVenda}
            {PainelTotais}
          </aside>
        </div>
      )}

      {/* ===================== LAYOUT RESTAURANTE (estrutura independente) ===================== */}
      {layout === "restaurante" && (
        <div className="pdv-restaurante">
          <div className="resto-tabs">
            <button className="resto-tab ativo">🍽️ Mesas</button>
            <button className="resto-tab">🧾 Comandas</button>
            <button className="resto-tab">🍹 Balcão</button>
            <button className="resto-tab">🛵 Delivery</button>
          </div>
          <div className="resto-mesas">
            {Array.from({ length: 12 }).map((_, idx) => (
              <button key={idx} className="resto-mesa livre">
                <span className="rm-num">Mesa {idx + 1}</span>
                <span className="rm-status">Livre</span>
              </button>
            ))}
          </div>
          <div className="resto-info">
            Estrutura de restaurante (mesas, comandas, balcão e delivery) — independente do layout de mercado.
          </div>
        </div>
      )}

      {/* Modais */}
      {modalCliente && (
        <ClienteModal clientes={clientes} clienteId={clienteId} onSelect={setClienteId} onClose={() => setModalCliente(false)} />
      )}
      {modalDesconto && (
        <DescontoModal subtotal={subtotal} desconto={desconto} onApply={(d) => setDesconto({ ...d })} onClose={() => setModalDesconto(false)} />
      )}
      {modalPagamento && (
        <PagamentoModal total={total} pagamentos={pagamentos} onApply={finalizarVenda} onClose={() => setModalPagamento(false)} />
      )}
      {modalCaixa && (
        <CaixaRapido caixa={caixa} onClose={() => setModalCaixa(false)} onRefresh={carregarCaixa} />
      )}
      {modalComprovante && vendaAtual && (
        <ComprovanteVenda
          venda={vendaAtual.venda}
          itens={vendaAtual.itens}
          pagamentos={vendaAtual.pagamentos}
          cliente={ClienteNome}
          onNova={() => { setModalComprovante(false); setVendaAtual(null); buscaRef.current?.focus(); }}
        />
      )}

      {/* Cancelamento PROTEGIDO da venda em andamento (exige gerente/admin) */}
      {modalCancelar && (
        <div className="modal-overlay" onClick={() => setModalCancelar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>🔒 Cancelar venda atual</h3>
            <div style={{ background: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              Isto irá cancelar TODOS os itens da venda atual. Requer autorização de gerente/administrador.
            </div>
            <div className="form-group">
              <label>Motivo do cancelamento *</label>
              <input type="text" value={cancelMotivo} autoFocus
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ex: cliente desistiu, item errado…" />
            </div>
            <div className="form-group">
              <label>Senha do gerente/administrador *</label>
              <input type="password" value={cancelSenha}
                onChange={(e) => setCancelSenha(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmarCancelamento(); }}
                placeholder="Senha de quem autoriza" />
            </div>
            {cancelErro && <div className="cart-erro">⚠️ {cancelErro}</div>}
            <div className="modal-footer">
              <button className="btn-mini" onClick={() => setModalCancelar(false)}>Voltar</button>
              <button className="btn-checkout" style={{ background: "#dc2626" }} disabled={cancelLoading} onClick={confirmarCancelamento}>
                {cancelLoading ? "Autorizando…" : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
