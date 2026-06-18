import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// GET /api/financeiro/pagar
router.get("/pagar", requireAuth, requirePermissao("financeiro.ver"), async (req, res) => {
  const { status } = req.query;
  const eid = empresaId(req);
  let sql =
    `SELECT cp.id, cp.fornecedor_id, f.nome AS fornecedor_nome, cp.compra_id, cp.valor,
            cp.data_vencimento, cp.status, cp.observacoes, cp.criado_em
     FROM contas_pagar cp JOIN fornecedores f ON f.id = cp.fornecedor_id
     WHERE cp.empresa_id = $1`;
  const params = [eid];

  if (status) {
    params.push(status);
    sql += ` AND cp.status = $${params.length}`;
  }
  sql += " ORDER BY cp.data_vencimento ASC";

  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/financeiro/receber
router.get("/receber", requireAuth, requirePermissao("financeiro.ver"), async (req, res) => {
  const { status } = req.query;
  const eid = empresaId(req);
  let sql =
    `SELECT cr.id, cr.cliente_id, c.nome AS cliente_nome, cr.venda_id, cr.valor,
            cr.data_vencimento, cr.status, cr.observacoes, cr.criado_em
     FROM contas_receber cr JOIN clientes c ON c.id = cr.cliente_id
     WHERE cr.empresa_id = $1`;
  const params = [eid];

  if (status) {
    params.push(status);
    sql += ` AND cr.status = $${params.length}`;
  }
  sql += " ORDER BY cr.data_vencimento ASC";

  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financeiro/pagar
router.post("/pagar", requireAuth, requirePermissao("financeiro.gerenciar"), async (req, res) => {
  const eid = empresaId(req);
  const { fornecedorId, compraId, valor, dataVencimento, observacoes } = req.body;

  if (!fornecedorId || !valor || !dataVencimento) {
    return res.status(400).json({ error: "Fornecedor, valor e data de vencimento são obrigatórios" });
  }

  try {
    const result = await query(
      `INSERT INTO contas_pagar (fornecedor_id, compra_id, valor, data_vencimento, status, observacoes, empresa_id)
       VALUES ($1, $2, $3, $4, 'PENDENTE', $5, $6) RETURNING *`,
      [fornecedorId, compraId || null, valor, dataVencimento, observacoes || null, eid]
    );
    await registrarAuditoria(req.usuario.id, eid, "CREATE", "contas_pagar", result.rows[0].id, `Criou conta a pagar (R$ ${valor})`, null, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar conta a pagar" });
  }
});

// POST /api/financeiro/receber
router.post("/receber", requireAuth, requirePermissao("financeiro.gerenciar"), async (req, res) => {
  const eid = empresaId(req);
  const { clienteId, vendaId, valor, dataVencimento, observacoes } = req.body;

  if (!clienteId || !valor || !dataVencimento) {
    return res.status(400).json({ error: "Cliente, valor e data de vencimento são obrigatórios" });
  }

  try {
    const result = await query(
      `INSERT INTO contas_receber (cliente_id, venda_id, valor, data_vencimento, status, observacoes, empresa_id)
       VALUES ($1, $2, $3, $4, 'PENDENTE', $5, $6) RETURNING *`,
      [clienteId, vendaId || null, valor, dataVencimento, observacoes || null, eid]
    );
    await registrarAuditoria(req.usuario.id, eid, "CREATE", "contas_receber", result.rows[0].id, `Criou conta a receber (R$ ${valor})`, null, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar conta a receber" });
  }
});

// Lança o impacto no caixa para liquidação em DINHEIRO. PIX/CARTAO/BANCO ficam
// só no resumo financeiro (não tocam a gaveta).
async function lancarCaixaLiquidacao(eid, usuarioId, { tipo, valor, forma, descricao, referencia }) {
  if (forma !== "DINHEIRO") return;
  const cx = await query("SELECT id, unidade_id FROM caixas WHERE empresa_id=$1 AND status='ABERTO' ORDER BY aberto_em DESC LIMIT 1", [eid]);
  if (cx.rowCount === 0) throw { status: 409, msg: "Liquidação em dinheiro exige caixa aberto" };
  await query(
    "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, forma_pagamento, observacao, empresa_id, usuario_id, unidade_id, origem, referencia_id) VALUES ($1,$2,$3,'DINHEIRO',$4,$5,$6,$7,'FINANCEIRO',$8)",
    [cx.rows[0].id, tipo, valor, descricao, eid, usuarioId, cx.rows[0].unidade_id, referencia]
  );
}

// PUT /api/financeiro/pagar/:id (marcar como paga) — M10: forma + impacto no caixa
router.put("/pagar/:id", requireAuth, requirePermissao("financeiro.gerenciar"), async (req, res) => {
  const eid = empresaId(req);
  const { dataPagamento } = req.body;
  const forma = (req.body.forma || "BANCO").toUpperCase();
  try {
    const result = await query(
      `UPDATE contas_pagar SET status = 'PAGA', data_pagamento = $1, forma_pagamento = $2 WHERE id = $3 AND empresa_id = $4 RETURNING *`,
      [dataPagamento || new Date().toISOString(), forma, req.params.id, eid]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Conta a pagar não encontrada" });
    await lancarCaixaLiquidacao(eid, req.usuario.id, { tipo: "DESPESA", valor: result.rows[0].valor, forma, descricao: `Pagamento conta #${req.params.id}`, referencia: Number(req.params.id) });
    await registrarAuditoria(req.usuario.id, eid, "FINANCEIRO", "contas_pagar", Number(req.params.id), `Liquidou conta a pagar (R$ ${result.rows[0].valor}) via ${forma}`, null, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.msg });
    res.status(500).json({ error: err.message || "Erro ao liquidar" });
  }
});

// PUT /api/financeiro/receber/:id (marcar como recebida) — M10
router.put("/receber/:id", requireAuth, requirePermissao("financeiro.gerenciar"), async (req, res) => {
  const eid = empresaId(req);
  const { dataRecebimento } = req.body;
  const forma = (req.body.forma || "BANCO").toUpperCase();
  try {
    const result = await query(
      `UPDATE contas_receber SET status = 'RECEBIDA', data_recebimento = $1, forma_pagamento = $2 WHERE id = $3 AND empresa_id = $4 RETURNING *`,
      [dataRecebimento || new Date().toISOString(), forma, req.params.id, eid]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Conta a receber não encontrada" });
    await lancarCaixaLiquidacao(eid, req.usuario.id, { tipo: "RECEBIMENTO", valor: result.rows[0].valor, forma, descricao: `Recebimento conta #${req.params.id}`, referencia: Number(req.params.id) });
    await registrarAuditoria(req.usuario.id, eid, "FINANCEIRO", "contas_receber", Number(req.params.id), `Recebeu conta (R$ ${result.rows[0].valor}) via ${forma}`, null, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.msg });
    res.status(500).json({ error: err.message || "Erro ao receber" });
  }
});

// GET /api/financeiro/resumo
router.get("/resumo", requireAuth, requirePermissao("financeiro.ver"), async (req, res) => {
  const eid = empresaId(req);

  const pagar = await query(
    `SELECT COALESCE(SUM(valor), 0) as total_pagar, COUNT(*) as qtd_pagar
     FROM contas_pagar WHERE empresa_id = $1 AND status = 'PENDENTE'`,
    [eid]
  );

  const receber = await query(
    `SELECT COALESCE(SUM(valor), 0) as total_receber, COUNT(*) as qtd_receber
     FROM contas_receber WHERE empresa_id = $1 AND status = 'PENDENTE'`,
    [eid]
  );

  const paga = await query(
    `SELECT COALESCE(SUM(valor), 0) as total_pago
     FROM contas_pagar WHERE empresa_id = $1 AND status = 'PAGA'
     AND EXTRACT(MONTH FROM data_pagamento) = EXTRACT(MONTH FROM NOW())`,
    [eid]
  );

  const recebida = await query(
    `SELECT COALESCE(SUM(valor), 0) as total_recebido
     FROM contas_receber WHERE empresa_id = $1 AND status = 'RECEBIDA'
     AND EXTRACT(MONTH FROM data_recebimento) = EXTRACT(MONTH FROM NOW())`,
    [eid]
  );

  res.json({
    contas_pagar: {
      pendente: Number(pagar.rows[0].total_pagar),
      quantidade: Number(pagar.rows[0].qtd_pagar),
      pago_mes: Number(paga.rows[0].total_pago),
    },
    contas_receber: {
      pendente: Number(receber.rows[0].total_receber),
      quantidade: Number(receber.rows[0].qtd_receber),
      recebido_mes: Number(recebida.rows[0].total_recebido),
    },
  });
});

export default router;
