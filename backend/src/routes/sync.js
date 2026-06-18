import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query, pool } from "../db.js";
import { requireAuth, empresaId, requirePermissao } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";
import { criarPrecificador } from "../precificacao.js";

const router = Router();

// Valida que o terminal existe, está ativo e pertence à empresa do token.
// Impede um terminal sincronizar dados de outra empresa.
async function dispositivoDaEmpresa(req, deviceId) {
  if (!deviceId) return null;
  const r = await query(
    "SELECT * FROM pdv_dispositivos WHERE device_id = $1 AND empresa_id = $2 AND ativo = TRUE",
    [deviceId, empresaId(req)]
  );
  return r.rowCount ? r.rows[0] : null;
}

// ---------- ATIVAÇÃO DE TERMINAL (ADMIN) ----------
router.post("/ativar-terminal", requireAuth, requirePermissao("dispositivos.gerenciar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { nome, unidade_id, versao_app } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome do terminal é obrigatório" });

    const deviceId = crypto.randomUUID();
    const chaveLocal = crypto.randomBytes(24).toString("hex");
    const chaveHash = bcrypt.hashSync(chaveLocal, 10);
    const codigo = crypto.randomBytes(3).toString("hex").toUpperCase();

    const r = await query(
      `INSERT INTO pdv_dispositivos (empresa_id, unidade_id, nome, device_id, chave_hash, codigo_ativacao, versao_app)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, empresa_id, unidade_id, nome, device_id, codigo_ativacao, ativo, criado_em`,
      [eid, unidade_id || null, nome, deviceId, chaveHash, codigo, versao_app || null]
    );
    await registrarAuditoria(req.usuario.id, eid, "CREATE", "pdv_dispositivos", r.rows[0].id, `Ativou terminal ${nome}`, null, r.rows[0]);
    // chave_local só é exibida UMA vez (o app a guarda localmente)
    res.status(201).json({ ...r.rows[0], chave_local: chaveLocal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lista terminais da empresa
router.get("/dispositivos", requireAuth, requirePermissao("dispositivos.gerenciar"), async (req, res) => {
  const r = await query(
    "SELECT id, nome, device_id, unidade_id, ativo, ultimo_sync, versao_app, criado_em FROM pdv_dispositivos WHERE empresa_id = $1 ORDER BY id DESC",
    [empresaId(req)]
  );
  res.json(r.rows);
});

// ---------- BOOTSTRAP: dataset inicial para o terminal ----------
router.get("/bootstrap", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const { device_id } = req.query;
    const disp = await dispositivoDaEmpresa(req, device_id);
    if (device_id && !disp) return res.status(403).json({ error: "Terminal inválido para esta empresa" });

    const empresa = await query("SELECT id, nome, segmento FROM empresas WHERE id = $1", [eid]);
    const unidades = await query("SELECT id, nome, codigo FROM unidades WHERE empresa_id = $1 AND ativo = TRUE", [eid]);
    const usuarios = await query(
      `SELECT u.id, u.nome, u.email, p.chave AS papel FROM usuarios u JOIN papeis p ON p.id = u.papel_id
       WHERE u.empresa_id = $1 AND u.ativo = TRUE`, [eid]
    );
    const permissoes = await query(
      `SELECT p.chave AS papel, perm.chave AS permissao
       FROM papeis p JOIN papel_permissao pp ON pp.papel_id = p.id JOIN permissoes perm ON perm.id = pp.permissao_id`
    );
    const produtos = await query(
      `SELECT id, codigo, barras, nome, unidade, preco_venda, estoque_atual, categoria_id, controla_estoque
       FROM produtos WHERE empresa_id = $1 AND ativo = TRUE`, [eid]
    );
    const categorias = await query("SELECT id, nome, icone FROM categorias WHERE empresa_id = $1 AND ativo = TRUE", [eid]);
    const clientes = await query("SELECT id, nome, cpf_cnpj FROM clientes WHERE empresa_id = $1 AND ativo = TRUE LIMIT 1000", [eid]);
    const caixa = await query("SELECT id, status, valor_abertura, aberto_em FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO' ORDER BY aberto_em DESC LIMIT 1", [eid]);

    if (disp) await query("UPDATE pdv_dispositivos SET ultimo_sync = NOW() WHERE id = $1", [disp.id]);

    res.json({
      gerado_em: new Date().toISOString(),
      empresa: empresa.rows[0],
      unidades: unidades.rows,
      usuarios: usuarios.rows,
      permissoes: permissoes.rows,
      produtos: produtos.rows,
      categorias: categorias.rows,
      clientes: clientes.rows,
      caixa_aberto: caixa.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ENVIAR LOTE: eventos do terminal (vendas offline) ----------
router.post("/enviar-lote", requireAuth, async (req, res) => {
  const eid = empresaId(req);
  const { device_id, eventos } = req.body;
  if (!Array.isArray(eventos)) return res.status(400).json({ error: "eventos deve ser uma lista" });
  const disp = await dispositivoDaEmpresa(req, device_id);
  if (!disp) return res.status(403).json({ error: "Terminal inválido para esta empresa" });

  const resultados = [];
  for (const ev of eventos) {
    try {
      if (ev.entidade === "venda" && ev.operacao === "CREATE") {
        const r = await processarVendaOffline(eid, disp, ev, req.usuario.id);
        resultados.push({ uuid: ev.uuid, status: "PROCESSADO", venda_id: r.venda_id, duplicada: r.duplicada, divergencia: r.divergencia || null });
      } else {
        // outros tipos: apenas registra na fila como recebido
        await query(
          `INSERT INTO sync_recebimentos (empresa_id, unidade_id, device_id, uuid, entidade, operacao, payload, status, processado_em)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'PROCESSADO',NOW())
           ON CONFLICT (device_id, uuid) DO NOTHING`,
          [eid, disp.unidade_id, device_id, ev.uuid, ev.entidade, ev.operacao, JSON.stringify(ev.payload || {})]
        );
        resultados.push({ uuid: ev.uuid, status: "PROCESSADO" });
      }
    } catch (err) {
      await query(
        `INSERT INTO sync_recebimentos (empresa_id, unidade_id, device_id, uuid, entidade, operacao, payload, status, erro, tentativas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'ERRO',$8,1)
         ON CONFLICT (device_id, uuid) DO UPDATE SET status='ERRO', erro=EXCLUDED.erro, tentativas=sync_recebimentos.tentativas+1`,
        [eid, disp.unidade_id, device_id, ev.uuid, ev.entidade, ev.operacao, JSON.stringify(ev.payload || {}), String(err.message || err).slice(0, 380)]
      );
      resultados.push({ uuid: ev.uuid, status: "ERRO", erro: String(err.message || err).slice(0, 200) });
    }
  }

  await query("UPDATE pdv_dispositivos SET ultimo_sync = NOW() WHERE id = $1", [disp.id]);
  await registrarAuditoria(req.usuario.id, eid, "SYNC", "sync_recebimentos", null,
    `Sincronizou lote do terminal ${disp.nome}: ${resultados.length} evento(s)`, null, { resultados });
  res.json({ ok: true, resultados });
});

// Cria a venda definitiva a partir de um evento offline (idempotente por uuid).
async function processarVendaOffline(eid, disp, ev, usuarioId) {
  const uuid = ev.uuid;
  const p = ev.payload || {};

  // idempotência: já existe venda com este uuid?
  const existe = await query("SELECT id FROM vendas WHERE uuid_sync = $1", [uuid]);
  if (existe.rowCount) {
    await query(
      `INSERT INTO sync_recebimentos (empresa_id, unidade_id, device_id, uuid, entidade, operacao, payload, status, resultado_id, processado_em)
       VALUES ($1,$2,$3,$4,'venda','CREATE',$5,'PROCESSADO',$6,NOW())
       ON CONFLICT (device_id, uuid) DO NOTHING`,
      [eid, disp.unidade_id, disp.device_id, uuid, JSON.stringify(p), existe.rows[0].id]
    );
    return { venda_id: existe.rows[0].id, duplicada: true };
  }

  const itens = p.itens || [];
  if (!itens.length) throw new Error("Venda offline sem itens");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // M9 — vincula ao caixa CORRETO: usa o caixa do payload (caixa local da venda).
    // Se ele estiver fechado, mantém o vínculo e marca divergência (sem cair no caixa
    // que estiver aberto agora). Sem caixa no payload, usa o aberto (legado).
    let caixaId = null, caixaDivergente = false;
    if (p.caixa_id) {
      const cq = await client.query("SELECT id, status FROM caixas WHERE id=$1 AND empresa_id=$2", [p.caixa_id, eid]);
      if (cq.rowCount) { caixaId = cq.rows[0].id; caixaDivergente = cq.rows[0].status !== "ABERTO"; }
    }
    if (!caixaId) {
      const caixaQ = await client.query("SELECT id FROM caixas WHERE empresa_id = $1 AND status='ABERTO' ORDER BY aberto_em DESC LIMIT 1", [eid]);
      caixaId = caixaQ.rowCount ? caixaQ.rows[0].id : null;
    }
    const unidadeId = p.unidade_id || null;

    const vendaQ = await client.query(
      `INSERT INTO vendas (cliente_id, status, empresa_id, caixa_id, unidade_id, usuario_id, uuid_sync, origem, device_id, aberta_em, finalizada_em)
       VALUES ($1,'FINALIZADA',$2,$3,$4,$5,$6,'OFFLINE',$7, COALESCE($8, NOW()), NOW()) RETURNING id`,
      [p.cliente_id || null, eid, caixaId, unidadeId, usuarioId, uuid, disp.device_id, p.data_venda || null]
    );
    const vendaId = vendaQ.rows[0].id;

    // A3 — Preço autoritativo no sync: compara o praticado (offline) com o autorizado.
    const precificar = await criarPrecificador(client, eid, p.cliente_id || null);

    let total = 0;
    let divergencia = null;
    let divergenciaPreco = false;
    const divergenciasPreco = [];
    if (caixaDivergente) divergencia = `Caixa ${p.caixa_id} já estava FECHADO ao sincronizar`;
    for (const it of itens) {
      // PREÇO PRATICADO no momento da venda (não o atual da nuvem) — preservado como valor cobrado.
      const valorTotal = Number(it.quantidade) * Number(it.preco_unitario) - Number(it.desconto || 0);
      total += valorTotal;
      // baixa estoque; se ficar negativo, registra divergência (não bloqueia — venda já ocorreu no caixa)
      const prodQ = await client.query("SELECT id, estoque_atual, preco_venda, categoria_id FROM produtos WHERE id=$1 AND empresa_id=$2 FOR UPDATE", [it.produto_id, eid]);
      const saldoAntes = prodQ.rowCount ? Number(prodQ.rows[0].estoque_atual) : 0;
      const saldoDepois = saldoAntes - Number(it.quantidade);
      if (saldoDepois < 0) divergencia = `Estoque negativo no produto ${it.produto_id} (${saldoDepois})`;

      // Preço autorizado vs praticado
      let precoAutorizado = Number(it.preco_unitario);
      if (prodQ.rowCount) {
        const pr = await precificar(prodQ.rows[0], it.quantidade);
        precoAutorizado = pr.preco_unitario;
        if (Number(it.preco_unitario) < precoAutorizado - 0.005) {
          divergenciaPreco = true;
          divergenciasPreco.push({ produto_id: it.produto_id, praticado: Number(it.preco_unitario), autorizado: precoAutorizado, diferenca: +(precoAutorizado - Number(it.preco_unitario)).toFixed(2) });
        }
      }

      await client.query(
        `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, desconto, valor_total, preco_base)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [vendaId, it.produto_id, it.quantidade, it.preco_unitario, it.desconto || 0, valorTotal, precoAutorizado]
      );
      await client.query("UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id=$2 AND empresa_id=$3", [it.quantidade, it.produto_id, eid]);
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem, origem_id, unidade_id)
         VALUES ($1,'SAIDA_VENDA',$2,$3,$4,$5,$6,$7,'VENDA',$8,$9)`,
        [it.produto_id, it.quantidade, `Venda offline ${uuid.slice(0, 8)}`, eid, usuarioId, saldoAntes, saldoDepois, vendaId, unidadeId]
      );
    }
    if (divergenciaPreco) {
      const dif = divergenciasPreco.reduce((a, d) => a + d.diferenca * 1, 0);
      divergencia = `${divergencia ? divergencia + " | " : ""}Preço abaixo do autorizado (dif total R$ ${dif.toFixed(2)})`;
    }

    await client.query("UPDATE vendas SET valor_total=$1, divergencia=$2, divergencia_preco=$3 WHERE id=$4", [total, divergencia, divergenciaPreco, vendaId]);

    for (const pg of p.pagamentos || []) {
      await client.query("INSERT INTO venda_pagamentos (venda_id, forma, valor) VALUES ($1,$2,$3)", [vendaId, pg.forma, pg.valor]);
      if (caixaId) {
        await client.query(
          "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, forma_pagamento, observacao, empresa_id, usuario_id, referencia_id) VALUES ($1,'VENDA',$2,$3,$4,$5,$6,$7)",
          [caixaId, pg.valor, pg.forma, `Venda offline ${uuid.slice(0, 8)}`, eid, usuarioId, vendaId]
        );
      }
    }

    // Fiscal offline: deixa pendente de emissão em contingência (não emite agora)
    if (p.fiscal_pendente) {
      await client.query(
        `INSERT INTO fiscal_notas (empresa_id, venda_id, usuario_id, modelo, status, valor_total)
         VALUES ($1,$2,$3,'65','CONTINGENCIA_PENDENTE',$4)`,
        [eid, vendaId, usuarioId, total]
      );
    }

    await client.query(
      `INSERT INTO sync_recebimentos (empresa_id, unidade_id, device_id, uuid, entidade, operacao, payload, status, resultado_id, processado_em)
       VALUES ($1,$2,$3,$4,'venda','CREATE',$5,'PROCESSADO',$6,NOW())
       ON CONFLICT (device_id, uuid) DO NOTHING`,
      [eid, disp.unidade_id, disp.device_id, uuid, JSON.stringify(p), vendaId]
    );

    await client.query("COMMIT");
    if (divergenciaPreco) {
      await registrarAuditoria(usuarioId, eid, "SYNC_PRECO_DIVERGENTE", "vendas", vendaId,
        `Venda offline #${vendaId} sincronizada com preço abaixo do autorizado`, null, { divergencias: divergenciasPreco });
    }
    return { venda_id: vendaId, duplicada: false, divergencia, divergencia_preco: divergenciaPreco };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------- ALTERAÇÕES: deltas da nuvem para o terminal ----------
router.get("/alteracoes", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const { device_id, desde } = req.query;
    const disp = await dispositivoDaEmpresa(req, device_id);
    if (device_id && !disp) return res.status(403).json({ error: "Terminal inválido para esta empresa" });

    // delta simples: produtos alterados desde `desde` (preço/estoque) + fila outbox pendente
    const params = [eid];
    let sql = "SELECT id, codigo, nome, preco_venda, estoque_atual, categoria_id, atualizado_em FROM produtos WHERE empresa_id = $1 AND ativo = TRUE";
    if (desde) { params.push(desde); sql += ` AND atualizado_em > $${params.length}`; }
    const produtos = await query(sql, params);

    const outbox = await query(
      "SELECT id, entidade, operacao, payload FROM sync_outbox WHERE empresa_id = $1 AND status = 'PENDENTE' AND (device_id IS NULL OR device_id = $2) ORDER BY id LIMIT 500",
      [eid, device_id || null]
    );

    res.json({ gerado_em: new Date().toISOString(), produtos: produtos.rows, eventos: outbox.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- CONFIRMAR: terminal confirma processamento dos eventos do outbox ----------
router.post("/confirmar", requireAuth, async (req, res) => {
  try {
    const eid = empresaId(req);
    const { device_id, ids } = req.body;
    const disp = await dispositivoDaEmpresa(req, device_id);
    if (!disp) return res.status(403).json({ error: "Terminal inválido para esta empresa" });
    if (Array.isArray(ids) && ids.length) {
      await query(
        "UPDATE sync_outbox SET status='PROCESSADO', processado_em=NOW() WHERE empresa_id=$1 AND id = ANY($2::int[])",
        [eid, ids]
      );
    }
    res.json({ ok: true, confirmados: ids?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
