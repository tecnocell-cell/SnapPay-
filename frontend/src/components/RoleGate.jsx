// Bloqueia conteúdo se o usuário não tiver a permissão exigida.
import { useAuth } from "../lib/auth";

export function RoleGate({ perm, children, fallback = null }) {
  const { can } = useAuth();
  if (perm && !can(perm)) return fallback;
  return children;
}
