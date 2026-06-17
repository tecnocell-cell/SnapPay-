import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Ao carregar, verifica se há token e valida
  useEffect(() => {
    if (!token) {
      setCarregando(false);
      return;
    }
    verificarToken();
  }, [token]);

  async function verificarToken() {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Token inválido");
      const dados = await res.json();
      setUsuario({ ...dados.usuario, permissoes: dados.permissoes });
      setEmpresa(dados.empresa);
    } catch (err) {
      setToken(null);
      localStorage.removeItem("token");
    } finally {
      setCarregando(false);
    }
  }

  async function login(email, senha) {
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha no login");
      }
      const dados = await res.json();
      localStorage.setItem("token", dados.token);
      setToken(dados.token);
      setUsuario({ ...dados.usuario, permissoes: dados.permissoes });
      setEmpresa(dados.empresa);
    } finally {
      setCarregando(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUsuario(null);
    setEmpresa(null);
  }

  function can(permissao) {
    if (!usuario) return false;
    if (usuario.papel === "ADMIN") return true;
    return usuario.permissoes?.includes(permissao) || false;
  }

  return (
    <AuthContext.Provider value={{ usuario, empresa, carregando, token, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro de <AuthProvider>");
  return ctx;
}
