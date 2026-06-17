import express from "express";
import { query, pool, empresaId } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const eid = empresaId(req);
    const invs = await query("SELECT * FROM inventarios WHERE empresa_id = $1 ORDER BY data_inicio DESC", [eid]);
    res.json(invs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const eid = empresaId(req);
    const {nome, observacao} = req.body;
    const result = await query(
      `INSERT INTO inventarios (empresa_id, nome, observacao, usuario_id, criado_em)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [eid, nome, observacao, req.usuario?.id]
    );
    res.json(result[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/fechar", async (req, res) => {
  try {
    const client = await pool.connect();
    const eid = empresaId(req);

    await client.query("BEGIN");

    const inv = await client.query("SELECT * FROM inventarios WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!inv.rowCount) throw { msg: "Inventário não encontrado" };

    const itens = await client.query("SELECT * FROM inventario_itens WHERE inventario_id = $1", [req.params.id]);

    for (const item of itens.rows) {
      const dif = item.diferenca;
      if (Math.abs(dif) > 0) {
        await client.query(
          `UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2`,
          [dif, item.produto_id]
        );
        await client.query(
          `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, origem, origem_id)
           VALUES ($1, 'INVENTARIO', $2, $3, $4, 'INVENTARIO', $5)`,
          [item.produto_id, Math.abs(dif), item.motivo_ajuste, eid, req.params.id]
        );
      }
    }

    await client.query("UPDATE inventarios SET status='FECHADO', data_fim=NOW() WHERE id=$1", [req.params.id]);
    await client.query("COMMIT");

    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message || err.msg });
  } finally {
    client.release();
  }
});

export default router;
