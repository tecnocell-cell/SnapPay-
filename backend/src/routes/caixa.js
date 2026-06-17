import { Router } from "express";
import { pool, query } from "../db.js";
import { requireAuth, requirePermissao, empresaId } from "../auth.js";

const router = Router();

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
    `SELECT COALESCE(SUM(CASE WHEN tipo IN ('ABERTURA','SUPRIMENTO','VENDA') THEN valor
                              WHEN tipo = 'SANGRIA' THEN -valor ELSE 0 END),0) AS saldo
     FROM caixa_movimentos WHERE caixa_id = $1`,
    [caixa.id]
  );
  res.json({ aberto: true, caixa, saldo: Number(mov.rows[0].saldo) });
});

// POST /api/caixa/abrir
router.post("/abrir", requireAuth, requirePermissao("caixa.operar"), async (req, res) => {
  const eid = empresaId(req);
  const aberto = await query("SELECT id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO'", [eid]);
  if (aberto.rowCount > 0) return res.status(400).json({ error: "Já existe caixa aberto" });
  const valor = Number(req.body.valorAbertura || 0);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const c = await client.query(
      "INSERT INTO caixas (empresa_id, usuario_id, valor_abertura) VALUES ($1,$2,$3) RETURNING *",
      [eid, req.usuario.id, valor]
    );
    await client.query(
      "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao) VALUES ($1,'ABERTURA',$2,'Abertura de caixa')",
      [c.rows[0].id, valor]
    );
    await client.query("COMMIT");
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
    "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao) VALUES ($1,$2,$3,$4)",
    [c.rows[0].id, tipo, valor, observacao || null]
  );
  res.status(201).json({ ok: true });
});

// POST /api/caixa/fechar
router.post("/fechar", requireAuth, requirePermissao("caixa.operar"), async (req, res) => {
  const eid = empresaId(req);
  const c = await query("SELECT id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO'", [eid]);
  if (c.rowCount === 0) return res.status(400).json({ error: "Nenhum caixa aberto" });
  const caixaId = c.rows[0].id;
  const mov = await query(
    `SELECT COALESCE(SUM(CASE WHEN tipo IN ('ABERTURA','SUPRIMENTO','VENDA') THEN valor
                              WHEN tipo='SANGRIA' THEN -valor ELSE 0 END),0) AS saldo
     FROM caixa_movimentos WHERE caixa_id = $1`,
    [caixaId]
  );
  const saldo = Number(mov.rows[0].saldo);
  await query(
    "UPDATE caixas SET status='FECHADO', valor_fechamento=$1, fechado_em=NOW() WHERE id=$2",
    [saldo, caixaId]
  );
  await query(
    "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao) VALUES ($1,'FECHAMENTO',$2,'Fechamento de caixa')",
    [caixaId, saldo]
  );
  res.json({ ok: true, saldoFinal: saldo });
});

export default router;
