import { useState, useEffect } from "react";
import { api } from "../lib/api";

const VAZIO = {
  razao_social: "", nome_fantasia: "", cnpj: "",
  inscricao_estadual: "", inscricao_municipal: "",
  telefone: "", email: "",
  endereco: "", cidade: "", uf: "", cep: "",
  regime_tributario: "", logo_url: ""
};

export default function Empresa() {
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState("");
  const [sucesso, setSuccesso] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregarEmpresa(); }, []);

  async function carregarEmpresa() {
    try {
      const emp = await api.get("/empresa");
      setForm(emp || VAZIO);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro(""); setSuccesso("");

    try {
      await api.put("/empresa", form);
      setSuccesso("✓ Dados da empresa salvos com sucesso!");
      setTimeout(() => setSuccesso(""), 3000);
    } catch (err) {
      setErro(err.message);
    }
  }

  if (carregando) return <div style={{ padding: 40 }}>Carregando...</div>;

  return (
    <>
      <div className="page-header">
        <h2>🏢 Configuração da Empresa</h2>
      </div>

      {erro && <div className="alerta-card" style={{ marginBottom: 12 }}>{erro}</div>}
      {sucesso && <div className="alerta-card ok" style={{ marginBottom: 12 }}>{sucesso}</div>}

      <form onSubmit={salvar} className="card">
        <h3 className="card-title">Dados Básicos</h3>
        <div className="form-grid">
          <div><label>Razão Social *</label><input value={form.razao_social} onChange={(e) => setForm({...form, razao_social: e.target.value})} /></div>
          <div><label>Nome Fantasia</label><input value={form.nome_fantasia} onChange={(e) => setForm({...form, nome_fantasia: e.target.value})} /></div>
          <div><label>CNPJ</label><input value={form.cnpj} onChange={(e) => setForm({...form, cnpj: e.target.value})} /></div>
          <div><label>Inscrição Estadual</label><input value={form.inscricao_estadual} onChange={(e) => setForm({...form, inscricao_estadual: e.target.value})} /></div>
          <div><label>Inscrição Municipal</label><input value={form.inscricao_municipal} onChange={(e) => setForm({...form, inscricao_municipal: e.target.value})} /></div>
          <div><label>Regime Tributário</label><select value={form.regime_tributario} onChange={(e) => setForm({...form, regime_tributario: e.target.value})}>
            <option value="">Selecione</option>
            <option value="SIMPLES">Simples Nacional</option>
            <option value="LUCRO_REAL">Lucro Real</option>
            <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
          </select></div>
        </div>

        <h3 className="card-title" style={{ marginTop: 20 }}>Contato</h3>
        <div className="form-grid">
          <div><label>Telefone</label><input value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} /></div>
          <div><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
        </div>

        <h3 className="card-title" style={{ marginTop: 20 }}>Endereço</h3>
        <div className="form-grid">
          <div style={{ gridColumn: "1 / -1" }}><label>Endereço</label><input value={form.endereco} onChange={(e) => setForm({...form, endereco: e.target.value})} /></div>
          <div><label>Cidade</label><input value={form.cidade} onChange={(e) => setForm({...form, cidade: e.target.value})} /></div>
          <div><label>UF</label><input maxLength="2" value={form.uf} onChange={(e) => setForm({...form, uf: e.target.value.toUpperCase()})} /></div>
          <div><label>CEP</label><input value={form.cep} onChange={(e) => setForm({...form, cep: e.target.value})} /></div>
        </div>

        <button type="submit" className="btn-checkout" style={{ marginTop: 20 }}>💾 Salvar Alterações</button>
      </form>
    </>
  );
}
