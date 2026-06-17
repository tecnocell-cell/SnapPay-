import express from "express";
import cors from "cors";
import "dotenv/config";
import { pool, query } from "./db.js";
import { requireAuth, empresaId, requirePermissao } from "./auth.js";
import { registrarAuditoria } from "./routes/auditoria.js";
import authRoutes from "./routes/auth.js";
import modulosRoutes from "./routes/modulos.js";
import categoriasRoutes from "./routes/categorias.js";
import caixaRoutes from "./routes/caixa.js";
import produtosRoutes from "./routes/produtos.js";
import marcasRoutes from "./routes/marcas.js";
import fornecedoresRoutes from "./routes/fornecedores.js";
import comprasRoutes from "./routes/compras.js";
import financeiroRoutes from "./routes/financeiro.js";
import configuracoes from "./routes/configuracoes.js";
import auditoriaRoutes from "./routes/auditoria.js";
import empresaRoutes from "./routes/empresa.js";
import inventarioRoutes from "./routes/inventario.js";
import fiscalRoutes from "./routes/fiscal.js";
import syncRoutes from "./routes/sync.js";
import precosRoutes from "./routes/precos.js";
import promocoesRoutes from "./routes/promocoes.js";
import unidadesRoutes from "./routes/unidades.js";

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------------
// FASE 0 — Fundação: auth, módulos, categorias, caixa
// FASE 2 — Gestão: fornecedores, compras, financeiro, configurações, auditoria
// (públicos: auth; privados: resto)
// ----------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/modulos", modulosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/caixa", caixaRoutes);

// A partir daqui, todo /api exige autenticação (login fica acima, é público)
app.use("/api", requireAuth);

