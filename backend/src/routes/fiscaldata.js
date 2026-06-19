// Endpoints de consulta para dados fiscais (NCM, CFOP, CEST)
// Suporta busca por código e descrição

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requirePermissao } from "../auth.js";

const router = Router();

// ========== NCM (Nomenclatura Comum do Mercosul) ==========

router.get("/ncm", requireAuth, async (req, res) => {
  try {
    const { codigo, descricao, limit = 50 } = req.query;
    let sql = "SELECT codigo, descricao, aliquota_icms_padrao FROM ncm WHERE ativo = true";
    const params = [];

    if (codigo) {
      params.push(`${codigo}%`);
      sql += ` AND codigo LIKE $${params.length}`;
    }
    if (descricao) {
      params.push(`%${descricao}%`);
      sql += ` AND descricao ILIKE $${params.length}`;
    }

    sql += ` ORDER BY codigo LIMIT ${Math.min(parseInt(limit) || 50, 500)}`;

    const result = await query(sql, params);
    res.json({
      total: result.rows.length,
      ncms: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ncm/:codigo", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM ncm WHERE codigo = $1 AND ativo = true",
      [req.params.codigo]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "NCM não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CFOP (Código Fiscal de Operações) ==========

router.get("/cfop", requireAuth, async (req, res) => {
  try {
    const { codigo, descricao, tipo, limit = 50 } = req.query;
    let sql = "SELECT codigo, descricao, tipo, aliquota_icms_padrao FROM cfop WHERE ativo = true";
    const params = [];

    if (codigo) {
      params.push(`${codigo}%`);
      sql += ` AND codigo LIKE $${params.length}`;
    }
    if (descricao) {
      params.push(`%${descricao}%`);
      sql += ` AND descricao ILIKE $${params.length}`;
    }
    if (tipo) {
      params.push(tipo);
      sql += ` AND tipo = $${params.length}`;
    }

    sql += ` ORDER BY codigo LIMIT ${Math.min(parseInt(limit) || 50, 500)}`;

    const result = await query(sql, params);
    res.json({
      total: result.rows.length,
      cfops: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/cfop/:codigo", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM cfop WHERE codigo = $1 AND ativo = true",
      [req.params.codigo]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "CFOP não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CEST (Código Especificador da Substituição Tributária) ==========

router.get("/cest", requireAuth, async (req, res) => {
  try {
    const { codigo, descricao, limit = 50 } = req.query;
    let sql = "SELECT codigo, descricao, ncm_codigo FROM cest WHERE ativo = true";
    const params = [];

    if (codigo) {
      params.push(`${codigo}%`);
      sql += ` AND codigo LIKE $${params.length}`;
    }
    if (descricao) {
      params.push(`%${descricao}%`);
      sql += ` AND descricao ILIKE $${params.length}`;
    }

    sql += ` ORDER BY codigo LIMIT ${Math.min(parseInt(limit) || 50, 500)}`;

    const result = await query(sql, params);
    res.json({
      total: result.rows.length,
      cests: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/cest/:codigo", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM cest WHERE codigo = $1 AND ativo = true",
      [req.params.codigo]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "CEST não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== IMPORTAÇÃO (Estrutura para futuro) ==========

// POST /api/fiscal-data/ncm/importar — Importa NCM a partir de CSV
router.post("/ncm/importar", requireAuth, requirePermissao("fiscal.configurar"), async (req, res) => {
  try {
    const { dados } = req.body;
    if (!Array.isArray(dados) || dados.length === 0) {
      return res.status(400).json({ error: "Enviar array de { codigo, descricao, aliquota_icms_padrao }" });
    }

    // TODO: Implementar importação real (validar duplicatas, inserir em transação)
    return res.status(501).json({
      error: "Importação de NCM ainda não implementada",
      info: "Preparada para receber array de objetos NCM",
      exemplo: { codigo: "10061000", descricao: "Carne de bovino", aliquota_icms_padrao: 18.0 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fiscal-data/cfop/importar
router.post("/cfop/importar", requireAuth, requirePermissao("fiscal.configurar"), async (req, res) => {
  try {
    const { dados } = req.body;
    if (!Array.isArray(dados) || dados.length === 0) {
      return res.status(400).json({ error: "Enviar array de { codigo, descricao, tipo }" });
    }

    // TODO: Implementar importação real
    return res.status(501).json({
      error: "Importação de CFOP ainda não implementada",
      info: "Preparada para receber array de objetos CFOP",
      exemplo: { codigo: "5101", descricao: "Venda de produção", tipo: "VENDA" },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fiscal-data/cest/importar
router.post("/cest/importar", requireAuth, requirePermissao("fiscal.configurar"), async (req, res) => {
  try {
    const { dados } = req.body;
    if (!Array.isArray(dados) || dados.length === 0) {
      return res.status(400).json({ error: "Enviar array de { codigo, descricao, ncm_codigo }" });
    }

    // TODO: Implementar importação real
    return res.status(501).json({
      error: "Importação de CEST ainda não implementada",
      info: "Preparada para receber array de objetos CEST",
      exemplo: { codigo: "0100100", descricao: "Combustíveis e lubrificantes", ncm_codigo: "27101910" },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
