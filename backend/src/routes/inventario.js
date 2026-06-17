import express from "express";
import { query, pool } from "../db.js";
import { empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = express.Router();

// GET /api/inventario - lista
router.get("/", requirePermissao("inventario.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const invs = await query("SELECT * FROM inventarios WHERE empresa_id = $1 ORDER BY data_inicio DESC", [eid]);
    res.json(invs.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/inventario/:id - detalhe + itens
router.get("/:id", requirePermissao("inventario.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const inv = await query("SELECT * FROM inventarios WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!inv.rowCount) return res.status(404).json({ error: "Inventário não encontrado" });
    const itens = await query(
      `SELECT ii.*, p.nome AS produto_nome, p.codigo
       FROM inventario_itens ii JOIN produtos p ON p.id = ii.produto_id
       WHERE ii.inventario_id = $1 ORDER BY p.nome`,
      [req.params.id]
    );
    res.json({ inventario: inv.rows[0], itens: itens.rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/inventario - criar
router.post("/", requirePermissao("inventario.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { nome, observacao } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome do inventário é obrigatório" });
    const result = await query(
      `INSERT INTO inventarios (empresa_id, nome, observacao, usuario_id, criado_em)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [eid, nome, observacao, req.usuario?.id]
    );
    await registrarAuditoria(req.usuario.id, eid, "CREATE", "inventarios", result.rows[0].id, `Criou inventário ${nome}`, null, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/inventario/:id/itens - registrar contagem de um produto
router.post("/:id/itens", requirePermissao("inventario.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { produto_id, quantidade_contada } = req.body;
    if (!produto_id || quantidade_contada === undefined || quantidade_contada === null) {
      return res.status(400).json({ error: "produto_id e quantidade_contada são obrigatórios" });
    }

    const inv = await query("SELECT status FROM inventarios WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!inv.rowCount) return res.status(404).json({ error: "Inventário não encontrado" });
    if (inv.rows[0].status === "FECHADO") return res.status(400).json({ error: "Inventário já fechado" });

    const prod = await query("SELECT estoque_atual FROM produtos WHERE id = $1 AND empresa_id = $2", [produto_id, eid]);
    if (!prod.rowCount) return res.status(404).json({ error: "Produto não encontrado" });

    const sistema = Number(prod.rows[0].estoque_atual);
    const contada = Number(quantidade_contada);
    const diferenca = contada - sistema;

    // upsert: se já existe item para o produto neste inventário, atualiza
    const existe = await query("SELECT id FROM inventario_itens WHERE inventario_id = $1 AND produto_id = $2", [req.params.id, produto_id]);
    let item;
    if (existe.rowCount) {
      item = await query(
        `UPDATE inventario_itens SET quantidade_sistema=$1, quantidade_contada=$2, diferenca=$3, usuario_contagem_id=$4
         WHERE id=$5 RETURNING *`,
        [sistema, contada, diferenca, req.usuario.id, existe.rows[0].id]
      );
    } else {
      item = await query(
        `INSERT INTO inventario_itens (inventario_id, produto_id, quantidade_sistema, quantidade_contada, diferenca, usuario_contagem_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.params.id, produto_id, sistema, contada, diferenca, req.usuario.id]
      );
    }
    res.json(item.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/inventario/:id/fechar - aplica ajustes
router.post("/:id/fechar", requirePermissao("inventario.gerenciar"), async (req, res) => {
  const client = await pool.connect();
  try {
    const eid = empresaId(req);
    await client.query("BEGIN");

    const inv = await client.query("SELECT * FROM inventarios WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!inv.rowCount) throw new Error("Inventário não encontrado");
    if (inv.rows[0].status === "FECHADO") throw new Error("Inventário já fechado");

    const itens = await client.query("SELECT * FROM inventario_itens WHERE inventario_id = $1", [req.params.id]);
    if (!itens.rowCount) throw new Error("Não é possível fechar inventário sem contagem de itens");

    let ajustes = 0;
    for (const item of itens.rows) {
      const dif = Number(item.diferenca);
      if (dif === 0) continue;

      const antesQ = await client.query("SELECT estoque_atual FROM produtos WHERE id = $1", [item.produto_id]);
      const saldoAntes = Number(antesQ.rows[0].estoque_atual);
      const saldoDepois = saldoAntes + dif;

      await client.query("UPDATE produtos SET estoque_atual = $1 WHERE id = $2", [saldoDepois, item.produto_id]);
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem, origem_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'INVENTARIO', $9)`,
        [item.produto_id, dif > 0 ? "AJUSTE_ENTRADA" : "AJUSTE_SAIDA", Math.abs(dif),
          item.motivo_ajuste || `Inventário #${req.params.id}`, eid, req.usuario.id, saldoAntes, saldoDepois, req.params.id]
      );
      ajustes++;
    }

    await client.query("UPDATE inventarios SET status='FECHADO', data_fim=NOW() WHERE id=$1", [req.params.id]);
    await client.query("COMMIT");

    await registrarAuditoria(req.usuario.id, eid, "INVENTARIO", "inventarios", Number(req.params.id),
      `Fechou inventário aplicando ${ajustes} ajuste(s) de estoque`, null, null);
    res.json({ ok: true, ajustes });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
