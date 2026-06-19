import { useState, useEffect } from "react";
import { api } from "../lib/api";

const PROVEDORES = [
  { valor: "MOCK", label: "Mock (Homologação)" },
  { valor: "NUVEM_FISCAL", label: "Nuvem Fiscal" },
  { valor: "FOCUS_NFE", label: "Focus NFe" },
];

const AMBIENTES = [
  { valor: "homologacao", label: "Homologação" },
  { valor: "producao", label: "Produção" },
];

export default function ConfiguracaoFiscal() {
  const [config, setConfig] = useState({
    provider: "MOCK",
    ambiente: "homologacao",
    serie: 1,
    numero_atual: 0,
    token: "",
    csc: "",
    csc_id: "",
  });

  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [testando, setTestando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarConfiguracao();
  }, []);

  async function carregarConfiguracao() {
    try {
      const cfg = await api.get("/fiscal/configuracoes");
      if (cfg) {
        setConfig({
          provider: cfg.provider || "MOCK",
          ambiente: cfg.ambiente || "homologacao",
          serie: cfg.serie || 1,
          numero_atual: cfg.numero_atual || 0,
          token: cfg.provider_token || "",
          csc: "", // Nunca retorna por segurança
          csc_id: cfg.csc_id || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setStatus("");

    try {
      await api.put("/fiscal/configuracoes", {
        provider: config.provider,
        ambiente: config.ambiente,
        serie: Number(config.serie),
        numero_atual: Number(config.numero_atual),
        provider_token: config.token, // Será hashado/encriptado no backend
        csc: config.csc, // Será encriptado
        csc_id: config.csc_id,
      });

      setStatus("✓ Configuração salva com sucesso!");
      setTimeout(() => setStatus(""), 3000);
      carregarConfiguracao(); // Recarregar
    } catch (err) {
      setErro(err.message || "Erro ao salvar");
    }
  }

  async function testar() {
    setTestando(true);
    setErro("");
    setStatus("");

    try {
      const resultado = await api.post("/fiscal/configuracoes/validar", {
        provider: config.provider,
        token: config.token,
        csc: config.csc,
        csc_id: config.csc_id,
      });

      if (resultado.ok) {
        setStatus(`✓ Conexão OK — ${resultado.mensagem || "Provedor respondendo"}`);
      } else {
        setErro(`Validação falhou: ${resultado.erros?.[0] || resultado.mensagem}`);
      }
    } catch (err) {
      setErro(err.message || "Erro ao testar");
    } finally {
      setTestando(false);
    }
  }

  if (carregando) return <div style={{ padding: 40 }}>Carregando...</div>;

  return (
    <>
      <div className="page-header">
        <h2>🔧 Configuração Fiscal — NFC-e</h2>
      </div>

      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {status && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{status}</div>}

      <form onSubmit={salvar} className="card">
        <h3 className="card-title">Provedor Fiscal</h3>
        <div className="form-grid">
          <div>
            <label>Provedor *</label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
            >
              {PROVEDORES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Ambiente *</label>
            <select
              value={config.ambiente}
              onChange={(e) => setConfig({ ...config, ambiente: e.target.value })}
            >
              {AMBIENTES.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {config.provider === "NUVEM_FISCAL" && (
          <>
            <h3 className="card-title" style={{ marginTop: 20 }}>
              Credenciais Nuvem Fiscal
            </h3>
            <div className="form-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Token API *</label>
                <input
                  type="password"
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGc..."
                  required
                />
                <small>Obtém em Nuvem Fiscal → Integrações → API Token</small>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>CSC (Código de Segurança) *</label>
                <input
                  type="password"
                  value={config.csc}
                  onChange={(e) => setConfig({ ...config, csc: e.target.value })}
                  placeholder="1234567890"
                  required
                />
                <small>CSC da empresa para assinatura</small>
              </div>

              <div>
                <label>CSC ID *</label>
                <input
                  type="text"
                  value={config.csc_id}
                  onChange={(e) => setConfig({ ...config, csc_id: e.target.value })}
                  placeholder="1"
                  required
                />
                <small>ID do CSC (geralmente 1)</small>
              </div>
            </div>
          </>
        )}

        <h3 className="card-title" style={{ marginTop: 20 }}>
          Numeração NFC-e
        </h3>
        <div className="form-grid">
          <div>
            <label>Série *</label>
            <input
              type="number"
              value={config.serie}
              onChange={(e) => setConfig({ ...config, serie: e.target.value })}
              min="1"
              required
            />
          </div>

          <div>
            <label>Último Número Utilizado</label>
            <input
              type="number"
              value={config.numero_atual}
              onChange={(e) => setConfig({ ...config, numero_atual: e.target.value })}
              min="0"
            />
            <small>Próxima nota será nº {Number(config.numero_atual) + 1}</small>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button type="submit" className="btn-checkout">
            💾 Salvar Configuração
          </button>
          <button
            type="button"
            className="btn-mini"
            onClick={testar}
            disabled={testando}
            style={{ cursor: testando ? "wait" : "pointer" }}
          >
            {testando ? "Testando..." : "🔗 Testar Conexão"}
          </button>
        </div>
      </form>

      <div className="card" style={{ marginTop: 20, padding: 20, backgroundColor: "#f5f5f5" }}>
        <h4>ℹ️ Configuração de Credenciais</h4>
        <ul style={{ fontSize: 14, lineHeight: 1.6, color: "#666" }}>
          <li>
            <strong>MOCK:</strong> Usa emissão simulada. Perfeito para testes.
          </li>
          <li>
            <strong>Nuvem Fiscal:</strong> Integração real com homologação da SEFAZ
          </li>
          <li>
            <strong>Token:</strong> Gera em Nuvem Fiscal → Dashboard → Integrações
          </li>
          <li>
            <strong>CSC:</strong> Código de Segurança do Cliente (obtém no Portal da Prefeitura)
          </li>
          <li>
            <strong>Ambiente:</strong> Use "Homologação" para testes; "Produção" só com NFC-e pronto
          </li>
        </ul>
      </div>
    </>
  );
}
