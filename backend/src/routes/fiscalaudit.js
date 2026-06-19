// Endpoints de auditoria fiscal — listagem e relatórios de mudanças

import { Router } from "express";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import FiscalAuditService from "../services/fiscalAuditService.js";

const router = Router();

// Listar mudanças fiscais da empresa
router.get("/", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const { produto_id, usuario_id, tipo_mudanca, dias = 90, limit = 100 } = req.query;

    const resultados = await FiscalAuditService.listarAuditoriaFiscal(eid, {
      produto_id: produto_id ? Number(produto_id) : null,
      usuario_id: usuario_id ? Number(usuario_id) : null,
      tipo_mudanca,
      dias: Number(dias),
      limit: Number(limit),
    });

    res.json({
      total: resultados.length,
      dias,
      auditoria: resultados,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Relatório de mudanças em alíquota de um produto
router.get("/produto/:produtoId/aliquota", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const produtoId = Number(req.params.produtoId);

    const historico = await FiscalAuditService.gerarRelatoriAliquotasPorProduto(
      eid,
      produtoId
    );

    res.json({
      produto_id: produtoId,
      total_mudancas: historico.length,
      historico,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detectar anomalias (redução de alíquota suspeita)
router.get("/anomalias", requireAuth, requirePermissao("fiscal.auditar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { dias = 7 } = req.query;

    const anomalias = await FiscalAuditService.detectarAnomaliasAliquota(eid, Number(dias));

    res.json({
      dias: Number(dias),
      total_anomalias: anomalias.length,
      anomalias,
      aviso: anomalias.length > 0 ? "⚠️ Redução de alíquota detectada — revisar" : "✓ Nenhuma anomalia",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
