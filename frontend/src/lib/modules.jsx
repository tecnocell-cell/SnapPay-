import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./auth";

const ModulesContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Registro de módulos disponíveis
export const REGISTRY = [
  { id: "pdv", modulo: "pdv", label: "💳 PDV", icon: "💳", perm: null },
  { id: "produtos", modulo: "produtos", label: "📦 Produtos", icon: "📦", perm: "produtos.ler" },
  { id: "categorias", modulo: "produtos", label: "🏷️  Categorias", icon: "🏷️ ", perm: "produtos.ler" },
  { id: "estoque", modulo: "estoque", label: "📊 Estoque", icon: "📊", perm: "estoque.ler" },
  { id: "caixa", modulo: "caixa", label: "💰 Caixa", icon: "💰", perm: "caixa.ler" },
  { id: "vendas", modulo: "vendas", label: "📈 Vendas", icon: "📈", perm: "vendas.ler" },
  { id: "clientes", modulo: "cadastro", label: "👥 Clientes", icon: "👥", perm: "clientes.ler" },
  { id: "relatorios", modulo: "relatorios", label: "📉 Relatórios", icon: "📉", perm: "relatorios.ler" },
  { id: "modulos", modulo: "cadastro", label: "🧩 Módulos", icon: "🧩", perm: "modulos.gerir" },
];

export function ModulesProvider({ children }) {
  const { usuario, empresa, token } = useAuth();
  const [modulos, setModulos] = useState({});
  const [carregando, setCarregando] = useState(true);

  // Ao autenticar, busca módulos da empresa
  useEffect(() => {
    if (!usuario || !empresa || !token) {
      setModulos({});
      setCarregando(false);
      return;
    }
    carregarModulos();
  }, [usuario, empresa, token]);

  async function carregarModulos() {
    try {
      const res = await fetch(
        `${API_URL}/api/empresa/${empresa.id}/modulos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Falha ao carregar módulos");
      const lista = await res.json();
      const map = {};
      lista.forEach((m) => (map[m.modulo] = m.ativo));
      setModulos(map);
    } catch (err) {
      console.error("Erro ao carregar módulos:", err);
      // Fallback: todos os módulos ativos se falhar
      setModulos({
        pdv: true,
        produtos: true,
        estoque: true,
        caixa: true,
        vendas: true,
        cadastro: true,
        relatorios: true,
      });
    } finally {
      setCarregando(false);
    }
  }

  function isAtivo(modulo) {
    if (!modulo) return true;
    return modulos[modulo] ?? false;
  }

  return (
    <ModulesContext.Provider value={{ modulos, carregando, isAtivo, carregarModulos }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error("useModules deve estar dentro de <ModulesProvider>");
  return ctx;
}
