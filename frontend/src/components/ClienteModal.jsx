import { useState } from "react";

export function ClienteModal({ clientes, clienteId, onSelect, onClose }) {
  const [busca, setBusca] = useState("");
  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.cpf_cnpj?.includes(busca)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-cliente" onClick={(e) => e.stopPropagation()}>
        <h3>👥 Selecionar Cliente</h3>
        <input
          type="text"
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
          className="modal-input"
        />
        <div className="modal-list">
          <button
            key="consumidor"
            className={`modal-item ${clienteId === "" ? "ativo" : ""}`}
            onClick={() => onSelect("")}
          >
            👤 Consumidor final
          </button>
          {filtrados.map((c) => (
            <button
              key={c.id}
              className={`modal-item ${clienteId == c.id ? "ativo" : ""}`}
              onClick={() => onSelect(c.id)}
            >
              <span className="mi-nome">{c.nome}</span>
              {c.cpf_cnpj && <span className="mi-doc">{c.cpf_cnpj}</span>}
            </button>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn-mini" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
