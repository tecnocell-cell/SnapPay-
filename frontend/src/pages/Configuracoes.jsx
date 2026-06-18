import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const TIPOS_OPERACAO = [
  { id: "mercado", label: "Mercado", icon: "🏪", desc: "Caixa rápido com leitura de código de barras" },
  { id: "loja", label: "Loja", icon: "🛍️", desc: "Categorias e cards de produtos" },
  { id: "padaria", label: "Padaria", icon: "🥖", desc: "Produtos pesáveis e por unidade" },
  { id: "restaurante", label: "Restaurante", icon: "🍽️", desc: "Mesas, comandas, balcão e delivery" },
  { id: "conveniencia", label: "Conveniência", icon: "🏬", desc: "Venda rápida de mix variado" },
  { id: "farmacia", label: "Farmácia", icon: "💊", desc: "Controle de medicamentos e receitas" },
];

export default function Configuracoes() {
  const { empresa, recarregarEmpresa } = useAuth();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSuccesso] = useState("");
  const [segmento, setSegmento] = useState(empresa?.segmento || "mercado");
  const [salvandoSeg, setSalvandoSeg] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (empresa?.segmento) setSegmento(empresa.segmento);
  }, [empresa?.segmento]);

  async function salvarSegmento(novo) {
    setSalvandoSeg(true);
    setErro("");
    setSuccesso("");
    try {
      await api.put("/empresa/segmento", { segmento: novo });
      setSegmento(novo);
      await recarregarEmpresa();
      setSuccesso(`✓ Tipo de operação alterado para ${TIPOS_OPERACAO.find((t) => t.id === novo)?.label}. O PDV já está adaptado.`);
      setTimeout(() => setSuccesso(""), 4000);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvandoSeg(false);
    }
  }

  async function carregar() {
    try {
      const c = await api.get("/configuracoes");
      setConfig(c);
      setForm(c);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSuccesso("");

    try {
      await api.put("/configuracoes", {
        icms: Number(form.icms),
        pis: Number(form.pis),
        cofins: Number(form.cofins),
        ipi: Number(form.ipi || 0),
        tipo_nf: form.tipo_nf || "NFCe",
        aliquota_principal: Number(form.aliquota_principal),
      });
      setSuccesso("✓ Configurações salvas com sucesso!");
      setTimeout(() => setSuccesso(""), 3000);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  if (!form) return <div>Carregando...</div>;

  return (
    <>
      <div className="page-header">
        <h2>⚙️ Configurações</h2>
      </div>

      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {sucesso && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{sucesso}</div>}

      <div className="card">
        <h3 className="card-title">🧭 Tipo de Operação</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: -6, marginBottom: 14 }}>
          Define como o PDV se comporta. O operador não escolhe — o segmento pertence à configuração do sistema.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {TIPOS_OPERACAO.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={salvandoSeg}
              onClick={() => salvarSegmento(t.id)}
              style={{
                textAlign: "left",
                padding: 14,
                borderRadius: 10,
                cursor: "pointer",
                border: segmento === t.id ? "2px solid #6366f1" : "2px solid #e2e8f0",
                background: segmento === t.id ? "#eef2ff" : "#fff",
                transition: "all .15s",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>
                {t.label}
                {segmento === t.id && <span style={{ color: "#6366f1", marginLeft: 6, fontSize: 12 }}>✓ Ativo</span>}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🧮 Impostos e Alíquotas</h3>
        <form className="form-grid" onSubmit={salvar}>
          <div className="form-group">
            <label>ICMS (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.icms} onChange={(e) => setForm({ ...form, icms: e.target.value })} />
            <small>Alíquota padrão de ICMS</small>
          </div>

          <div className="form-group">
            <label>PIS (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.pis} onChange={(e) => setForm({ ...form, pis: e.target.value })} />
            <small>Alíquota de PIS</small>
          </div>

          <div className="form-group">
            <label>COFINS (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.cofins} onChange={(e) => setForm({ ...form, cofins: e.target.value })} />
            <small>Alíquota de COFINS</small>
          </div>

          <div className="form-group">
            <label>IPI (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.ipi} onChange={(e) => setForm({ ...form, ipi: e.target.value })} />
            <small>Alíquota de IPI (opcional)</small>
          </div>

          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Tipo de Nota Fiscal</label>
            <select value={form.tipo_nf} onChange={(e) => setForm({ ...form, tipo_nf: e.target.value })}>
              <option value="NFCe">NFCe (Cupom eletrônico)</option>
              <option value="NFe">NFe (Nota fiscal eletrônica)</option>
              <option value="SAT">SAT (Sistema autenticador transmissor)</option>
            </select>
            <small>Tipo de documento fiscal que será utilizado</small>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn-checkout" type="submit">💾 Salvar Configurações</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="card-title">📊 Resumo das Alíquotas</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <div>
            <small style={{ opacity: 0.7 }}>ICMS</small>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{form.icms}%</div>
          </div>
          <div>
            <small style={{ opacity: 0.7 }}>PIS</small>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{form.pis}%</div>
          </div>
          <div>
            <small style={{ opacity: 0.7 }}>COFINS</small>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{form.cofins}%</div>
          </div>
          <div>
            <small style={{ opacity: 0.7 }}>IPI</small>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{form.ipi || 0}%</div>
          </div>
        </div>
      </div>
    </>
  );
}
