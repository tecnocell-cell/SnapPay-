import { Router } from "express";
import { pool, query } from "../db.js";
import { requireAuth, requirePermissao, empresaId } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// Saldo FÍSICO (dinheiro): abertura + suprimento + vendas em dinheiro - sangria.
// PIX e cartão NÃO entram no dinheiro da gaveta.
const SQL_SALDO_DINHEIRO = `
  COALESCE(SUM(CASE
    WHEN tipo IN ('ABERTURA','SUPRIMENTO') THEN valor
    WHEN tipo = 'VENDA' AND forma_pagamento = 'DINHEIRO' THEN valor
    WHEN tipo = 'SANGRIA' THEN -valor
    ELSE 0 END), 0)`;

// GET /api/caixa/atual — caixa aberto da empresa (ou null)
router.get("/atual", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const r = await query(
    "SELECT * FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO' ORDER BY aberto_em DESC LIMIT 1",
    [eid]
  );
  if (r.rowCount === 0) return res.json({ aberto: false, caixa: null, saldo: 0 });
  const caixa = r.rows[0];
  const mov = await query(
    `SELECT ${SQL_SALDO_DINHEIRO} AS saldo FROM caixa_movimentos WHERE caixa_id = $1`,
    [caixa.id]
  );
  // nome da loja vinculada ao caixa (para o PDV exibir)
  let unidade = null;
  if (caixa.unidade_id) {
    const u = await query("SELECT id, nome FROM unidades WHERE id=$1", [caixa.unidade_id]);
    unidade = u.rows[0] || null;
  }
  res.json({ aberto: true, caixa, saldo: Number(mov.rows[0].saldo), unidade });
});

// POST /api/caixa/abrir
router.post("/abrir", requireAuth, requirePermissao("caixa.operar"), async (req, res) => {
  const eid = empresaId(req);
  const aberto = await query("SELECT id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO'", [eid]);
  if (aberto.rowCount > 0) return res.status(400).json({ error: "Já existe caixa aberto" });
  const valor = Number(req.body.valorAbertura || 0);
  // unidade/loja do caixa: informada ou a matriz (menor id) da empresa
  let unidadeId = req.body.unidadeId ? Number(req.body.unidadeId) : null;
  if (!unidadeId) {
    const u = await query("SELECT MIN(id) AS id FROM unidades WHERE empresa_id=$1", [eid]);
    unidadeId = u.rows[0]?.id || null;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await client.query(
      "INSERT INTO caixas (empresa_id, usuario_id, valor_abertura, unidade_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [eid, req.usuario.id, valor, unidadeId]
    );
    await client.query(
      "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao) VALUES ($1,'ABERTURA',$2,'Abertura de caixa')",
      [c.rows[0].id, valor]
    );
    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "CAIXA", "caixas", c.rows[0].id, `Abriu caixa (abertura R$ ${valor})`, null, c.rows[0]);
    res.status(201).json(c.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK"); console.error(e);
    res.status(500).json({ error: "Erro ao abrir caixa" });
  } finally { client.release(); }
});

// POST /api/caixa/movimentar — SANGRIA ou SUPRIMENTO
router.post("/movimentar", requireAuth, requirePermissao("caixa.sangria"), async (req, res) => {
  const eid = empresaId(req);
  const { tipo, valor, observacao } = req.body;
  if (!["SANGRIA", "SUPRIMENTO"].includes(tipo)) return res.status(400).json({ error: "Tipo inválido" });
  if (!valor || valor <= 0) return res.status(400).json({ error: "Valor inválido" });
  const c = await query("SELECT id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO'", [eid]);
  if (c.rowCount === 0) return res.status(400).json({ error: "Nenhum caixa aberto" });
  await query(
    "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao, empresa_id, usuario_id, forma_pagamento) VALUES ($1,$2,$3,$4,$5,$6,'DINHEIRO')",
    [c.rows[0].id, tipo, valor, observacao || null, eid, req.usuario.id]
  );
  await registrarAuditoria(req.usuario.id, eid, "CAIXA", "caixas", c.rows[0].id, `${tipo} de R$ ${valor}`, null, null);
  res.status(201).json({ ok: true });
});

// POST /api/caixa/fechar (simples)
router.post("/fechar", requireAuth, requirePermissao("caixa.operar"), async (req, res) => {
  const eid = empresaId(req);
  const c = await query("SELECT id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO'", [eid]);
  if (c.rowCount === 0) return res.status(400).json({ error: "Nenhum caixa aberto" });
  const caixaId = c.rows[0].id;
  const mov = await query(
    `SELECT ${SQL_SALDO_DINHEIRO} AS saldo FROM caixa_movimentos WHERE caixa_id = $1`,
    [caixaId]
  );
  const saldo = Number(mov.rows[0].saldo);
  await query(
    "UPDATE caixas SET status='FECHADO', valor_fechamento=$1, valor_contado=$2, diferenca=$3, fechado_em=NOW(), usuario_fechamento_id=$4 WHERE id=$5",
    [saldo, saldo, 0, req.usuario.id, caixaId]
  );
  await query(
    "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao, empresa_id, usuario_id) VALUES ($1,'FECHAMENTO',$2,'Fechamento de caixa',$3,$4)",
    [caixaId, saldo, eid, req.usuario.id]
  );
  await registrarAuditoria(req.usuario.id, eid, "CAIXA", "caixas", caixaId, `Fechou caixa (saldo dinheiro R$ ${saldo})`, null, null);
  res.json({ ok: true, saldoFinal: saldo, diferenca: 0 });
});

