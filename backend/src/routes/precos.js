import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";
import { criarPrecificador } from "../precificacao.js";

const router = Router();

// POST /api/precos/preview — preço AUTORITATIVO de um carrinho (mesma lógica do POST /vendas).
// O PDV consome este endpoint; nada de cálculo paralelo no navegador.
// body: { cliente_id, itens:[{ produto_id, quantidade }] }
router.post("/preview", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const { cliente_id, itens } = req.body;
    if (!Array.isArray(itens)) return res.status(400).json({ error: "itens é obrigatório" });
    const precificar = await criarPrecificador(pool, eid, cliente_id || null);
    let subtotal = 0, descontoTotal = 0;
    const out = [];
    for (const it of itens) {
      const prod = (await query(
        "SELECT id, nome, preco_venda, categoria_id FROM produtos WHERE id=$1 AND empresa_id=$2 AND ativo=TRUE",
        [it.produto_id, eid]
      )).rows[0];
      if (!prod) continue;
      const qtd = Number(it.quantidade) || 0;
      const pr = await precificar(prod, qtd);
      const bruto = +(qtd * pr.preco_unitario).toFixed(2);
      const desconto = pr.desconto_promo;
      const valorTotal = +(bruto - desconto).toFixed(2);
      subtotal += bruto;
      descontoTotal += desconto;
      out.push({
        produto_id: prod.id,
        produto: prod.nome,
        quantidade: qtd,
        preco_base: pr.preco_base,
        tabela_preco_id: pr.tabela_preco_id,
        tabela_tipo: pr.tabela_tipo,
        promocao_id: pr.promocao_id,
        desconto,
        preco_final: pr.preco_unitario,
        valor_total: valorTotal,
      });
    }
    res.json({
      subtotal: +subtotal.toFixed(2),
      desconto_total: +descontoTotal.toFixed(2),
      total: +(subtotal - descontoTotal).toFixed(2),
      itens: out,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/precos/tabelas — lista tabelas de preço
router.get("/tabelas", requireAuth, requirePermissao("produtos.ver"), async (req, res) => {
  const r = await query("SELECT * FROM tabelas_preco WHERE empresa_id=$1 AND ativo=TRUE ORDER BY tipo, nome", [empresaId(req)]);
  res.json(r.rows);
});

// GET /api/precos/tabelas/:id — tabela + itens
router.get("/tabelas/:id", requireAuth, requirePermissao("produtos.ver"), async (req, res) => {
  const eid = empresaId(req);
  const t = await query("SELECT * FROM tabelas_preco WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
  if (!t.rowCount) return res.status(404).json({ error: "Tabela não encontrada" });
  const itens = await query(
    `SELECT tpi.*, p.nome AS produto_nome, p.codigo FROM tabela_preco_itens tpi
     JOIN produtos p ON p.id=tpi.produto_id WHERE tpi.tabela_id=$1 ORDER BY p.nome, tpi.qtd_min`,
    [req.params.id]
  );
  res.json({ tabela: t.rows[0], itens: itens.rows });
});

// POST /api/precos/tabelas — criar tabela
router.post("/tabelas", requireAuth, requirePermissao("produtos.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { nome, tipo, padrao } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
  if (padrao) await query("UPDATE tabelas_preco SET padrao=FALSE WHERE empresa_id=$1", [eid]);
  const r = await query(
    "INSERT INTO tabelas_preco (empresa_id, nome, tipo, padrao) VALUES ($1,$2,$3,$4) RETURNING *",
    [eid, nome, tipo || "VAREJO", padrao === true]
  );
  await registrarAuditoria(req.usuario.id, eid, "CREATE", "tabelas_preco", r.rows[0].id, `Criou tabela de preço ${nome}`, null, r.rows[0]);
  res.status(201).json(r.rows[0]);
});

// POST /api/precos/tabelas/:id/itens — define preço de um produto/faixa (upsert)
router.post("/tabelas/:id/itens", requireAuth, requirePermissao("produtos.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { produto_id, qtd_min, preco } = req.body;
  if (!produto_id || preco === undefined) return res.status(400).json({ error: "produto_id e preco são obrigatórios" });
  const t = await query("SELECT id FROM tabelas_preco WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
  if (!t.rowCount) return res.status(404).json({ error: "Tabela não encontrada" });
  // M8 — captura preço anterior p/ auditar antes/depois.
  const ant = await query("SELECT preco FROM tabela_preco_itens WHERE tabela_id=$1 AND produto_id=$2 AND qtd_min=$3",
    [req.params.id, produto_id, Number(qtd_min) || 1]);
  const r = await query(
    `INSERT INTO tabela_preco_itens (tabela_id, produto_id, qtd_min, preco) VALUES ($1,$2,$3,$4)
     ON CONFLICT (tabela_id, produto_id, qtd_min) DO UPDATE SET preco=EXCLUDED.preco RETURNING *`,
    [req.params.id, produto_id, Number(qtd_min) || 1, Number(preco)]
  );
  await registrarAuditoria(req.usuario.id, eid, "PRECO", "tabela_preco_itens", r.rows[0].id,
    `Preço tabela #${req.params.id} produto ${produto_id} (faixa ${Number(qtd_min) || 1}): R$ ${ant.rows[0]?.preco ?? "—"} → R$ ${Number(preco).toFixed(2)}`,
    ant.rows[0] || null, r.rows[0]);
  res.status(201).json(r.rows[0]);
});

// GET /api/precos/resolver — resolve o preço aplicável
// query: produto_id, quantidade, [tabela_id | cliente_id]
// Regra: usa a tabela do cliente (ou a informada, ou a padrão); dentro dela,
// pega o preço da maior faixa qtd_min <= quantidade. Fallback: preco_venda.
router.get("/resolver", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const { produto_id, quantidade, cliente_id } = req.query;
    let tabelaId = req.query.tabela_id ? Number(req.query.tabela_id) : null;
    const qtd = Number(quantidade) || 1;
    if (!produto_id) return res.status(400).json({ error: "produto_id obrigatório" });

    // descobre tabela: explícita > do cliente > padrão da empresa
    if (!tabelaId && cliente_id) {
      const c = await query("SELECT tabela_preco_id FROM clientes WHERE id=$1 AND empresa_id=$2", [cliente_id, eid]);
      tabelaId = c.rows[0]?.tabela_preco_id || null;
    }
    if (!tabelaId) {
      const padrao = await query("SELECT id FROM tabelas_preco WHERE empresa_id=$1 AND padrao=TRUE AND ativo=TRUE LIMIT 1", [eid]);
      tabelaId = padrao.rows[0]?.id || null;
    }

    const prod = await query("SELECT preco_venda FROM produtos WHERE id=$1 AND empresa_id=$2", [produto_id, eid]);
    const precoBase = prod.rows[0] ? Number(prod.rows[0].preco_venda) : 0;

    let preco = precoBase, origem = "preco_venda", faixa = 1;
    if (tabelaId) {
      const r = await query(
        `SELECT preco, qtd_min FROM tabela_preco_itens
         WHERE tabela_id=$1 AND produto_id=$2 AND qtd_min <= $3
         ORDER BY qtd_min DESC LIMIT 1`,
        [tabelaId, produto_id, qtd]
      );
      if (r.rowCount) { preco = Number(r.rows[0].preco); origem = `tabela ${tabelaId}`; faixa = Number(r.rows[0].qtd_min); }
    }
    res.json({ produto_id: Number(produto_id), quantidade: qtd, tabela_id: tabelaId, preco, origem, faixa_qtd_min: faixa });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
