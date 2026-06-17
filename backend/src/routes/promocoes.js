import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";

const router = Router();

// CRUD ----------------------------------------------------------------------
router.get("/", requireAuth, requirePermissao("produtos.ver"), async (req, res) => {
  const r = await query("SELECT * FROM promocoes WHERE empresa_id=$1 ORDER BY prioridade, id", [empresaId(req)]);
  res.json(r.rows);
});

router.post("/", requireAuth, requirePermissao("produtos.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { nome, tipo, valor, leve_qtd, pague_qtd, escopo, alvo_id, hora_inicio, hora_fim, dias_semana, data_inicio, data_fim, prioridade } = req.body;
  if (!nome || !tipo) return res.status(400).json({ error: "nome e tipo são obrigatórios" });
  const r = await query(
    `INSERT INTO promocoes (empresa_id, nome, tipo, valor, leve_qtd, pague_qtd, escopo, alvo_id, hora_inicio, hora_fim, dias_semana, data_inicio, data_fim, prioridade)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [eid, nome, tipo, valor ?? null, leve_qtd ?? null, pague_qtd ?? null, escopo || "GERAL", alvo_id ?? null,
      hora_inicio || null, hora_fim || null, dias_semana || null, data_inicio || null, data_fim || null, prioridade ?? 100]
  );
  await registrarAuditoria(req.usuario.id, eid, "CREATE", "promocoes", r.rows[0].id, `Criou promoção ${nome}`, null, r.rows[0]);
  res.status(201).json(r.rows[0]);
});

router.delete("/:id", requireAuth, requirePermissao("produtos.editar"), async (req, res) => {
  await query("UPDATE promocoes SET ativo=FALSE WHERE id=$1 AND empresa_id=$2", [req.params.id, empresaId(req)]);
  res.json({ ok: true });
});

// Motor: aplica as promoções vigentes a um carrinho. -------------------------
// body: { itens: [{ produto_id, categoria_id, quantidade, preco_unitario }] }
// retorna desconto por item + total, considerando data/hora/dia atuais.
function promoVigente(p, agora) {
  if (!p.ativo) return false;
  const hoje = agora.toISOString().slice(0, 10);
  if (p.data_inicio && hoje < String(p.data_inicio).slice(0, 10)) return false;
  if (p.data_fim && hoje > String(p.data_fim).slice(0, 10)) return false;
  if (p.dias_semana) {
    const dia = agora.getDay(); // 0=dom
    if (!p.dias_semana.split(",").map((x) => Number(x.trim())).includes(dia)) return false;
  }
  if (p.hora_inicio && p.hora_fim) {
    const hhmm = agora.toTimeString().slice(0, 8);
    if (!(hhmm >= p.hora_inicio && hhmm <= p.hora_fim)) return false;
  }
  return true;
}

function aplicaAoItem(p, item) {
  if (p.escopo === "PRODUTO" && Number(p.alvo_id) !== Number(item.produto_id)) return false;
  if (p.escopo === "CATEGORIA" && Number(p.alvo_id) !== Number(item.categoria_id)) return false;
  return true;
}

router.post("/aplicar", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const { itens } = req.body;
    if (!Array.isArray(itens)) return res.status(400).json({ error: "itens é obrigatório" });
    const agora = new Date();
    const promos = (await query("SELECT * FROM promocoes WHERE empresa_id=$1 AND ativo=TRUE ORDER BY prioridade, id", [eid])).rows
      .filter((p) => promoVigente(p, agora));

    let descontoTotal = 0;
    const detalhe = itens.map((item) => {
      const qtd = Number(item.quantidade), preco = Number(item.preco_unitario);
      const bruto = qtd * preco;
      let desconto = 0, aplicada = null;
      // aplica a primeira promoção vigente que casa (ordenada por prioridade)
      for (const p of promos) {
        if (!aplicaAoItem(p, item)) continue;
        if (p.tipo === "PERCENTUAL") desconto = +(bruto * (Number(p.valor) / 100)).toFixed(2);
        else if (p.tipo === "VALOR") desconto = +Math.min(bruto, Number(p.valor) * qtd).toFixed(2);
        else if (p.tipo === "LEVE_X_PAGUE_Y" && p.leve_qtd && p.pague_qtd) {
          const grupos = Math.floor(qtd / p.leve_qtd);
          const gratis = grupos * (p.leve_qtd - p.pague_qtd);
          desconto = +(gratis * preco).toFixed(2);
        }
        if (desconto > 0) { aplicada = { id: p.id, nome: p.nome, tipo: p.tipo }; break; }
      }
      descontoTotal += desconto;
      return { produto_id: item.produto_id, bruto: +bruto.toFixed(2), desconto, liquido: +(bruto - desconto).toFixed(2), promocao: aplicada };
    });

    res.json({ desconto_total: +descontoTotal.toFixed(2), itens: detalhe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
