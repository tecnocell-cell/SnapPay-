import { useState, useEffect } from "react";
import { api } from "../lib/api";

const VAZIO = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  ie: "", // Inscrição Estadual
  im: "", // Inscrição Municipal
  crt: "", // Código Regime Tributário: 1=Simples, 2=Excesso, 3=Normal
  cnae_principal: "", // CNAE (ex: 1234-5/01)
  regime_tributario: "", // SIMPLES_NACIONAL ou NORMAL
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  municipio: "",
  uf: "",
};

export default function CadastroEmpresaTributario() {
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");
  const [sucesso, setSuccesso] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    try {
      const emp = await api.get("/empresa");
      if (emp) {
        setForm({
          razao_social: emp.razao_social || "",
          nome_fantasia: emp.nome_fantasia || "",
          cnpj: emp.cnpj || "",
          ie: emp.ie || "",
          im: emp.im || "",
          crt: emp.crt || "",
          cnae_principal: emp.cnae_principal || "",
          regime_tributario: emp.regime_tributario || "",
          cep: emp.cep || "",
          endereco: emp.endereco || "",
          numero: emp.numero || "",
          complemento: emp.complemento || "",
          bairro: emp.bairro || "",
          municipio: emp.municipio || "",
          uf: emp.uf || "",
        });
      }
    } catch (err) {
      console.error(err);
      setErro("Erro ao carregar dados da empresa");
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSuccesso("");

    // Validações obrigatórias
    if (!form.cnpj) {
      setErro("CNPJ é obrigatório");
      return;
    }
    if (!form.crt) {
      setErro("Regime Tributário é obrigatório");
      return;
    }
    if (!form.cnae_principal) {
      setErro("CNAE é obrigatório");
      return;
    }

    try {
      await api.put("/empresa", form);
      setSuccesso("✓ Dados tributários salvos com sucesso!");
      setTimeout(() => setSuccesso(""), 3000);
    } catch (err) {
      setErro(err.message || "Erro ao salvar");
    }
  }

  if (carregando) return <div style={{ padding: 40 }}>Carregando...</div>;

  return (
    <>
      <div className="page-header">
        <h2>📋 Cadastro Tributário da Empresa</h2>
      </div>

      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {sucesso && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{sucesso}</div>}

      <form onSubmit={salvar} className="card">
        <h3 className="card-title">Identificação</h3>
        <div className="form-grid">
          <div><label>Razão Social *</label><input required value={form.razao_social} onChange={(e) => setForm({...form, razao_social: e.target.value})} /></div>
          <div><label>Nome Fantasia</label><input value={form.nome_fantasia} onChange={(e) => setForm({...form, nome_fantasia: e.target.value})} /></div>
        </div>

        <h3 className="card-title" style={{ marginTop: 20 }}>Documentação Fiscal</h3>
        <div className="form-grid">
          <div><label>CNPJ * (formato: 00.000.000/0000-00)</label>
            <input
              required
              value={form.cnpj}
              maxLength="18"
              onChange={(e) => setForm({...form, cnpj: e.target.value})}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div><label>Inscrição Estadual (IE)</label>
            <input
              value={form.ie}
              onChange={(e) => setForm({...form, ie: e.target.value})}
              placeholder="Ex: 123.456.789.012"
            />
          </div>
          <div><label>Inscrição Municipal (IM)</label>
            <input
              value={form.im}
              onChange={(e) => setForm({...form, im: e.target.value})}
              placeholder="Ex: 12345678"
            />
          </div>
        </div>

        <h3 className="card-title" style={{ marginTop: 20 }}>Regime Tributário</h3>
        <div className="form-grid">
          <div><label>CRT (Código Regime Tributário) *</label>
            <select required value={form.crt} onChange={(e) => setForm({...form, crt: e.target.value})}>
              <option value="">Selecione</option>
              <option value="1">1 - Simples Nacional</option>
              <option value="2">2 - Simples Nacional com Excesso</option>
              <option value="3">3 - Regime Normal</option>
            </select>
          </div>
          <div><label>Regime Tributário</label>
            <select value={form.regime_tributario} onChange={(e) => setForm({...form, regime_tributario: e.target.value})}>
              <option value="">Selecione</option>
              <option value="SIMPLES_NACIONAL">Simples Nacional</option>
              <option value="NORMAL">Normal (Lucro Real/Presumido)</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}><label>CNAE Fiscal *</label>
            <input
              required
              value={form.cnae_principal}
              onChange={(e) => setForm({...form, cnae_principal: e.target.value})}
              placeholder="Ex: 4771-3/02 (Comércio varejista)"
              maxLength="10"
            />
          </div>
        </div>

        <h3 className="card-title" style={{ marginTop: 20 }}>Endereço Fiscal</h3>
        <div className="form-grid">
          <div><label>CEP</label>
            <input
              value={form.cep}
              onChange={(e) => setForm({...form, cep: e.target.value})}
              maxLength="9"
              placeholder="00000-000"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}><label>Endereço</label>
            <input
              value={form.endereco}
              onChange={(e) => setForm({...form, endereco: e.target.value})}
              placeholder="Rua, Avenida, etc."
            />
          </div>
          <div><label>Número</label><input value={form.numero} onChange={(e) => setForm({...form, numero: e.target.value})} /></div>
          <div><label>Complemento</label><input value={form.complemento} onChange={(e) => setForm({...form, complemento: e.target.value})} /></div>
          <div><label>Bairro</label><input value={form.bairro} onChange={(e) => setForm({...form, bairro: e.target.value})} /></div>
          <div><label>Município</label><input value={form.municipio} onChange={(e) => setForm({...form, municipio: e.target.value})} /></div>
          <div><label>UF</label>
            <input
              maxLength="2"
              value={form.uf}
              onChange={(e) => setForm({...form, uf: e.target.value.toUpperCase()})}
              placeholder="SP"
            />
          </div>
        </div>

        <button type="submit" className="btn-checkout" style={{ marginTop: 20 }}>💾 Salvar Dados Tributários</button>
      </form>

      <div className="card" style={{ marginTop: 20, padding: 20, backgroundColor: "#f5f5f5" }}>
        <h4>ℹ️ Sobre estes Campos</h4>
        <ul style={{ fontSize: 14, lineHeight: 1.6, color: "#666" }}>
          <li><strong>CNPJ:</strong> Número único da empresa (14 dígitos)</li>
          <li><strong>IE:</strong> Inscrição Estadual no ICMS</li>
          <li><strong>IM:</strong> Inscrição Municipal para ISS</li>
          <li><strong>CRT:</strong> Indicador do Regime Tributário (necessário para NFC-e)</li>
          <li><strong>CNAE:</strong> Classificação Nacional de Atividade Econômica (usado na NFC-e)</li>
          <li>Estes dados são obrigatórios para emissão de <strong>NFC-e</strong></li>
        </ul>
      </div>
    </>
  );
}
