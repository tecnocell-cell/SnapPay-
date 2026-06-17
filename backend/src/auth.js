// Auth + RBAC do SnapPay (JWT + bcrypt). Implementação própria — sem cópia de terceiros.
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "snappay-dev-secret-troque-em-producao";
const JWT_EXPIRES = "12h";

export function assinarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, empresa_id: usuario.empresa_id, papel: usuario.papel_chave },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export async function verificarSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}

// Carrega usuário + papel + permissões pelo e-mail
export async function buscarUsuarioPorEmail(email) {
  const r = await query(
    `SELECT u.id, u.empresa_id, u.nome, u.email, u.senha_hash, u.ativo,
            p.chave AS papel_chave, p.nome AS papel_nome
     FROM usuarios u JOIN papeis p ON p.id = u.papel_id
     WHERE u.email = $1`,
    [email]
  );
  return r.rows[0] || null;
}

export async function permissoesDoUsuario(usuarioId) {
  const r = await query(
    `SELECT perm.chave FROM usuarios u
       JOIN papel_permissao pp ON pp.papel_id = u.papel_id
       JOIN permissoes perm ON perm.id = pp.permissao_id
     WHERE u.id = $1`,
    [usuarioId]
  );
  return r.rows.map((x) => x.chave);
}

// Middleware: exige token válido. Popula req.usuario = { id, empresa_id, papel }.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = { id: payload.sub, empresa_id: payload.empresa_id, papel: payload.papel };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// Middleware: exige uma permissão específica.
export function requirePermissao(chave) {
  return async (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: "Não autenticado" });
    const perms = await permissoesDoUsuario(req.usuario.id);
    if (!perms.includes(chave)) return res.status(403).json({ error: "Sem permissão: " + chave });
    next();
  };
}

// Helper: empresa do usuário autenticado (escopo multiempresa).
export function empresaId(req) {
  return req.usuario?.empresa_id || 1;
}
