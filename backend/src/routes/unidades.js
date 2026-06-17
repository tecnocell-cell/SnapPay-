import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// GET /api/unidades — lojas da empresa
router.get("/", requireAuth, async (req, res) => {
  const r = await query("SELECT * FROM unidades WHERE empresa_id=$1 ORDER BY id", [empresaId(req)]);
  res.json(r.rows);
});

// POST /api/unidades — criar loja (ADMIN)
router.post("/", requireAuth, requirePermissao("config.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { nome, codigo } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
  const r = await query("INSERT INTO unidades (empresa_id, nome, codigo) VALUES ($1,$2,$3) RETURNING *", [eid, nome, codigo || "001"]);
  await registrarAuditoria(req.usuario.id, eid, "CREATE", "unidades", r.rows[0].id, `Criou loja ${nome}`, null, r.rows[0]);
  res.status(201).json(r.rows[0]);
});

// GET /api/unidades/:id/estoque — estoque da loja
router.get("/:id/estoque", requireAuth, async (req, res) => {
  const r = await query(
    `SELECT eu.produto_id, p.codigo, p.nome, eu.quantidade
     FROM estoque_unidade eu JOIN produtos p ON p.id=eu.produto_id
     WHERE eu.unidade_id=$1 AND eu.empresa_id=$2 ORDER BY p.nome`,
    [req.params.id, empresaId(req)]
  );
  res.json(r.rows);
});

// POST /api/unidades/:id/estoque — define/ajusta estoque de um produto na loja
router.post("/:id/estoque", requireAuth, requirePermissao("estoque.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { produto_id, quantidade } = req.body;
  if (!produto_id) return res.status(400).json({ error: "produto_id obrigatório" });
  const r = await query(
    `INSERT INTO estoque_unidade (empresa_id, unidade_id, produto_id, quantidade) VALUES ($1,$2,$3,$4)
     ON CONFLICT (unidade_id, produto_id) DO UPDATE SET quantidade=EXCLUDED.quantidade RETURNING *`,
    [eid, req.params.id, produto_id, Number(quantidade) || 0]
  );
  res.status(201).json(r.rows[0]);
});

// POST /api/unidades/transferir — transfere itens entre lojas
// body: { origem, destino, itens:[{produto_id, quantidade}], observacao }
router.post("/transferir", requireAuth, requirePermissao("estoque.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { origem, destino, itens, observacao } = req.body;
  if (!origem || !destino || origem === destino) return res.status(400).json({ error: "Informe origem e destino diferentes" });
  if (!Array.isArray(itens) || !itens.length) return res.status(400).json({ error: "Informe os itens" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tQ = await client.query(
      "INSERT INTO transferencias (empresa_id, unidade_origem, unidade_destino, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [eid, origem, destino, req.usuario.id, observacao || null]
    );
    const transfId = tQ.rows[0].id;

    for (const it of itens) {
      const q = Number(it.quantidade);
      if (q <= 0) throw { status: 400, msg: "Quantidade inválida" };
      // saldo na origem
      const origemQ = await client.query("SELECT quantidade FROM estoque_unidade WHERE unidade_id=$1 AND produto_id=$2", [origem, it.produto_id]);
      const saldoOrigem = origemQ.rowCount ? Number(origemQ.rows[0].quantidade) : 0;
      if (saldoOrigem < q) throw { status: 400, msg: `Estoque insuficiente na origem para produto ${it.produto_id} (tem ${saldoOrigem})` };

      // baixa origem
      await client.query(
        `INSERT INTO estoque_unidade (empresa_id, unidade_id, produto_id, quantidade) VALUES ($1,$2,$3,$4)
         ON CONFLICT (unidade_id, produto_id) DO UPDATE SET quantidade = estoque_unidade.quantidade - $4`,
        [eid, origem, it.produto_id, q]
      );
      // entra destino
      await client.query(
        `INSERT INTO estoque_unidade (empresa_id, unidade_id, produto_id, quantidade) VALUES ($1,$2,$3,$4)
         ON CONFLICT (unidade_id, produto_id) DO UPDATE SET quantidade = estoque_unidade.quantidade + $4`,
        [eid, destino, it.produto_id, q]
      );
      await client.query("INSERT INTO transferencia_itens (transferencia_id, produto_id, quantidade) VALUES ($1,$2,$3)", [transfId, it.produto_id, q]);
      // kardex (documental, por unidade)
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, origem, origem_id)
         VALUES ($1,'TRANSFERENCIA',$2,$3,$4,$5,'TRANSFERENCIA',$6)`,
        [it.produto_id, q, `Transferência loja ${origem}→${destino}`, eid, req.usuario.id, transfId]
      );
    }

    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "TRANSFERENCIA", "transferencias", transfId, `Transferência ${origem}→${destino} (${itens.length} item(ns))`, null, { itens });
    res.status(201).json({ id: transfId, origem, destino, itens: itens.length });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.msg });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
