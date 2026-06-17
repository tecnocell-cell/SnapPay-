import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requirePermissao, empresaId } from "../auth.js";

const router = Router();

// GET /api/modulos — catálogo + status (ativo) para a empresa do usuário
router.get("/", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const r = await query(
    `SELECT m.chave, m.nome, m.nucleo, m.ordem,
            COALESCE(em.ativo, m.nucleo) AS ativo
     FROM modulos m
     LEFT JOIN empresa_modulos em ON em.modulo_key = m.chave AND em.empresa_id = $1
     ORDER BY m.ordem`,
    [eid]
  );
  res.json(r.rows);
});

// PUT /api/modulos/:chave — ativa/desativa módulo (núcleo não pode desativar)
router.put("/:chave", requireAuth, requirePermissao("modulos.gerenciar"), async (req, res) => {
  const eid = empresaId(req);
  const { ativo } = req.body;
  const mod = await query("SELECT nucleo FROM modulos WHERE chave = $1", [req.params.chave]);
  if (mod.rowCount === 0) return res.status(404).json({ error: "Módulo não encontrado" });
  if (mod.rows[0].nucleo && ativo === false)
    return res.status(400).json({ error: "Módulo de núcleo não pode ser desativado" });

  await query(
    `INSERT INTO empresa_modulos (empresa_id, modulo_key, ativo) VALUES ($1, $2, $3)
     ON CONFLICT (empresa_id, modulo_key) DO UPDATE SET ativo = EXCLUDED.ativo`,
    [eid, req.params.chave, ativo !== false]
  );
  res.json({ ok: true, chave: req.params.chave, ativo: ativo !== false });
});

export default router;