// POST /api/caixa/fechar-com-conferencia (com valor contado e diferença)
router.post("/fechar-com-conferencia", requireAuth, requirePermissao("caixa.operar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { valor_contado, observacao } = req.body;

    const c = await query("SELECT id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO'", [eid]);
    if (c.rowCount === 0) return res.status(400).json({ error: "Nenhum caixa aberto" });
    const caixaId = c.rows[0].id;

    // Vendas por forma de pagamento
    const formas = await query(
      `SELECT forma_pagamento, COALESCE(SUM(valor), 0) AS total
       FROM caixa_movimentos
       WHERE caixa_id = $1 AND tipo = 'VENDA'
       GROUP BY forma_pagamento`,
      [caixaId]
    );

    // Saldo ESPERADO em DINHEIRO (físico na gaveta)
    const movDin = await query(
      `SELECT ${SQL_SALDO_DINHEIRO} AS saldo FROM caixa_movimentos WHERE caixa_id = $1`,
      [caixaId]
    );
    const esperadoDinheiro = Number(movDin.rows[0].saldo);

    // Total eletrônico (PIX + cartões) — não entra no dinheiro contado
    const eletronico = formas.rows
      .filter(f => (f.forma_pagamento || "DINHEIRO") !== "DINHEIRO")
      .reduce((acc, f) => acc + Number(f.total), 0);

    const dinheiroContado = Number(valor_contado || 0);
    const diferenca = dinheiroContado - esperadoDinheiro; // diferença SÓ sobre dinheiro físico

    await query(
      `UPDATE caixas
       SET status='FECHADO', valor_fechamento=$1, valor_contado=$2, diferenca=$3,
           observacao_fechamento=$4, fechado_em=NOW(), usuario_fechamento_id=$5, atualizado_em=NOW()
       WHERE id=$6`,
      [esperadoDinheiro, dinheiroContado, diferenca, observacao || null, req.usuario.id, caixaId]
    );
    await query(
      "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao, empresa_id, usuario_id) VALUES ($1,'FECHAMENTO',$2,$3,$4,$5)",
      [caixaId, esperadoDinheiro, "Fechamento com conferência", eid, req.usuario.id]
    );
    await registrarAuditoria(req.usuario.id, eid, "CAIXA", "caixas", caixaId,
      `Fechou caixa com conferência. Esperado(dinheiro) R$ ${esperadoDinheiro}, contado R$ ${dinheiroContado}, diferença R$ ${diferenca.toFixed(2)}`, null, null);

    res.json({
      ok: true,
      esperadoDinheiro,
      dinheiroContado,
      diferenca,
      eletronico,
      porForma: formas.rows.map(f => ({
        forma: f.forma_pagamento || "DINHEIRO",
        valor: Number(f.total),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao fechar caixa" });
  }
});

// GET /api/caixa/:id/resumo - Resumo detalhado do caixa
router.get("/:id/resumo", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const caixa = await query(
      "SELECT * FROM caixas WHERE id = $1 AND empresa_id = $2",
      [req.params.id, eid]
    );
    if (caixa.rowCount === 0) return res.status(404).json({ error: "Caixa não encontrado" });

    // Resumo por forma de pagamento
    const formas = await query(
      `SELECT forma_pagamento, COUNT(*) as qtd, COALESCE(SUM(valor), 0) AS total
       FROM caixa_movimentos
       WHERE caixa_id = $1 AND tipo = 'VENDA'
       GROUP BY forma_pagamento`,
      [req.params.id]
    );

    // Movimentações
    const movimentacoes = await query(
      `SELECT tipo, COUNT(*) as qtd, COALESCE(SUM(valor), 0) AS total
       FROM caixa_movimentos
       WHERE caixa_id = $1
       GROUP BY tipo`,
      [req.params.id]
    );

    res.json({
      caixa: caixa.rows[0],
      porForma: formas.rows.map(f => ({
        forma: f.forma_pagamento || "DINHEIRO",
        quantidade: Number(f.qtd),
        total: Number(f.total)
      })),
      porTipo: movimentacoes.rows.map(m => ({
        tipo: m.tipo,
        quantidade: Number(m.qtd),
        total: Number(m.total)
      }))
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
