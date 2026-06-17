import { useState, useEffect } from "react";
import { api } from "../lib/api";
import {
  getDeviceId, setDeviceId, adicionarVendaLocal, listarPendentes,
  sincronizar, removerSincronizadas, observarConexao,
} from "../lib/offline";

export default function Offline() {
  const [online, setOnline] = useState(navigator.onLine);
  const [deviceId, setDev] = useState(getDeviceId());
  const [dispositivos, setDispositivos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [forcarOffline, setForcarOffline] = useState(false);

  // form de venda offline simulada
  const [item, setItem] = useState({ produto_id: "", quantidade: 1 });
  const [forma, setForma] = useState("DINHEIRO");

  function flash(msg) { setSucesso(msg); setTimeout(() => setSucesso(""), 4000); }
  async function recarregarPendentes() { setPendentes(await listarPendentes()); }

  useEffect(() => observarConexao(setOnline), []);
  useEffect(() => {
    recarregarPendentes();
    api.get("/produtos").then(setProdutos).catch(() => {});
    api.get("/sync/dispositivos").then(setDispositivos).catch(() => {});
  }, []);

  const conectado = online && !forcarOffline;

  async function ativarTerminal() {
    setErro("");
    try {
      const d = await api.post("/sync/ativar-terminal", { nome: "Terminal Web PoC " + new Date().toLocaleTimeString("pt-BR") });
      setDeviceId(d.device_id);
      setDev(d.device_id);
      flash(`Terminal ativado. device_id=${d.device_id.slice(0, 8)}… (chave local guardada uma vez)`);
      api.get("/sync/dispositivos").then(setDispositivos).catch(() => {});
    } catch (e) { setErro(e.message); }
  }

  async function venderOffline(e) {
    e.preventDefault();
    setErro("");
    const p = produtos.find((x) => x.id === Number(item.produto_id));
    if (!p) { setErro("Selecione um produto"); return; }
    const qtd = Number(item.quantidade) || 1;
    const valor = Number(p.preco_venda) * qtd;
    // grava localmente o PREÇO PRATICADO no momento da venda
    await adicionarVendaLocal({
      itens: [{ produto_id: p.id, quantidade: qtd, preco_unitario: Number(p.preco_venda) }],
      pagamentos: [{ forma, valor }],
    });
    flash(`Venda local registrada (offline): ${qtd}× ${p.nome} = R$ ${valor.toFixed(2)}`);
    setItem({ produto_id: "", quantidade: 1 });
    recarregarPendentes();
  }

  async function sincronizarAgora() {
    setErro("");
    if (!deviceId) { setErro("Ative um terminal antes de sincronizar"); return; }
    if (!online) { setErro("Sem conexão — não é possível sincronizar agora"); return; }
    try {
      const r = await sincronizar(api, deviceId);
      await removerSincronizadas();
      recarregarPendentes();
      flash(`Sincronização concluída: ${r.enviados} enviado(s).`);
    } catch (e) { setErro(e.message); }
  }

  const cont = pendentes.filter((p) => p.status === "PENDENTE" || p.status === "ERRO").length;
  const corStatus = (s) => ({ PENDENTE: "#f59e0b", SINCRONIZADA: "#22c55e", ERRO: "#ef4444" }[s] || "#64748b");

  return (
    <>
      <div className="page-header"><h2>📶 PDV Offline (Prova de Conceito)</h2></div>
      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {sucesso && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{sucesso}</div>}

      {/* STATUS */}
      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <small style={{ opacity: 0.7 }}>Conexão</small>
          <div style={{ fontSize: 18, fontWeight: 700, color: conectado ? "#22c55e" : "#ef4444" }}>
            {conectado ? "🟢 Online" : "🔴 Offline"}
          </div>
        </div>
        <div>
          <small style={{ opacity: 0.7 }}>Terminal</small>
          <div style={{ fontFamily: "monospace" }}>{deviceId ? deviceId.slice(0, 18) + "…" : "não ativado"}</div>
        </div>
        <div>
          <small style={{ opacity: 0.7 }}>Pendentes</small>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{cont}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={forcarOffline} onChange={(e) => setForcarOffline(e.target.checked)} />
            Simular offline
          </label>
          {!deviceId && <button className="btn-mini ok" onClick={ativarTerminal}>Ativar terminal</button>}
          <button className="btn-checkout" onClick={sincronizarAgora} disabled={!conectado || cont === 0}>
            ⟳ Sincronizar ({cont})
          </button>
        </div>
      </div>

      {/* VENDA OFFLINE SIMULADA */}
      <form className="card" onSubmit={venderOffline}>
        <h3 className="card-title">Registrar venda local (offline)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8 }}>
          <select value={item.produto_id} onChange={(e) => setItem({ ...item, produto_id: e.target.value })}>
            <option value="">Produto</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>[{p.codigo}] {p.nome} — R$ {Number(p.preco_venda).toFixed(2)}</option>)}
          </select>
          <input type="number" min="1" value={item.quantidade} onChange={(e) => setItem({ ...item, quantidade: e.target.value })} placeholder="Qtd" />
          <select value={forma} onChange={(e) => setForma(e.target.value)}>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="CARTAO_CREDITO">Crédito</option>
            <option value="CARTAO_DEBITO">Débito</option>
          </select>
          <button className="btn-mini ok" type="submit">+ Vender</button>
        </div>
        <small style={{ opacity: 0.7 }}>A venda é gravada no IndexedDB do navegador. Fica pendente até sincronizar.</small>
      </form>

      {/* PENDENTES */}
      <div className="card">
        <h3 className="card-title">Vendas locais</h3>
        <table className="data-table">
          <thead>
            <tr><th>UUID</th><th>Itens</th><th>Total</th><th>Status</th><th>Venda cloud</th></tr>
          </thead>
          <tbody>
            {pendentes.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, opacity: 0.6 }}>Nenhuma venda local</td></tr>
            ) : pendentes.map((r) => {
              const total = (r.payload.pagamentos || []).reduce((a, p) => a + Number(p.valor), 0);
              return (
                <tr key={r.uuid}>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.uuid.slice(0, 14)}…</td>
                  <td>{(r.payload.itens || []).reduce((a, i) => a + Number(i.quantidade), 0)} item(ns)</td>
                  <td>R$ {total.toFixed(2)}</td>
                  <td><span style={{ color: corStatus(r.status), fontWeight: 600 }}>{r.status}</span>{r.divergencia && <div style={{ fontSize: 11, color: "#ef4444" }}>⚠ {r.divergencia}</div>}</td>
                  <td>{r.venda_id ? `#${r.venda_id}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pendentes.some((p) => p.status === "SINCRONIZADA") && (
          <button className="btn-mini" style={{ marginTop: 8 }} onClick={async () => { await removerSincronizadas(); recarregarPendentes(); }}>
            Limpar sincronizadas
          </button>
        )}
      </div>

      {/* TERMINAIS */}
      <div className="card">
        <h3 className="card-title">Terminais ativados (empresa)</h3>
        <table className="data-table">
          <thead><tr><th>Nome</th><th>device_id</th><th>Ativo</th><th>Último sync</th></tr></thead>
          <tbody>
            {dispositivos.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: "center", padding: 16, opacity: 0.6 }}>Nenhum terminal</td></tr>
            ) : dispositivos.map((d) => (
              <tr key={d.id}>
                <td>{d.nome}</td>
                <td style={{ fontFamily: "monospace", fontSize: 11 }}>{d.device_id.slice(0, 18)}…</td>
                <td>{d.ativo ? "Sim" : "Não"}</td>
                <td style={{ fontSize: 12 }}>{d.ultimo_sync ? new Date(d.ultimo_sync).toLocaleString("pt-BR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
