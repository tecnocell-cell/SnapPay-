import { useState, useEffect } from "react";

export function DescontoModal({ subtotal, desconto, onApply, onClose }) {
  const [tipo, setTipo] = useState(desconto.tipo || "valor");
  const [valor, setValor] = useState(desconto.valor || "");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (tipo === "valor") {
      if (Number(valor) > subtotal) {
        setErro(`Desconto não pode ser maior que R$ ${subtotal.toFixed(2)}`);
      } else {
        setErro("");
      }
    } else if (tipo === "percentual") {
      if (Number(valor) > 100) {
        setErro("Percentual não pode ser maior que 100%");
      } else {
        setErro("");
      }
    }
  }, [tipo, valor, subtotal]);

  function aplicar() {
    if (!valor || Number(valor) <= 0) {
      setErro("Informe um valor válido");
      return;
    }
    if (erro) return;

    let descontoFinal = Number(valor);
    if (tipo === "percentual") {
      descontoFinal = (subtotal * Number(valor)) / 100;
    }

    onApply({ tipo, valor: Number(valor), final: descontoFinal });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-desconto" onClick={(e) => e.stopPropagation()}>
        <h3>🏷️ Desconto</h3>
        <div className="modal-form">
          <div className="form-group">
            <label>Tipo</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="valor"
                  checked={tipo === "valor"}
                  onChange={(e) => setTipo(e.target.value)}
                />
                Valor (R$)
              </label>
              <label>
                <input
                  type="radio"
                  value="percentual"
                  checked={tipo === "percentual"}
                  onChange={(e) => setTipo(e.target.value)}
                />
                Percentual (%)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>{tipo === "valor" ? "Valor em reais" : "Percentual"}</label>
            <input
              type="number"
              placeholder="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
              step={tipo === "valor" ? "0.01" : "1"}
              min="0"
            />
          </div>

          {tipo === "percentual" && valor && (
            <div className="form-info">
              Desconto: R$ {((subtotal * Number(valor)) / 100).toFixed(2)}
            </div>
          )}

          {erro && <div className="alerta-card">{erro}</div>}

          <div className="modal-footer">
            <button className="btn-mini" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-checkout"
              onClick={aplicar}
              disabled={!!erro || !valor}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
