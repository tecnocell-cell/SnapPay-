import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// GET /api/configuracoes
router.get("/", requireAuth, requirePermissao("config.editar"), async (req, res) => {
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
router.put("/", requireAuth, requirePermissao("config.editar"), async (req, res) => {
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
    await registrarAuditoria(req.usuario.id, eid, "CREATE", "configuracoes", result.rows[0].id, "Criou configurações fiscais", null, result.rows[0]);
    return res.json(result.rows[0]);
  }

  const result = await query(
    `UPDATE configuracoes SET icms = $1, pis = $2, cofins = $3, ipi = $4, tipo_nf = $5, aliquota_principal = $6
     WHERE empresa_id = $7 RETURNING *`,
    [icms, pis, cofins, ipi || 0, tipo_nf || "NFCe", aliquota_principal || icms, eid]
  );

  await registrarAuditoria(req.usuario.id, eid, "UPDATE", "configuracoes", result.rows[0].id, "Atualizou configurações fiscais", null, result.rows[0]);
  res.json(result.rows[0]);
});

export default router;
