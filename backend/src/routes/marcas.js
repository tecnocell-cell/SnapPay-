import express from "express";
import { query } from "../db.js";
import { empresaId, requirePermissao, requireAuth } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = express.Router();

// GET /marcas - Lista de marcas
router.get("/", requireAuth, requirePermissao("produtos.ver"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const marcas = await query("SELECT * FROM marcas WHERE empresa_id = $1 AND ativo = TRUE ORDER BY nome", [eid]);
    res.json(marcas.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /marcas - Criar marca
router.post("/", requireAuth, requirePermissao("produtos.editar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { nome, descricao } = req.body;

    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

    const existing = await query("SELECT id FROM marcas WHERE nome = $1 AND empresa_id = $2", [nome, eid]);
    if (existing.rows.length) return res.status(400).json({ error: "Marca já existe" });

    const result = await query(
      "INSERT INTO marcas (empresa_id, nome, descricao, ativo, criado_em) VALUES ($1, $2, $3, TRUE, NOW()) RETURNING *",
      [eid, nome, descricao]
    );

    const marca = result.rows[0];
    await registrarAuditoria(req.usuario.id, eid, "CREATE", "marcas", marca.id, `Criou marca ${nome}`, null, marca);
    res.json(marca);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /marcas/:id - Atualizar marca
router.put("/:id", requireAuth, requirePermissao("produtos.editar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { nome, descricao } = req.body;

    const antes = await query("SELECT * FROM marcas WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
    if (antes.rowCount === 0) return res.status(404).json({ error: "Marca não encontrada" });

    const result = await query(
      "UPDATE marcas SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao) WHERE id = $3 AND empresa_id = $4 RETURNING *",
      [nome, descricao, req.params.id, eid]
    );

    await registrarAuditoria(req.usuario.id, eid, "UPDATE", "marcas", req.params.id, `Editou marca`, antes.rows[0], result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /marcas/:id - Inativar marca
router.delete("/:id", requireAuth, requirePermissao("produtos.editar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const antes = await query("SELECT * FROM marcas WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
    if (antes.rowCount === 0) return res.status(404).json({ error: "Marca não encontrada" });

    await query("UPDATE marcas SET ativo = FALSE WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    await registrarAuditoria(req.usuario.id, eid, "DELETE", "marcas", req.params.id, `Inativou marca ${antes.rows[0].nome}`, antes.rows[0], null);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
