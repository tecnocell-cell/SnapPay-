import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [limite, setLimite] = useState(100);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, [filtroTipo, limite]);

  async function carregar() {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.set("tipo", filtroTipo);
      params.set("limite", limite);
      setLogs(await api.get(`/auditoria?${params.toString()}`));
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  const dataBR = (s) => s ? new Date(s).toLocaleString("pt-BR") : "—";
  const icones = {
    CREATE: "➕",
    UPDATE: "✏️",
    DELETE: "🗑️",
    READ: "👁️",
  };

  return (
    <>
      <div className="page-header">
        <h2>📋 Auditoria e Logs</h2>
      </div>

      <div className="card">
        <h3 className="card-title">🔍 Filtros</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
            <label>Tipo de Operação</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todas</option>
              <option value="CREATE">Criação</option>
              <option value="UPDATE">Atualização</option>
              <option value="DELETE">Exclusão</option>
              <option value="READ">Leitura</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
            <label>Limite de Registros</label>
            <select value={limite} onChange={(e) => setLimite(Number(e.target.value))}>
              <option value={50}>Últimos 50</option>
              <option value={100}>Últimos 100</option>
              <option value={250}>Últimos 250</option>
              <option value={500}>Últimos 500</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {carregando ? (
          <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
            Carregando logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
            Nenhum registro de auditoria encontrado
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Tipo</th>
                <th>Tabela</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: 12 }}>{dataBR(log.criado_em)}</td>
                  <td>{log.usuario_nome}</td>
                  <td style={{ textAlign: "center" }}>
                    {icones[log.tipo]} {log.tipo}
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {log.tabela}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    Registro #{log.registro_id} - {log.acao}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
        <strong>Nota:</strong> Este log é apenas consulta. Para operações reversíveis, use as funções de gestão correspondentes.
      </div>
    </>
  );
}
