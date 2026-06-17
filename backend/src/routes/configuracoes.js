import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, empresaId } from "../auth.js";

const router = Router();

// GET /api/configuracoes
router.get("/", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const result = await query(
    `SELECT * FROM configuracoes WHERE empresa_id = $1`,
    [eid]
  );

  if (result.rowCount === 0) {
    return res.json({
      icms: 12,
      pis: 1.65,
      cofins: 7.6,
      ipi: 0,
      tipo_nf: "NFCe",
      aliquota_principal: 12,
      empresa_id: eid,
    });
  }

  res.json(result.rows[0]);
});

// PUT /api/configuracoes
router.put("/", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const { icms, pis, cofins, ipi, tipo_nf, aliquota_principal } = req.body;

  const existe = await query(
    `SELECT id FROM configuracoes WHERE empresa_id = $1`,
    [eid]
  );

  if (existe.rowCount === 0) {
    const result = await query(
      `INSERT INTO configuracoes (empresa_id, icms, pis, cofins, ipi, tipo_nf, aliquota_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [eid, icms, pis, cofins, ipi || 0, tipo_nf || "NFCe", aliquota_principal || icms]
    );
    return res.json(result.rows[0]);
  }

  const result = await query(
    `UPDATE configuracoes SET icms = $1, pis = $2, cofins = $3, ipi = $4, tipo_nf = $5, aliquota_principal = $6
     WHERE empresa_id = $7 RETURNING *`,
    [icms, pis, cofins, ipi || 0, tipo_nf || "NFCe", aliquota_principal || icms, eid]
  );

  res.json(result.rows[0]);
});

export default router;
