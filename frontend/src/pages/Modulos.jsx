import { useModules } from "../lib/modules";
import { api } from "../lib/api";

export default function Modulos() {
  const { modulos, recarregar } = useModules();

  async function alternar(m) {
    if (m.nucleo) return; // núcleo não desativa
    await api.put(`/modulos/${m.chave}`, { ativo: !m.ativo });
    recarregar();
  }

  return (
    <>
      <div className="page-header"><h2>🧩 Módulos</h2></div>
      <div className="card">
        <p style={{ marginTop: 0, color: "#64748b" }}>
          Módulos de <strong>núcleo</strong> ficam sempre ativos. Os de <strong>segmento</strong> podem ser
          ligados conforme o tipo de negócio.
        </p>
        <table className="data-table">
          <thead><tr><th>Módulo</th><th>Tipo</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {modulos.map((m) => (
              <tr key={m.chave}>
                <td>{m.nome}</td>
                <td>{m.nucleo ? "Núcleo" : "Segmento"}</td>
                <td>
                  <span className="status-badge" style={{ background: m.ativo ? "#22c55e" : "#94a3b8" }}>
                    {m.ativo ? "ATIVO" : "INATIVO"}
                  </span>
                </td>
                <td>
                  {!m.nucleo && (
                    <button className={`btn-mini ${m.ativo ? "danger" : "ok"}`} onClick={() => alternar(m)}>
                      {m.ativo ? "Desativar" : "Ativar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
