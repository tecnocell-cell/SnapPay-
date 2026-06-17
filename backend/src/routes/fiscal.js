import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";
import { getProvider, PROVIDERS_DISPONIVEIS } from "../fiscal/index.js";

const router = Router();

// Garante uma linha de configuração fiscal para a empresa (cria default se faltar).
async function ensureConfig(eid) {
  const r = await query("SELECT * FROM fiscal_configuracoes WHERE empresa_id = $1", [eid]);
  if (r.rowCount) return r.rows[0];
  const novo = await query(
    `INSERT INTO fiscal_configuracoes (empresa_id) VALUES ($1) RETURNING *`,
    [eid]
  );
  return novo.rows[0];
}

// db pode ser o `query` global ou um `client` de transação — use o client
// quando a nota ainda não foi commitada (mesma transação).
async function registrarEvento(db, notaId, eid, tipo, statusResultante, mensagem, payload) {
  await db.query(
    `INSERT INTO fiscal_eventos (nota_id, empresa_id, tipo, status_resultante, mensagem, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [notaId, eid, tipo, statusResultante || null, mensagem || null, payload ? JSON.stringify(payload) : null]
  );
}

// ---------- PROVIDERS DISPONÍVEIS ----------
router.get("/providers", requireAuth, (req, res) => {
  res.json(PROVIDERS_DISPONIVEIS);
});

// ---------- CONFIGURAÇÕES FISCAIS ----------
router.get("/configuracoes", requireAuth, requirePermissao("fiscal.configurar"), async (req, res) => {
  try {
    const cfg = await ensureConfig(empresaId(req));
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/configuracoes", requireAuth, requirePermissao("fiscal.configurar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    await ensureConfig(eid);
    const {
      provider, ambiente, modelo, serie, numero_atual, csc, csc_id, provider_token,
      certificado_nome, certificado_validade, regime_tributario, uf, ativo,
    } = req.body;

    const result = await query(
      `UPDATE fiscal_configuracoes SET
         provider = COALESCE($1, provider),
         ambiente = COALESCE($2, ambiente),
         modelo = COALESCE($3, modelo),
         serie = COALESCE($4, serie),
         numero_atual = COALESCE($5, numero_atual),
         csc = COALESCE($6, csc),
         csc_id = COALESCE($7, csc_id),
         provider_token = COALESCE($8, provider_token),
         certificado_nome = COALESCE($9, certificado_nome),
         certificado_validade = COALESCE($10, certificado_validade),
         regime_tributario = COALESCE($11, regime_tributario),
         uf = COALESCE($12, uf),
         ativo = COALESCE($13, ativo),
         atualizado_em = NOW()
       WHERE empresa_id = $14 RETURNING *`,
      [provider, ambiente, modelo, serie, numero_atual, csc, csc_id, provider_token,
        certificado_nome, certificado_validade, regime_tributario, uf, ativo, eid]
    );
    await registrarAuditoria(req.usuario.id, eid, "UPDATE", "fiscal_configuracoes", result.rows[0].id, "Atualizou configurações fiscais", null, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Valida a configuração no provider selecionado.
router.get("/configuracoes/validar", requireAuth, requirePermissao("fiscal.configurar"), async (req, res) => {
  try {
    const cfg = await ensureConfig(empresaId(req));
    const provider = getProvider(cfg);
    const r = await provider.validarConfiguracao();
    res.json({ provider: provider.nome, ...r });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NOTAS ----------
router.get("/notas", requireAuth, requirePermissao("fiscal.emitir"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { status } = req.query;
    let sql = "SELECT * FROM fiscal_notas WHERE empresa_id = $1";
    const params = [eid];
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    sql += " ORDER BY id DESC LIMIT 200";
    const r = await query(sql, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/notas/:id", requireAuth, requirePermissao("fiscal.emitir"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const nota = await query("SELECT * FROM fiscal_notas WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!nota.rowCount) return res.status(404).json({ error: "Nota não encontrada" });
    const eventos = await query("SELECT * FROM fiscal_eventos WHERE nota_id = $1 ORDER BY id", [req.params.id]);
    res.json({ nota: nota.rows[0], eventos: eventos.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Emite NFC-e a partir de uma venda. body: { venda_id, simular? }
router.post("/notas/emitir", requireAuth, requirePermissao("fiscal.emitir"), async (req, res) => {
  const eid = empresaId(req);
  const { venda_id, simular } = req.body;
  if (!venda_id) return res.status(400).json({ error: "venda_id é obrigatório" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const vendaQ = await client.query("SELECT * FROM vendas WHERE id = $1 AND empresa_id = $2", [venda_id, eid]);
    if (!vendaQ.rowCount) throw { status: 404, msg: "Venda não encontrada" };
    const venda = vendaQ.rows[0];
    if (venda.status !== "FINALIZADA") throw { status: 400, msg: "Só é possível emitir nota de venda FINALIZADA" };

    // Evita duplicar nota autorizada/em emissão para a mesma venda
    const jaTem = await client.query(
      "SELECT id, status FROM fiscal_notas WHERE venda_id = $1 AND status IN ('AUTORIZADA','EMITINDO','CONTINGENCIA')",
      [venda_id]
    );
    if (jaTem.rowCount) throw { status: 409, msg: `Venda já possui nota (${jaTem.rows[0].status})` };

    const cfgQ = await client.query("SELECT * FROM fiscal_configuracoes WHERE empresa_id = $1", [eid]);
    const cfg = cfgQ.rowCount ? cfgQ.rows[0] : { provider: "MOCK", ambiente: "HOMOLOGACAO", serie: 1, numero_atual: 0, modelo: "65" };

    const itens = await client.query(
      "SELECT vi.*, p.nome FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id WHERE vi.venda_id = $1",
      [venda_id]
    );

    const numero = Number(cfg.numero_atual || 0) + 1;
    const serie = Number(cfg.serie || 1);

    // cria nota EMITINDO
    const notaQ = await client.query(
      `INSERT INTO fiscal_notas (empresa_id, venda_id, usuario_id, modelo, serie, numero, status, ambiente, provider, valor_total)
       VALUES ($1,$2,$3,$4,$5,$6,'EMITINDO',$7,$8,$9) RETURNING *`,
      [eid, venda_id, req.usuario.id, cfg.modelo || "65", serie, numero, cfg.ambiente, cfg.provider, venda.valor_total]
    );
    const nota = notaQ.rows[0];
    await registrarEvento(client, nota.id, eid, "EMISSAO", "EMITINDO", "Iniciada emissão", { simular });

    // chama o provider
    const provider = getProvider(cfg);
    const r = await provider.emitirNFCe({ config: cfg, venda, itens: itens.rows, simular });

    if (r.ok && (r.status === "AUTORIZADA" || r.status === "CONTINGENCIA")) {
      await client.query(
        `UPDATE fiscal_notas SET status=$1, chave_acesso=$2, protocolo=$3, danfe_url=$4, xml=$5, autorizada_em=NOW() WHERE id=$6`,
        [r.status, r.chave_acesso || null, r.protocolo || null, r.danfe_url || null, r.xml || null, nota.id]
      );
      // persiste numeração consumida
      await client.query(
        `UPDATE fiscal_configuracoes SET numero_atual=$1, atualizado_em=NOW() WHERE empresa_id=$2`,
        [numero, eid]
      );
      await registrarEvento(client, nota.id, eid, "AUTORIZACAO", r.status, r.motivo || "Autorizada", r.payload);
    } else {
      await client.query(
        `UPDATE fiscal_notas SET status='REJEITADA', motivo_rejeicao=$1 WHERE id=$2`,
        [r.motivo || "Rejeitada", nota.id]
      );
      await registrarEvento(client, nota.id, eid, "REJEICAO", "REJEITADA", r.motivo || "Rejeitada", r.payload);
    }

    await client.query("COMMIT");

    const final = await query("SELECT * FROM fiscal_notas WHERE id = $1", [nota.id]);
    await registrarAuditoria(req.usuario.id, eid, "FISCAL", "fiscal_notas", nota.id,
      `Emissão NFC-e venda #${venda_id} → ${final.rows[0].status}`, null, final.rows[0]);
    res.status(201).json(final.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao emitir nota" });
  } finally {
    client.release();
  }
});

