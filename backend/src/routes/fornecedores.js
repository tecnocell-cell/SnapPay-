import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, empresaId } from "../auth.js";

const router = Router();

// GET /api/fornecedores
router.get("/", requireAuth, async (req, res) => {
  const { q } = req.query;
  const params = [empresaId(req)];
  let sql =
    `SELECT id, nome, cnpj, email, telefone, endereco, observacoes, ativo, criado_em
     FROM fornecedores WHERE ativo = TRUE AND empresa_id = $1`;
  if (q) {
    params.push(`%${q}%`, q);
    sql += ` AND (nome ILIKE $${params.length - 1} OR cnpj = $${params.length})`;
  }
  sql += " ORDER BY nome";
  const result = await query(sql, params);
  res.json(result.rows);
});

// GET /api/fornecedores/:id
router.get("/:id", requireAuth, async (req, res) => {
  const result = await query(
    `SELECT * FROM fornecedores WHERE id = $1 AND empresa_id = $2`,
    [req.params.id, empresaId(req)]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Fornecedor não encontrado" });
  res.json(result.rows[0]);
});

// POST /api/fornecedores
router.post("/", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const { nome, cnpj, email, telefone, endereco, observacoes } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

  try {
    const result = await query(
      `INSERT INTO fornecedores (nome, cnpj, email, telefone, endereco, observacoes, empresa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, cnpj || null, email || null, telefone || null, endereco || null, observacoes || null, eid]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "CNPJ já cadastrado" });
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar fornecedor" });
  }
});

// PUT /api/fornecedores/:id
router.put("/:id", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const { nome, cnpj, email, telefone, endereco, observacoes } = req.body;
  const result = await query(
    `UPDATE fornecedores SET nome = $1, cnpj = $2, email = $3, telefone = $4, endereco = $5, observacoes = $6
     WHERE id = $7 AND empresa_id = $8 RETURNING *`,
    [nome, cnpj || null, email || null, telefone || null, endereco || null, observacoes || null, req.params.id, eid]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Fornecedor não encontrado" });
  res.json(result.rows[0]);
});

// DELETE /api/fornecedores/:id
router.delete("/:id", requireAuth, async (req, res) => {
  await query(
    `UPDATE fornecedores SET ativo = FALSE WHERE id = $1 AND empresa_id = $2`,
    [req.params.id, empresaId(req)]
  );
  res.json({ ok: true });
});

export default router;
