import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./auth";

const ModulesContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Registro de módulos disponíveis (label sem emoji — o ícone é renderizado à parte)
export const REGISTRY = [
  { id: "dashboard", modulo: "relatorios", label: "Dashboard", icon: "📊", perm: "relatorios.ver" },
  { id: "pdv", modulo: "pdv", label: "PDV", icon: "💳", perm: null },
  { id: "produtos", modulo: "produtos", label: "Produtos", icon: "📦", perm: "produtos.ver" },
  { id: "categorias", modulo: "produtos", label: "Categorias", icon: "🏷️", perm: "produtos.ver" },
  { id: "estoque", modulo: "estoque", label: "Estoque", icon: "📦", perm: "estoque.editar" },
  { id: "kardex", modulo: "estoque", label: "Kardex", icon: "📑", perm: "estoque.editar" },
  { id: "inventario", modulo: "estoque", label: "Inventário", icon: "📋", perm: "inventario.gerenciar" },
  { id: "caixa", modulo: "caixa", label: "Caixa", icon: "💰", perm: "caixa.operar" },
  { id: "vendas", modulo: "vendas", label: "Vendas", icon: "📈", perm: "vendas.criar" },
  { id: "clientes", modulo: "cadastro", label: "Clientes", icon: "👥", perm: null },
  { id: "fornecedores", modulo: "produtos", label: "Fornecedores", icon: "🏭", perm: "compras.gerenciar" },
  { id: "compras", modulo: "estoque", label: "Compras", icon: "🛒", perm: "compras.gerenciar" },
  { id: "financeiro", modulo: "financeiro", label: "Financeiro", icon: "💵", perm: "financeiro.ver" },
  { id: "notasfiscais", modulo: "vendas", label: "Notas Fiscais", icon: "🧾", perm: "fiscal.emitir" },
  { id: "relatorios", modulo: "relatorios", label: "Relatórios", icon: "📉", perm: "relatorios.ver" },
  { id: "empresa", modulo: "cadastro", label: "Empresa", icon: "🏢", perm: "config.editar" },
  { id: "configuracoes", modulo: "cadastro", label: "Configurações", icon: "⚙️", perm: "config.editar" },
  { id: "fiscalconfig", modulo: "cadastro", label: "Config. Fiscal", icon: "🧾", perm: "fiscal.configurar" },
  { id: "terminais", modulo: "cadastro", label: "Terminais PDV", icon: "🖥️", perm: "dispositivos.gerenciar" },
  { id: "auditoria", modulo: "cadastro", label: "Auditoria", icon: "📋", perm: "auditoria.ver" },
  { id: "modulos", modulo: "cadastro", label: "Módulos", icon: "🧩", perm: "modulos.gerenciar" },
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
        `${API_URL}/api/modulos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Falha ao carregar módulos");
      const lista = await res.json();
      const map = {};
      lista.forEach((m) => (map[m.chave] = m.ativo));
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
