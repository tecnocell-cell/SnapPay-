import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth, empresaId } from "../auth.js";

const router = Router();

// GET /api/compras
router.get("/", requireAuth, async (req, res) => {
  const { status } = req.query;
  const eid = empresaId(req);
  let sql =
    `SELECT id, fornecedor_id, f.nome AS fornecedor_nome, status, valor_total, criado_em
     FROM compras c JOIN fornecedores f ON f.id = c.fornecedor_id
     WHERE c.empresa_id = $1`;
  const params = [eid];

  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }
  sql += " ORDER BY c.criado_em DESC";

  const result = await query(sql, params);
  res.json(result.rows);
});

// GET /api/compras/:id (com itens)
router.get("/:id", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const compra = await query(
    `SELECT * FROM compras WHERE id = $1 AND empresa_id = $2`,
    [req.params.id, eid]
  );
  if (compra.rowCount === 0) return res.status(404).json({ error: "Compra não encontrada" });

  const itens = await query(
    `SELECT ci.id, ci.produto_id, p.nome, p.codigo, ci.quantidade, ci.preco_unitario, ci.valor_total
     FROM compra_itens ci JOIN produtos p ON p.id = ci.produto_id
     WHERE ci.compra_id = $1`,
    [req.params.id]
  );

  res.json({ compra: compra.rows[0], itens: itens.rows });
});

// POST /api/compras
router.post("/", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const { fornecedorId, itens, observacoes } = req.body;

  if (!fornecedorId || !itens || itens.length === 0) {
    return res.status(400).json({ error: "Fornecedor e itens são obrigatórios" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let valorTotal = 0;
    for (const item of itens) {
      valorTotal += item.quantidade * item.preco_unitario;
    }

    const compraResult = await client.query(
      `INSERT INTO compras (fornecedor_id, status, valor_total, observacoes, empresa_id)
       VALUES ($1, 'PENDENTE', $2, $3, $4) RETURNING id`,
      [fornecedorId, valorTotal, observacoes || null, eid]
    );
    const compraId = compraResult.rows[0].id;

    for (const item of itens) {
      const itemTotal = item.quantidade * item.preco_unitario;
      await client.query(
        `INSERT INTO compra_itens (compra_id, produto_id, quantidade, preco_unitario, valor_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [compraId, item.produtoId, item.quantidade, item.preco_unitario, itemTotal]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ id: compraId, valor_total: valorTotal });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar compra" });
  } finally {
    client.release();
  }
});

// PUT /api/compras/:id/receber (marcar como recebida e adicionar ao estoque)
router.put("/:id/receber", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const compra = await client.query(
      `SELECT status FROM compras WHERE id = $1 AND empresa_id = $2`,
      [req.params.id, eid]
    );
    if (compra.rowCount === 0) throw { status: 404, msg: "Compra não encontrada" };
    if (compra.rows[0].status === "RECEBIDA") throw { status: 400, msg: "Compra já foi recebida" };

    const itens = await client.query(
      `SELECT produto_id, quantidade FROM compra_itens WHERE compra_id = $1`,
      [req.params.id]
    );

    for (const item of itens.rows) {
      await client.query(
        `UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2`,
        [item.quantidade, item.produto_id]
      );
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao)
         VALUES ($1, 'ENTRADA', $2, $3)`,
        [item.produto_id, item.quantidade, `Compra #${req.params.id}`]
      );
    }

    await client.query(
      `UPDATE compras SET status = 'RECEBIDA' WHERE id = $1`,
      [req.params.id]
    );

    await client.query("COMMIT");
    res.json({ ok: true, msg: "Compra marcada como recebida e estoque atualizado" });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: "Erro ao receber compra" });
  } finally {
    client.release();
  }
});

// DELETE /api/compras/:id (cancelar compra)
router.delete("/:id", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const compra = await query(
    `SELECT status FROM compras WHERE id = $1 AND empresa_id = $2`,
    [req.params.id, eid]
  );
  if (compra.rowCount === 0) return res.status(404).json({ error: "Compra não encontrada" });
  if (compra.rows[0].status === "RECEBIDA") {
    return res.status(400).json({ error: "Não é possível cancelar compra já recebida" });
  }

  await query(`UPDATE compras SET status = 'CANCELADA' WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

export default router;
