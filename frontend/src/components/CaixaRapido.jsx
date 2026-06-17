import { useState } from "react";
import { api } from "../lib/api";

export function CaixaRapido({ caixa, onClose, onRefresh }) {
  const [acao, setAcao] = useState(null);
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState("");

  async function executar() {
    if (!valor || Number(valor) <= 0) {
      setMsg("Informe um valor válido");
      return;
    }

    setCarregando(true);
    setMsg("");

    try {
      if (acao === "abrir") {
        await api.post("/caixa/abrir", { valorAbertura: Number(valor) });
        setMsg("✓ Caixa aberto!");
      } else if (acao === "fechar") {
        const r = await api.post("/caixa/fechar", {});
        setMsg(`✓ Caixa fechado. Saldo: R$ ${Number(r.saldoFinal).toFixed(2)}`);
      } else if (acao === "sangria") {
        await api.post("/caixa/movimentar", {
          tipo: "SANGRIA",
          valor: Number(valor),
          observacao: obs,
        });
        setMsg(`✓ Sangria de R$ ${Number(valor).toFixed(2)} registrada`);
      } else if (acao === "suprimento") {
        await api.post("/caixa/movimentar", {
          tipo: "SUPRIMENTO",
          valor: Number(valor),
          observacao: obs,
        });
        setMsg(`✓ Suprimento de R$ ${Number(valor).toFixed(2)} registrado`);
      }

      setValor("");
      setObs("");
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1500);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setCarregando(false);
    }
  }

  if (acao) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-caixa" onClick={(e) => e.stopPropagation()}>
          <h3>
            {acao === "abrir" && "🔓 Abrir Caixa"}
            {acao === "fechar" && "🔒 Fechar Caixa"}
            {acao === "sangria" && "💸 Sangria"}
            {acao === "suprimento" && "💵 Suprimento"}
          </h3>

          <div className="modal-form">
            <div className="form-group">
              <label>
                {acao === "abrir"
                  ? "Valor de abertura (troco inicial)"
                  : "Valor"}
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                autoFocus
                step="0.01"
                min="0"
                disabled={carregando || acao === "fechar"}
              />
            </div>

            {(acao === "sangria" || acao === "suprimento") && (
              <div className="form-group">
                <label>Observação</label>
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  disabled={carregando}
                />
              </div>
            )}

            {msg && (
              <div
                className={msg.includes("✓") ? "alerta-card ok" : "alerta-card"}
              >
                {msg}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn-mini" onClick={onClose} disabled={carregando}>
                Cancelar
              </button>
              <button
                className="btn-checkout"
                onClick={executar}
                disabled={carregando || !valor}
              >
                {carregando ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-caixa" onClick={(e) => e.stopPropagation()}>
        <h3>🧾 Caixa</h3>

        {caixa?.aberto ? (
          <div className="caixa-info aberto">
            <div className="ci-status">
              <span className="dot" style={{ background: "#22c55e" }} />
              <span>ABERTO</span>
            </div>
            <div className="ci-saldo">
              <span>Saldo:</span>
              <strong>R$ {Number(caixa.saldo).toFixed(2)}</strong>
            </div>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Aberto em {new Date(caixa.caixa?.aberto_em).toLocaleString("pt-BR")}
            </p>

            <div className="caixa-acoes">
              <button
                className="btn-mini ok"
                onClick={() => setAcao("suprimento")}
              >
                💵 Suprimento (F10)
              </button>
              <button
                className="btn-mini danger"
                onClick={() => setAcao("sangria")}
              >
                💸 Sangria (F9)
              </button>
              <button className="btn-checkout" onClick={() => setAcao("fechar")}>
                🔒 Fechar (F8)
              </button>
            </div>
          </div>
        ) : (
          <div className="caixa-info fechado">
            <div className="ci-status">
              <span className="dot" style={{ background: "#ef4444" }} />
              <span>FECHADO</span>
            </div>
            <p>Abra o caixa para iniciar as vendas do dia.</p>
            <button className="btn-checkout" onClick={() => setAcao("abrir")}>
              🔓 Abrir (F7)
            </button>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-mini" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
