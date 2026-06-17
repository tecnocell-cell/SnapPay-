import express from "express";
import { query } from "../db.js";
import { empresaId } from "../auth.js";

const router = express.Router();

// GET /marcas - Lista de marcas
router.get("/", async (req, res) => {
  try {
    const eid = empresaId(req);
    const marcas = await query("SELECT * FROM marcas WHERE empresa_id = $1 AND ativo = TRUE ORDER BY nome", [eid]);
    res.json(marcas.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /marcas - Criar marca
router.post("/", async (req, res) => {
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

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /marcas/:id - Atualizar marca
router.put("/:id", async (req, res) => {
  try {
    const eid = empresaId(req);
    const { nome, descricao } = req.body;

    const result = await query(
      "UPDATE marcas SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao) WHERE id = $3 AND empresa_id = $4 RETURNING *",
      [nome, descricao, req.params.id, eid]
    );

    if (!result.rows.length) return res.status(404).json({ error: "Marca não encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /marcas/:id - Inativar marca
router.delete("/:id", async (req, res) => {
  try {
    const eid = empresaId(req);
    await query("UPDATE marcas SET ativo = FALSE WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
