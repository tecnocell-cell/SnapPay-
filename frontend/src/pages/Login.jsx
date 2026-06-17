import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@snappay.local");
  const [senha, setSenha] = useState("admin123");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(""); setCarregando(true);
    try { await login(email, senha); }
    catch (err) { setErro(err.message || "Falha no login"); }
    finally { setCarregando(false); }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={entrar}>
        <div className="login-brand">
          <h1>💳 SnapPay</h1>
          <p>Seu PDV na Nuvem</p>
        </div>
        {erro && <div className="login-erro">{erro}</div>}
        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <label>Senha</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <button type="submit" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
        <small className="login-dica">Demo: admin@snappay.local / admin123</small>
      </form>
    </div>
  );
}
