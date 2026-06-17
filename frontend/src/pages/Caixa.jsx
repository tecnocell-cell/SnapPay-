import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Caixa() {
  const [estado, setEstado] = useState({ aberto: false, caixa: null, saldo: 0 });
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try { setEstado(await api.get("/caixa/atual")); } finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function abrir() {
    const v = Number(prompt("Valor de abertura (troco inicial):", "0") || 0);
    await api.post("/caixa/abrir", { valorAbertura: v }); carregar();
  }
  async function fechar() {
    if (!confirm("Fechar o caixa atual?")) return;
    const r = await api.post("/caixa/fechar", {});
    alert(`Caixa fechado. Saldo final: R$ ${Number(r.saldoFinal).toFixed(2)}`); carregar();
  }
  async function movimentar(tipo) {
    const v = Number(prompt(`Valor da ${tipo.toLowerCase()}:`, "0") || 0);
    if (v <= 0) return;
    const obs = prompt("Observação (opcional):", "") || "";
    await api.post("/caixa/movimentar", { tipo, valor: v, observacao: obs }); carregar();
  }

  if (carregando) return <div className="page-header"><h2>🧾 Caixa</h2><p>Carregando…</p></div>;

  return (
    <>
      <div className="page-header"><h2>🧾 Caixa</h2></div>
      <div className="card">
        {estado.aberto ? (
          <>
            <div className="caixa-status aberto">
              <div>
                <span className="caixa-label">Caixa ABERTO</span>
                <span className="caixa-saldo">R$ {Number(estado.saldo).toFixed(2)}</span>
                <small>Aberto em {new Date(estado.caixa.aberto_em).toLocaleString("pt-BR")}</small>
              </div>
              <span className="dot" style={{ background: "#22c55e", width: 16, height: 16 }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn-mini ok" onClick={() => movimentar("SUPRIMENTO")}>+ Suprimento (F10)</button>
              <button className="btn-mini danger" onClick={() => movimentar("SANGRIA")}>− Sangria (F9)</button>
              <button className="btn-checkout" style={{ width: "auto", padding: "8px 16px" }} onClick={fechar}>Fechar caixa (F8)</button>
            </div>
          </>
        ) : (
          <div className="caixa-status fechado">
            <div>
              <span className="caixa-label">Caixa FECHADO</span>
              <small>Abra o caixa para iniciar as vendas do dia.</small>
            </div>
            <button className="btn-checkout" style={{ width: "auto", padding: "8px 16px" }} onClick={abrir}>Abrir caixa (F7)</button>
          </div>
        )}
      </div>
    </>
  );
}