// Fase 2 — Gestão
app.use("/api/fornecedores", fornecedoresRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/configuracoes", configuracoes);
app.use("/api/auditoria", auditoriaRoutes);

// Fase 3 — Produtos profissionais
app.use("/api/produtos", produtosRoutes);
app.use("/api/marcas", marcasRoutes);
app.use("/api/empresa", empresaRoutes);
app.use("/api/inventario", inventarioRoutes);

// Fase 4 — Fiscal (arquitetura plugável; provider mock em homologação)
app.use("/api/fiscal", fiscalRoutes);

// Fase 5 — Offline First / sincronização de terminais PDV
app.use("/api/sync", syncRoutes);

// Fase 6 — Consolidação comercial: tabelas de preço, promoções, multi-loja
app.use("/api/precos", precosRoutes);
app.use("/api/promocoes", promocoesRoutes);
app.use("/api/unidades", unidadesRoutes);

// ----------------------------------------------------------------------------
// VENDAS
// ----------------------------------------------------------------------------
app.post("/api/vendas", requireAuth, requirePermissao("vendas.criar"), async (req, res) => {
  const eid = empresaId(req);
  const { clienteId, itens } = req.body;
  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: "Venda sem itens" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validação de estoque (impede venda negativa) — bloqueia as linhas dos produtos
    for (const item of itens) {
      const prod = await client.query(
        "SELECT nome, estoque_atual FROM produtos WHERE id = $1 AND empresa_id = $2 FOR UPDATE",
        [item.produtoId, eid]
      );
      if (prod.rowCount === 0) throw { status: 400, msg: "Produto inexistente" };
      if (Number(prod.rows[0].estoque_atual) < Number(item.quantidade)) {
        throw { status: 409, msg: `Estoque insuficiente para "${prod.rows[0].nome}" (disponível: ${Number(prod.rows[0].estoque_atual)})` };
      }
    }

    // Caixa aberto (se houver) para vincular a venda
    const caixaAberto = await client.query(
      "SELECT id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO' ORDER BY aberto_em DESC LIMIT 1",
      [eid]
    );
    const caixaId = caixaAberto.rowCount > 0 ? caixaAberto.rows[0].id : null;

    const vendaResult = await client.query(
      "INSERT INTO vendas (cliente_id, status, empresa_id, caixa_id) VALUES ($1, 'ABERTA', $2, $3) RETURNING id",
      [clienteId || null, eid, caixaId]
    );
    const vendaId = vendaResult.rows[0].id;

    let total = 0;
    for (const item of itens) {
      const valorTotal = item.quantidade * item.precoUnitario - (item.desconto || 0);
      total += valorTotal;
      await client.query(
        `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, desconto, valor_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [vendaId, item.produtoId, item.quantidade, item.precoUnitario, item.desconto || 0, valorTotal]
      );
      const antes = await client.query("SELECT estoque_atual FROM produtos WHERE id = $1", [item.produtoId]);
      const saldoAntes = Number(antes.rows[0].estoque_atual);
      await client.query(
        "UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id = $2",
        [item.quantidade, item.produtoId]
      );
      const saldoDepois = saldoAntes - Number(item.quantidade);
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem, origem_id)
         VALUES ($1, 'SAIDA_VENDA', $2, $3, $4, $5, $6, $7, 'VENDA', $8)`,
        [item.produtoId, item.quantidade, `Venda #${vendaId}`, eid, req.usuario.id, saldoAntes, saldoDepois, vendaId]
      );
    }

    await client.query(
      "UPDATE vendas SET status = 'FINALIZADA', valor_total = $1, finalizada_em = NOW() WHERE id = $2",
      [total, vendaId]
    );

    for (const pagamento of req.body.pagamentos || []) {
      await client.query(
        "INSERT INTO venda_pagamentos (venda_id, forma, valor) VALUES ($1, $2, $3)",
        [vendaId, pagamento.forma, pagamento.valor]
      );
      // Cada pagamento vira um movimento de caixa COM forma_pagamento.
      // Só o DINHEIRO entra no saldo físico; PIX/cartão ficam no resumo eletrônico.
      if (caixaId) {
        await client.query(
          "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, forma_pagamento, observacao, empresa_id, usuario_id, referencia_id) VALUES ($1,'VENDA',$2,$3,$4,$5,$6,$7)",
          [caixaId, pagamento.valor, pagamento.forma, `Venda #${vendaId}`, eid, req.usuario.id, vendaId]
        );
      }
    }

    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "VENDA", "vendas", vendaId, `Finalizou venda #${vendaId} (R$ ${total.toFixed(2)})`, null, { id: vendaId, total });
    res.status(201).json({ id: vendaId, total, caixaId });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err && err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: "Erro ao finalizar venda" });
  } finally {
    client.release();
  }
});

app.get("/api/vendas/:id", async (req, res) => {
  const venda = await query("SELECT * FROM vendas WHERE id = $1 AND empresa_id = $2", [req.params.id, empresaId(req)]);
  if (venda.rowCount === 0) return res.status(404).json({ error: "Venda não encontrada" });
  const itens = await query(
    `SELECT vi.*, p.nome FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id WHERE vi.venda_id = $1`,
    [req.params.id]
  );
  res.json({ venda: venda.rows[0], itens: itens.rows });
});

app.get("/api/vendas", async (req, res) => {
  const result = await query(
    `SELECT v.id, v.valor_total, v.status, v.aberta_em, v.finalizada_em, c.nome AS cliente_nome,
            (SELECT string_agg(forma, ', ') FROM venda_pagamentos WHERE venda_id = v.id) AS formas
     FROM vendas v LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.empresa_id = $1
     ORDER BY v.id DESC LIMIT 100`,
    [empresaId(req)]
  );
  res.json(result.rows);
});

