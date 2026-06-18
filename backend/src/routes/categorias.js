import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requirePermissao, empresaId } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// GET /api/categorias
router.get("/", requireAuth, async (req, res) => {
  const r = await query(
    "SELECT id, nome, cor, icone, ordem FROM categorias WHERE empresa_id = $1 AND ativo = TRUE ORDER BY ordem, nome",
    [empresaId(req)]
  );
  res.json(r.rows);
});

// POST /api/categorias
router.post("/", requireAuth, requirePermissao("categorias.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { nome, cor, icone, ordem } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  const r = await query(
    `INSERT INTO categorias (empresa_id, nome, cor, icone, ordem) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [eid, nome, cor || "#6366f1", icone || "🏷️", ordem || 100]
  );
  const cat = r.rows[0];
  await registrarAuditoria(req.usuario.id, eid, "CREATE", "categorias", cat.id, `Criou categoria ${nome}`, null, cat);
  res.status(201).json(cat);
});

// PUT /api/categorias/:id
router.put("/:id", requireAuth, requirePermissao("categorias.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { nome, cor, icone, ordem } = req.body;
  const antes = await query("SELECT * FROM categorias WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
  if (antes.rowCount === 0) return res.status(404).json({ error: "Categoria não encontrada" });
  const r = await query(
    `UPDATE categorias SET nome=$1, cor=$2, icone=$3, ordem=$4 WHERE id=$5 AND empresa_id=$6 RETURNING *`,
    [nome, cor || "#6366f1", icone || "🏷️", ordem || 100, req.params.id, eid]
  );
  await registrarAuditoria(req.usuario.id, eid, "UPDATE", "categorias", req.params.id, `Editou categoria`, antes.rows[0], r.rows[0]);
  res.json(r.rows[0]);
});

// DELETE /api/categorias/:id (soft)
router.delete("/:id", requireAuth, requirePermissao("categorias.editar"), async (req, res) => {
  const eid = empresaId(req);
  const antes = await query("SELECT * FROM categorias WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
  if (antes.rowCount === 0) return res.status(404).json({ error: "Categoria não encontrada" });
  await query("UPDATE categorias SET ativo = FALSE WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
  await registrarAuditoria(req.usuario.id, eid, "DELETE", "categorias", req.params.id, `Inativou categoria ${antes.rows[0].nome}`, antes.rows[0], null);
  res.json({ ok: true });
});

export default router;
