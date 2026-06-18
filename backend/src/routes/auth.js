import { Router } from "express";
import { query } from "../db.js";
import {
  assinarToken, verificarSenha, buscarUsuarioPorEmail,
  permissoesDoUsuario, requireAuth, empresaId, autorizarGerente,
} from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// POST /api/auth/autorizar-operacao — liberação por supervisor (ADMIN/GERENTE).
// body: { operacao, senha, motivo }. Usado p/ operações sensíveis (cancelar venda).
router.post("/autorizar-operacao", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const { operacao, senha, motivo } = req.body || {};
  if (!operacao) return res.status(400).json({ error: "Informe a operação" });
  if (!motivo || !motivo.trim()) return res.status(400).json({ error: "Motivo é obrigatório" });
  if (!senha) return res.status(400).json({ error: "Senha do gerente/administrador é obrigatória" });

  const autorizador = await autorizarGerente(eid, senha);
  if (!autorizador) {
    await registrarAuditoria(req.usuario.id, eid, "AUTORIZACAO_NEGADA", operacao, null,
      `Tentativa de ${operacao} sem autorização válida (operador ${req.usuario.id})`, null, { operacao, motivo });
    return res.status(403).json({ error: "Senha inválida ou usuário sem permissão (apenas ADMIN/GERENTE)" });
  }
  await registrarAuditoria(req.usuario.id, eid, "AUTORIZACAO", operacao, autorizador.id,
    `Operação ${operacao} autorizada por ${autorizador.nome} (${autorizador.papel}). Motivo: ${motivo}`, null,
    { operacao, operador_id: req.usuario.id, autorizador_id: autorizador.id, autorizador_nome: autorizador.nome, motivo });
  res.json({ ok: true, autorizador: { id: autorizador.id, nome: autorizador.nome, papel: autorizador.papel } });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "Informe e-mail e senha" });
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario || !usuario.ativo) return res.status(401).json({ error: "Credenciais inválidas" });
  const ok = await verificarSenha(senha, usuario.senha_hash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = assinarToken({ id: usuario.id, empresa_id: usuario.empresa_id, papel_chave: usuario.papel_chave });
  await registrarAuditoria(usuario.id, usuario.empresa_id, "LOGIN", "usuarios", usuario.id, `Login de ${usuario.email}`, null, null);
  const permissoes = await permissoesDoUsuario(usuario.id);
  const empresa = await query("SELECT id, nome, segmento FROM empresas WHERE id = $1", [usuario.empresa_id]);
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel_chave, papelNome: usuario.papel_nome },
    empresa: empresa.rows[0],
    permissoes,
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const u = await query(
    `SELECT u.id, u.nome, u.email, p.chave AS papel, p.nome AS papel_nome, e.id AS empresa_id, e.nome AS empresa_nome, e.segmento
     FROM usuarios u JOIN papeis p ON p.id = u.papel_id JOIN empresas e ON e.id = u.empresa_id WHERE u.id = $1`,
    [req.usuario.id]
  );
  if (u.rowCount === 0) return res.status(404).json({ error: "Usuário não encontrado" });
  const permissoes = await permissoesDoUsuario(req.usuario.id);
  const row = u.rows[0];
  res.json({
    usuario: { id: row.id, nome: row.nome, email: row.email, papel: row.papel, papelNome: row.papel_nome },
    empresa: { id: row.empresa_id, nome: row.empresa_nome, segmento: row.segmento },
    permissoes,
  });
});

export default router;