app.post("/api/vendas/:id/cancelar", requirePermissao("vendas.cancelar"), async (req, res) => {
  const eid = empresaId(req);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = await client.query("SELECT status FROM vendas WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (venda.rowCount === 0) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Venda não encontrada" }); }
    if (venda.rows[0].status === "CANCELADA") { await client.query("ROLLBACK"); return res.status(400).json({ error: "Venda já cancelada" }); }
    // Bloqueia cancelamento se houver nota fiscal autorizada/contingência (deve-se cancelar a nota antes)
    const notaAtiva = await client.query(
      "SELECT id FROM fiscal_notas WHERE venda_id = $1 AND status IN ('AUTORIZADA','CONTINGENCIA')",
      [req.params.id]
    );
    if (notaAtiva.rowCount > 0) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Venda possui NFC-e autorizada. Cancele a nota fiscal antes de cancelar a venda." }); }
    // devolve estoque
    const itens = await client.query("SELECT produto_id, quantidade FROM venda_itens WHERE venda_id = $1", [req.params.id]);
    for (const it of itens.rows) {
      const antes = await client.query("SELECT estoque_atual FROM produtos WHERE id = $1", [it.produto_id]);
      const saldoAntes = Number(antes.rows[0].estoque_atual);
      await client.query("UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2", [it.quantidade, it.produto_id]);
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem, origem_id)
         VALUES ($1, 'CANCELAMENTO_VENDA', $2, $3, $4, $5, $6, $7, 'VENDA', $8)`,
        [it.produto_id, it.quantidade, `Estorno venda #${req.params.id}`, eid, req.usuario.id, saldoAntes, saldoAntes + Number(it.quantidade), req.params.id]
      );
    }
    await client.query("UPDATE vendas SET status = 'CANCELADA' WHERE id = $1", [req.params.id]);
    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "UPDATE", "vendas", Number(req.params.id), `Cancelou venda #${req.params.id}`, null, null);
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar venda" });
  } finally {
    client.release();
  }
});

// DEVOLUÇÃO (total ou parcial) — body: { itens:[{produto_id, quantidade}], motivo }
app.post("/api/vendas/:id/devolver", requirePermissao("vendas.cancelar"), async (req, res) => {
  const eid = empresaId(req);
  const { itens, motivo } = req.body;
  if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ error: "Informe os itens a devolver" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = await client.query("SELECT status FROM vendas WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
    if (venda.rowCount === 0) throw { status: 404, msg: "Venda não encontrada" };
    if (venda.rows[0].status !== "FINALIZADA") throw { status: 400, msg: "Só é possível devolver itens de venda FINALIZADA" };

    // cria cabeçalho da devolução
    const devQ = await client.query(
      "INSERT INTO devolucoes (empresa_id, venda_id, usuario_id, motivo) VALUES ($1,$2,$3,$4) RETURNING id",
      [eid, req.params.id, req.usuario.id, motivo || null]
    );
    const devId = devQ.rows[0].id;
    let valorTotal = 0;

    for (const it of itens) {
      // item vendido
      const vi = await client.query(
        "SELECT quantidade, preco_unitario FROM venda_itens WHERE venda_id=$1 AND produto_id=$2",
        [req.params.id, it.produto_id]
      );
      if (vi.rowCount === 0) throw { status: 400, msg: `Produto ${it.produto_id} não está na venda` };
      const vendido = Number(vi.rows[0].quantidade);
      const precoUnit = Number(vi.rows[0].preco_unitario);
      // já devolvido deste item
      const jaDev = await client.query(
        `SELECT COALESCE(SUM(di.quantidade),0) AS q FROM devolucao_itens di
         JOIN devolucoes d ON d.id = di.devolucao_id
         WHERE d.venda_id=$1 AND di.produto_id=$2`,
        [req.params.id, it.produto_id]
      );
      const restante = vendido - Number(jaDev.rows[0].q);
      const qDev = Number(it.quantidade);
      if (qDev <= 0) throw { status: 400, msg: "Quantidade inválida" };
      if (qDev > restante) throw { status: 400, msg: `Devolução excede o disponível do produto ${it.produto_id} (resta ${restante})` };

      const valorItem = +(qDev * precoUnit).toFixed(2);
      valorTotal += valorItem;
      await client.query(
        "INSERT INTO devolucao_itens (devolucao_id, produto_id, quantidade, valor_unitario, valor_total) VALUES ($1,$2,$3,$4,$5)",
        [devId, it.produto_id, qDev, precoUnit, valorItem]
      );
      // retorna estoque + kardex DEVOLUCAO
      const antes = await client.query("SELECT estoque_atual FROM produtos WHERE id=$1", [it.produto_id]);
      const saldoAntes = Number(antes.rows[0].estoque_atual);
      await client.query("UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id=$2", [qDev, it.produto_id]);
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem, origem_id)
         VALUES ($1,'DEVOLUCAO',$2,$3,$4,$5,$6,$7,'DEVOLUCAO',$8)`,
        [it.produto_id, qDev, `Devolução venda #${req.params.id}`, eid, req.usuario.id, saldoAntes, saldoAntes + qDev, devId]
      );
    }

    await client.query("UPDATE devolucoes SET valor_total=$1 WHERE id=$2", [valorTotal, devId]);
    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "DEVOLUCAO", "devolucoes", devId, `Devolução da venda #${req.params.id} (R$ ${valorTotal.toFixed(2)})`, null, { itens, motivo });
    res.status(201).json({ id: devId, venda_id: Number(req.params.id), valor_total: valorTotal });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: "Erro ao processar devolução" });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// CLIENTES (Sprint 2D)
