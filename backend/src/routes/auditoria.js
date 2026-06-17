import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, empresaId } from "../auth.js";

const router = Router();

// GET /api/auditoria
router.get("/", requireAuth, async (req, res) => {
  const { tipo, usuario_id, limite } = req.query;
  const eid = empresaId(req);
  const limit = Math.min(parseInt(limite) || 100, 500);

  let sql =
    `SELECT id, usuario_id, u.nome as usuario_nome, tipo, tabela, registro_id, acao, dados_anteriores, dados_novos, criado_em
     FROM auditoria a JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.empresa_id = $1`;
  const params = [eid];

  if (tipo) {
    params.push(tipo);
    sql += ` AND tipo = $${params.length}`;
  }

  if (usuario_id) {
    params.push(usuario_id);
    sql += ` AND usuario_id = $${params.length}`;
  }

  sql += ` ORDER BY a.criado_em DESC LIMIT ${limit}`;

  const result = await query(sql, params);
  res.json(result.rows);
});

// GET /api/auditoria/:id
router.get("/:id", requireAuth, async (req, res) => {
  const result = await query(
    `SELECT * FROM auditoria WHERE id = $1 AND empresa_id = $2`,
    [req.params.id, empresaId(req)]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: "Registro de auditoria não encontrado" });
  res.json(result.rows[0]);
});

// Helper para registrar auditoria
export async function registrarAuditoria(usuarioId, empresaId, tipo, tabela, registroId, acao, dadosAnteriores = null, dadosNovos = null) {
  try {
    await query(
      `INSERT INTO auditoria (usuario_id, empresa_id, tipo, tabela, registro_id, acao, dados_anteriores, dados_novos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [usuarioId, empresaId, tipo, tabela, registroId, acao, JSON.stringify(dadosAnteriores), JSON.stringify(dadosNovos)]
    );
  } catch (err) {
    console.error("Erro ao registrar auditoria:", err);
  }
}

export default router;
