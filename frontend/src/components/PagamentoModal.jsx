import { useState, useEffect } from "react";

const FORMAS = [
  { id: "DINHEIRO", label: "💵 Dinheiro", icon: "💵" },
  { id: "DEBITO", label: "🏧 Débito", icon: "🏧" },
  { id: "CREDITO", label: "💳 Crédito", icon: "💳" },
  { id: "PIX", label: "📱 PIX", icon: "📱" },
  { id: "CREDIARIO", label: "📋 Crediário", icon: "📋" },
];

export function PagamentoModal({ total, pagamentos, onApply, onClose }) {
  const [forma, setForma] = useState("DINHEIRO");
  const [valor, setValor] = useState("");
  const [troco, setTroco] = useState(0);
  const [erro, setErro] = useState("");
  const [pagamentosLocal, setPagamentosLocal] = useState(pagamentos || []);

  const totalPago = pagamentosLocal.reduce((a, p) => a + p.valor, 0);
  const faltaPagar = Math.max(0, total - totalPago);

  useEffect(() => {
    const v = Number(valor) || 0;
    if (forma === "DINHEIRO") {
      const novoTroco = Math.max(0, v - faltaPagar);
      setTroco(novoTroco);
      setErro(v < faltaPagar ? "Valor insuficiente" : "");
    } else {
      setTroco(0);
      setErro(v <= 0 ? "Informe um valor" : v !== faltaPagar ? `Deve ser R$ ${faltaPagar.toFixed(2)}` : "");
    }
  }, [valor, forma, faltaPagar]);

  function adicionarPagamento() {
    const v = Number(valor);
    if (!v || v <= 0) return;

    const novosPagamentos = [...pagamentosLocal, { forma, valor: v }];
    setPagamentosLocal(novosPagamentos);
    setForma("DINHEIRO");
    setValor("");
    setTroco(0);
  }

  function removerPagamento(idx) {
    setPagamentosLocal(pagamentosLocal.filter((_, i) => i !== idx));
  }

  function finalizar() {
    if (totalPago < total) {
      setErro(`Falta R$ ${(total - totalPago).toFixed(2)}`);
      return;
    }
    onApply(pagamentosLocal);
    onClose();
  }

  const totalPagoTemp = totalPago + (Number(valor) || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-pagamento" onClick={(e) => e.stopPropagation()}>
        <h3>💳 Pagamento</h3>

        <div className="pag-resumo">
          <div className="pag-linha">
            <span>Total:</span>
            <strong>R$ {total.toFixed(2)}</strong>
          </div>
          {totalPago > 0 && (
            <div className="pag-linha">
              <span>Já pago:</span>
              <strong style={{ color: "#22c55e" }}>
                R$ {totalPago.toFixed(2)}
              </strong>
            </div>
          )}
          {faltaPagar > 0 && (
            <div className="pag-linha">
              <span>Falta pagar:</span>
              <strong style={{ color: "#ef4444" }}>
                R$ {faltaPagar.toFixed(2)}
              </strong>
            </div>
          )}
          {totalPagoTemp > total && (
            <div className="pag-linha">
              <span>Troco:</span>
              <strong style={{ color: "#3b82f6" }}>
                R$ {(totalPagoTemp - total).toFixed(2)}
              </strong>
            </div>
          )}
        </div>

        <div className="pag-form">
          <div className="form-group">
            <label>Forma de pagamento</label>
            <div className="forma-grid">
              {FORMAS.map((f) => (
                <button
                  key={f.id}
                  className={`forma-btn ${forma === f.id ? "ativo" : ""}`}
                  onClick={() => setForma(f.id)}
                  title={f.label}
                >
                  {f.icon}
                  <small>{f.id}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Valor</label>
            <input
              type="number"
              placeholder={`R$ ${faltaPagar.toFixed(2)}`}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
              step="0.01"
              min="0"
            />
          </div>

          {erro && <div className="alerta-card">{erro}</div>}

          <button
            className="btn-checkout"
            onClick={adicionarPagamento}
            disabled={!!erro || !valor}
          >
            + Adicionar {forma}
          </button>
        </div>

        {pagamentosLocal.length > 0 && (
          <div className="pag-lista">
            <h4>Pagamentos adicionados:</h4>
            {pagamentosLocal.map((p, i) => (
              <div key={i} className="pag-item">
                <span>{FORMAS.find((f) => f.id === p.forma)?.icon} {p.forma}</span>
                <span>R$ {p.valor.toFixed(2)}</span>
                <button
                  className="btn-mini danger"
                  onClick={() => removerPagamento(i)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-mini" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-checkout"
            onClick={finalizar}
            disabled={totalPago < total}
          >
            ✓ Finalizar venda
          </button>
        </div>
      </div>
    </div>
  );
}
