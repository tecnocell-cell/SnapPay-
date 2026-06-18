import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function TerminalSetup() {
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem("device_id") || "");
  const [chave, setChave] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Se não temos deviceId, gera um (UUID v4)
  useEffect(() => {
    if (!deviceId) {
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setDeviceId(newId);
      localStorage.setItem("device_id", newId);
    }
  }, []);

  async function confirmarAtivacao(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/api/terminal/confirmar-ativacao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": deviceId,
        },
        body: JSON.stringify({ chave_ativacao: chave }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao confirmar ativação");
      }

      const data = await res.json();
      setStatus("✓ Terminal ativado com sucesso! Reiniciando...");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "12px", padding: "40px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h1 style={{ textAlign: "center", marginTop: 0, fontSize: "24px", color: "#1e293b" }}>🖥️ SnapPay Terminal</h1>

        <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px", color: "#475569" }}>
          <strong>Device ID:</strong>
          <div style={{ fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all", marginTop: "4px", color: "#1e293b" }}>{deviceId}</div>
        </div>

        {status ? (
          <div style={{ background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "8px", textAlign: "center", marginBottom: "20px" }}>{status}</div>
        ) : erro ? (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px" }}>⚠️ {erro}</div>
        ) : null}

        {!status && (
          <form onSubmit={confirmarAtivacao} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Chave de ativação</label>
              <input
                type="password"
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="Fornecida pelo administrador"
                style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                disabled={loading}
              />
              <small style={{ color: "#94a3b8", display: "block", marginTop: "4px" }}>Solicite a chave para ativar este terminal.</small>
            </div>

            <button
              type="submit"
              disabled={loading || !chave}
              style={{
                background: loading ? "#94a3b8" : "#6366f1",
                color: "#fff",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              {loading ? "Ativando..." : "Ativar terminal"}
            </button>
          </form>
        )}

        <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "20px", marginBottom: 0 }}>SnapPay Terminal © 2026 — Modo quiosque</p>
      </div>
    </div>
  );
}
