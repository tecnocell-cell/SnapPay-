import { useState, useEffect } from "react";
import "./App.css";
import "./styles/pdv.css";
import { useAuth } from "./lib/auth";
import { useModules, REGISTRY } from "./lib/modules";
import { ModuleGate } from "./components/ModuleGate";
import Login from "./pages/Login";
import PDV from "./pages/PDV";
import Produtos from "./pages/Produtos";
import Categorias from "./pages/Categorias";
import Estoque from "./pages/Estoque";
import Caixa from "./pages/Caixa";
import Vendas from "./pages/Vendas";
import Clientes from "./pages/Clientes";
import Relatorios from "./pages/Relatorios";
import Modulos from "./pages/Modulos";

const PAGINAS = {
  pdv: { comp: <PDV />, modulo: "pdv" },
  produtos: { comp: <Produtos />, modulo: "produtos" },
  categorias: { comp: <Categorias />, modulo: "produtos" },
  estoque: { comp: <Estoque />, modulo: "estoque" },
  caixa: { comp: <Caixa />, modulo: "caixa" },
  vendas: { comp: <Vendas />, modulo: "vendas" },
  clientes: { comp: <Clientes />, modulo: "cadastro" },
  relatorios: { comp: <Relatorios />, modulo: "relatorios" },
  modulos: { comp: <Modulos />, modulo: "cadastro" },
};

function Relogio() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setHora(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span>🕐 {hora.toLocaleTimeString("pt-BR")}</span>;
}

export default function App() {
  const { usuario, empresa, carregando, logout, can } = useAuth();
  const { isAtivo } = useModules();
  const [pagina, setPagina] = useState("pdv");
  const [menuAberto, setMenuAberto] = useState(false);

  if (carregando) return <div className="splash">💳 SnapPay — carregando…</div>;
  if (!usuario) return <Login />;

  // itens do menu: módulo ativo + permissão (quando exigida)
  const itens = REGISTRY.filter((m) => isAtivo(m.modulo) && (!m.perm || can(m.perm)));
  const atual = PAGINAS[pagina] || PAGINAS.pdv;

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>💳 SnapPay</h1>
          <p>Seu PDV na Nuvem</p>
        </div>
        <div className="header-info">
          <span>👤 {usuario.nome} <em>({usuario.papel})</em></span>
          <span>🏪 {empresa?.nome}</span>
          <span>🟢 Online</span>
          <Relogio />
          <button className="btn-sair" onClick={logout}>🚪 Sair</button>
        </div>
      </header>

      <div className="main-layout">
        <aside className={`sidebar ${menuAberto ? "aberto" : ""}`}>
          <nav className="menu">
            {itens.map((m) => (
              <a key={m.id} href={`#${m.id}`}
                className={`menu-item ${pagina === m.id ? "ativo" : ""}`}
                onClick={(e) => { e.preventDefault(); setPagina(m.id); setMenuAberto(false); }}>
                <span className="icon">{m.icon}</span><span>{m.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <main className="content">
          <ModuleGate modulo={atual.modulo}>{atual.comp}</ModuleGate>
        </main>
      </div>

      <button className="menu-toggle" onClick={() => setMenuAberto(!menuAberto)}>☰</button>
    </div>
  );
}
