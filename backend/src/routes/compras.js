import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// GET /api/compras - Lista com filtros
router.get("/", requireAuth, requirePermissao("compras.gerenciar"), async (req, res) => {
  try {
    const { status } = req.query;
    const eid = empresaId(req);
    let sql = `
      SELECT c.id, c.fornecedor_id, f.nome AS fornecedor_nome, c.numero_documento,
             c.status, c.valor_total, c.frete, c.desconto, c.data_compra, c.data_recebimento,
             c.data_vencimento, c.condicao_pagamento, c.criado_em
      FROM compras c
      JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE c.empresa_id = $1`;
    const params = [eid];

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }
    sql += " ORDER BY c.criado_em DESC";

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/compras/:id - Detalhes com itens
router.get("/:id", requireAuth, requirePermissao("compras.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const compra = await query(
      `SELECT * FROM compras WHERE id = $1 AND empresa_id = $2`,
      [req.params.id, eid]
    );
    if (compra.rowCount === 0) return res.status(404).json({ error: "Compra não encontrada" });

    const itens = await query(
      `SELECT ci.id, ci.produto_id, p.nome, p.codigo, ci.quantidade, ci.preco_unitario, ci.valor_total
       FROM compra_itens ci
       JOIN produtos p ON p.id = ci.produto_id
       WHERE ci.compra_id = $1`,
      [req.params.id]
    );

    res.json({ compra: compra.rows[0], itens: itens.rows });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/compras - Criar nova compra
router.post("/", requireAuth, requirePermissao("compras.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const {
      fornecedorId, itens, observacoes, numero_documento,
      data_compra, data_vencimento, condicao_pagamento, frete, desconto, acrescimo
    } = req.body;

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

      // Aplicar frete, desconto e acréscimo
      const valorFinal = valorTotal + (frete || 0) + (acrescimo || 0) - (desconto || 0);

      const compraResult = await client.query(
        `INSERT INTO compras (
          fornecedor_id, status, valor_total, observacoes, numero_documento,
          data_compra, data_vencimento, condicao_pagamento, frete, desconto, acrescimo,
          empresa_id, atualizado_em
        ) VALUES ($1, 'PENDENTE', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING id`,
        [fornecedorId, valorFinal, observacoes || null, numero_documento,
          data_compra || new Date().toISOString().split('T')[0],
          data_vencimento, condicao_pagamento || 'A_VISTA',
          frete || 0, desconto || 0, acrescimo || 0, eid]
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
      await registrarAuditoria(req.usuario.id, eid, "CREATE", "compras", compraId,
        `Criou compra #${compraId} (R$ ${valorFinal})`, null, { id: compraId, valor_total: valorFinal });
      res.status(201).json({ id: compraId, valor_total: valorFinal });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao salvar compra" });
  }
});

// PUT /api/compras/:id - Atualizar dados da compra
router.put("/:id", requireAuth, requirePermissao("compras.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { data_vencimento, condicao_pagamento, frete, desconto, acrescimo, observacoes } = req.body;

    const result = await query(
      `UPDATE compras SET
        data_vencimento = COALESCE($1, data_vencimento),
        condicao_pagamento = COALESCE($2, condicao_pagamento),
        frete = COALESCE($3, frete),
        desconto = COALESCE($4, desconto),
        acrescimo = COALESCE($5, acrescimo),
        observacoes = COALESCE($6, observacoes),
        atualizado_em = NOW()
      WHERE id = $7 AND empresa_id = $8
      RETURNING *`,
      [data_vencimento, condicao_pagamento, frete, desconto, acrescimo, observacoes, req.params.id, eid]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Compra não encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/compras/:id/receber - Marcar como recebida + criar conta a pagar
router.put("/:id/receber", requireAuth, requirePermissao("compras.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const compra = await client.query(
        `SELECT * FROM compras WHERE id = $1 AND empresa_id = $2`,
        [req.params.id, eid]
      );
      if (compra.rowCount === 0) throw { status: 404, msg: "Compra não encontrada" };
      if (compra.rows[0].status === "RECEBIDA") throw { status: 400, msg: "Compra já foi recebida" };

      const compraData = compra.rows[0];

      // 1. Atualizar estoque
      const itens = await client.query(
        `SELECT produto_id, quantidade FROM compra_itens WHERE compra_id = $1`,
        [req.params.id]
      );

      for (const item of itens.rows) {
        const prodAntes = await client.query(
          `SELECT estoque_atual FROM produtos WHERE id = $1`,
          [item.produto_id]
        );
        const saldoAntes = prodAntes.rows[0].estoque_atual;

        await client.query(
          `UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2`,
          [item.quantidade, item.produto_id]
        );

        const prodDepois = await client.query(
          `SELECT estoque_atual FROM produtos WHERE id = $1`,
          [item.produto_id]
        );
        const saldoDepois = prodDepois.rows[0].estoque_atual;

        // Registrar movimentação com saldos
        await client.query(
          `INSERT INTO estoque_movimentacao (
            produto_id, tipo, quantidade, observacao, empresa_id,
            saldo_anterior, saldo_posterior, origem, origem_id
          ) VALUES ($1, 'ENTRADA_COMPRA', $2, $3, $4, $5, $6, 'COMPRA', $7)`,
          [item.produto_id, item.quantidade, `Compra #${req.params.id}`, eid,
            saldoAntes, saldoDepois, req.params.id]
        );
      }

      // 2. Marcar como recebida
      await client.query(
        `UPDATE compras SET status = 'RECEBIDA', data_recebimento = NOW() WHERE id = $1`,
        [req.params.id]
      );

      // 3. Criar conta a pagar automaticamente
      const dataVencimento = compraData.data_vencimento ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await client.query(
        `INSERT INTO contas_pagar (
          empresa_id, fornecedor_id, compra_id, valor, data_vencimento, status, origem, criado_em
        ) VALUES ($1, $2, $3, $4, $5, 'PENDENTE', 'COMPRA', NOW())`,
        [eid, compraData.fornecedor_id, req.params.id, compraData.valor_total, dataVencimento]
      );

      await client.query("COMMIT");
      await registrarAuditoria(req.usuario.id, eid, "RECEBIMENTO", "compras", Number(req.params.id),
        `Recebeu compra #${req.params.id} (R$ ${compraData.valor_total}) e gerou conta a pagar`, null, null);
      res.json({
        ok: true,
        msg: "Compra recebida, estoque atualizado e conta a pagar criada automaticamente"
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao receber compra" });
  }
});

// DELETE /api/compras/:id - Cancelar compra
router.delete("/:id", requireAuth, requirePermissao("compras.gerenciar"), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
