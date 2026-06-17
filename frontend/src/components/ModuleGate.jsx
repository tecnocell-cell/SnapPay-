// Bloqueia uma página se o módulo dela não estiver ativo para a empresa.
import { useModules } from "../lib/modules";

export function ModuleGate({ modulo, children }) {
  const { isAtivo, carregando } = useModules();
  if (carregando) return <div className="gate-msg">Carregando módulos…</div>;
  if (modulo && !isAtivo(modulo)) {
    return (
      <div className="gate-msg">
        <div className="gate-icon">🧩</div>
        <h3>Módulo não habilitado</h3>
        <p>Este módulo (<code>{modulo}</code>) não está ativo para a sua empresa.</p>
        <small>Ative em <strong>Módulos</strong> (requer permissão de administrador).</small>
      </div>
    );
  }
  return children;
}