// ----------------------------------------------------------------------------
app.get("/api/clientes", async (req, res) => {
  const { q } = req.query;
  const params = [empresaId(req)];
  let sql = "SELECT * FROM clientes WHERE ativo = TRUE AND empresa_id = $1";
  if (q) {
    params.push(`%${q}%`, `%${q}%`);
    sql += ` AND (nome ILIKE $${params.length - 1} OR cpf_cnpj ILIKE $${params.length})`;
  }
  sql += " ORDER BY nome";
  const result = await query(sql, params);
  res.json(result.rows);
});

app.post("/api/clientes", async (req, res) => {
  const { nome, cpf_cnpj, telefone, email, limite_credito } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  const result = await query(
    `INSERT INTO clientes (nome, cpf_cnpj, telefone, email, limite_credito, empresa_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [nome, cpf_cnpj || null, telefone || null, email || null, limite_credito || 0, empresaId(req)]
  );
  res.status(201).json(result.rows[0]);
});

app.get("/api/clientes/:id/historico", async (req, res) => {
  const result = await query(
    "SELECT id, valor_total, status, finalizada_em FROM vendas WHERE cliente_id = $1 AND empresa_id = $2 ORDER BY aberta_em DESC",
    [req.params.id, empresaId(req)]
  );
  res.json(result.rows);
});

// ----------------------------------------------------------------------------
// ESTOQUE (Sprint 2C)
// ----------------------------------------------------------------------------
app.get("/api/estoque/alertas", requirePermissao("produtos.ver"), async (req, res) => {
  const result = await query(
    "SELECT id, codigo, nome, estoque_atual, estoque_minimo FROM produtos WHERE estoque_atual <= estoque_minimo AND ativo = TRUE AND empresa_id = $1 ORDER BY estoque_atual",
    [empresaId(req)]
  );
  res.json(result.rows);
});

app.post("/api/estoque/movimentar", requirePermissao("estoque.editar"), async (req, res) => {
  const eid = empresaId(req);
  const { produtoId, tipo, quantidade, observacao } = req.body;
  if (!produtoId || !tipo || !quantidade) {
    return res.status(400).json({ error: "Dados incompletos" });
  }
  const delta = tipo === "ENTRADA" ? Number(quantidade) : -Number(quantidade);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const antes = await client.query("SELECT estoque_atual FROM produtos WHERE id = $1 AND empresa_id = $2 FOR UPDATE", [produtoId, eid]);
    if (antes.rowCount === 0) throw { status: 404, msg: "Produto não encontrado" };
    const saldoAntes = Number(antes.rows[0].estoque_atual);
    const saldoDepois = saldoAntes + delta;
    await client.query("UPDATE produtos SET estoque_atual = $1 WHERE id = $2", [saldoDepois, produtoId]);
    await client.query(
      `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'AJUSTE')`,
      [produtoId, tipo === "ENTRADA" ? "AJUSTE_ENTRADA" : "AJUSTE_SAIDA", quantidade, observacao || null, eid, req.usuario.id, saldoAntes, saldoDepois]
    );
    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "UPDATE", "estoque_movimentacao", produtoId, `Ajuste manual de estoque (${tipo} ${quantidade})`, null, null);
    const prod = await query("SELECT id, nome, estoque_atual FROM produtos WHERE id = $1", [produtoId]);
    res.status(201).json(prod.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err && err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: "Erro ao movimentar estoque" });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// RELATÓRIOS (Sprint 2B)
// ----------------------------------------------------------------------------
app.get("/api/relatorios/resumo", requirePermissao("relatorios.ver"), async (req, res) => {
  const eid = empresaId(req);
  const hoje = await query(
    "SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM vendas WHERE status = 'FINALIZADA' AND empresa_id = $1 AND finalizada_em::date = CURRENT_DATE",
    [eid]
  );
  const geral = await query(
    "SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM vendas WHERE status = 'FINALIZADA' AND empresa_id = $1",
    [eid]
  );
  const ticket = Number(geral.rows[0].qtd) > 0 ? Number(geral.rows[0].total) / Number(geral.rows[0].qtd) : 0;
  res.json({
    hoje: { total: Number(hoje.rows[0].total), qtd: Number(hoje.rows[0].qtd) },
    geral: { total: Number(geral.rows[0].total), qtd: Number(geral.rows[0].qtd) },
    ticketMedio: ticket,
  });
});

app.get("/api/relatorios/top-produtos", requirePermissao("relatorios.ver"), async (req, res) => {
  const limite = Number(req.query.limite || 10);
  const result = await query(
    `SELECT p.id, p.nome, SUM(vi.quantidade) AS qtd, SUM(vi.valor_total) AS total
     FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id
     JOIN vendas v ON v.id = vi.venda_id AND v.status = 'FINALIZADA'
     WHERE v.empresa_id = $2
     GROUP BY p.id, p.nome ORDER BY qtd DESC LIMIT $1`,
    [limite, empresaId(req)]
  );
  res.json(result.rows);
});

app.get("/api/relatorios/vendas-por-dia", requirePermissao("relatorios.ver"), async (req, res) => {
  const result = await query(
    `SELECT finalizada_em::date AS dia, COUNT(*) AS qtd, SUM(valor_total) AS total
     FROM vendas WHERE status = 'FINALIZADA' AND empresa_id = $1 AND finalizada_em >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY finalizada_em::date ORDER BY dia`,
    [empresaId(req)]
  );
  res.json(result.rows);
});

app.get("/api/relatorios/pagamentos", requirePermissao("relatorios.ver"), async (req, res) => {
  const result = await query(
    `SELECT vp.forma, COUNT(*) AS qtd, SUM(vp.valor) AS total
     FROM venda_pagamentos vp JOIN vendas v ON v.id = vp.venda_id
     WHERE v.empresa_id = $1
     GROUP BY vp.forma ORDER BY total DESC`,
    [empresaId(req)]
  );
  res.json(result.rows);
});

// Tratador de erros do Express: captura erros (inclusive de rotas async que
// rejeitam) e responde 500 em vez de derrubar o processo.
app.use((err, req, res, next) => {
  console.error("Erro não tratado em rota:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || "Erro interno do servidor" });
});

// Rede de segurança a nível de processo: loga e segue em vez de matar o servidor.
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API do PDV rodando em http://localhost:${port}`));