// Cancela uma nota autorizada.
router.post("/notas/:id/cancelar", requireAuth, requirePermissao("fiscal.cancelar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const notaQ = await query("SELECT * FROM fiscal_notas WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!notaQ.rowCount) return res.status(404).json({ error: "Nota não encontrada" });
    const nota = notaQ.rows[0];

    const cfgQ = await query("SELECT * FROM fiscal_configuracoes WHERE empresa_id = $1", [eid]);
    const provider = getProvider(cfgQ.rows[0] || {});
    const r = await provider.cancelarNota({ config: cfgQ.rows[0], nota });
    if (!r.ok) return res.status(400).json({ error: r.motivo || "Não foi possível cancelar" });

    await query("UPDATE fiscal_notas SET status='CANCELADA', cancelada_em=NOW() WHERE id=$1", [nota.id]);
    await registrarEvento(pool, nota.id, eid, "CANCELAMENTO", "CANCELADA", req.body?.motivo || "Cancelamento", r.payload);
    await registrarAuditoria(req.usuario.id, eid, "FISCAL", "fiscal_notas", nota.id, `Cancelou NFC-e #${nota.id}`, null, null);
    const final = await query("SELECT * FROM fiscal_notas WHERE id = $1", [nota.id]);
    res.json(final.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DANFE
router.get("/notas/:id/danfe", requireAuth, requirePermissao("fiscal.emitir"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const notaQ = await query("SELECT * FROM fiscal_notas WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!notaQ.rowCount) return res.status(404).json({ error: "Nota não encontrada" });
    const cfgQ = await query("SELECT * FROM fiscal_configuracoes WHERE empresa_id = $1", [eid]);
    const provider = getProvider(cfgQ.rows[0] || {});
    const r = await provider.gerarDanfe({ config: cfgQ.rows[0], nota: notaQ.rows[0] });
    if (!r.ok) return res.status(400).json({ error: r.motivo || "DANFE indisponível" });
    res.json({ danfe_url: r.danfe_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inutiliza faixa de numeração.
router.post("/inutilizar", requireAuth, requirePermissao("fiscal.cancelar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { serie, numeroInicial, numeroFinal, justificativa } = req.body;
    const cfgQ = await query("SELECT * FROM fiscal_configuracoes WHERE empresa_id = $1", [eid]);
    const provider = getProvider(cfgQ.rows[0] || {});
    const r = await provider.inutilizarNumeracao({ config: cfgQ.rows[0], faixa: { serie, numeroInicial, numeroFinal, justificativa } });
    if (!r.ok) return res.status(400).json({ error: r.motivo || "Não foi possível inutilizar" });
    await registrarAuditoria(req.usuario.id, eid, "FISCAL", "fiscal_configuracoes", null,
      `Inutilizou numeração série ${serie} (${numeroInicial}-${numeroFinal})`, null, { protocolo: r.protocolo });
    res.json({ ok: true, protocolo: r.protocolo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
