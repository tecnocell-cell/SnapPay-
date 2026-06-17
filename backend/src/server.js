import express from "express";
import cors from "cors";
import "dotenv/config";
import { pool, query } from "./db.js";
import { requireAuth, empresaId } from "./auth.js";
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

// ----------------------------------------------------------------------------
// VENDAS
// ----------------------------------------------------------------------------
app.post("/api/vendas", requireAuth, async (req, res) => {
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
      await client.query(
        "UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id = $2",
        [item.quantidade, item.produtoId]
      );
      await client.query(
        "INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao) VALUES ($1, 'SAIDA', $2, $3)",
        [item.produtoId, item.quantidade, `Venda #${vendaId}`]
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
    }

    // Registra entrada no caixa (vendas em dinheiro alimentam o saldo)
    if (caixaId) {
      await client.query(
        "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, observacao) VALUES ($1,'VENDA',$2,$3)",
        [caixaId, total, `Venda #${vendaId}`]
      );
    }

    await client.query("COMMIT");
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

app.post("/api/vendas/:id/cancelar", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = await client.query("SELECT status FROM vendas WHERE id = $1 AND empresa_id = $2", [req.params.id, empresaId(req)]);
    if (venda.rowCount === 0) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Venda não encontrada" }); }
    if (venda.rows[0].status === "CANCELADA") { await client.query("ROLLBACK"); return res.status(400).json({ error: "Venda já cancelada" }); }
    // devolve estoque
    const itens = await client.query("SELECT produto_id, quantidade FROM venda_itens WHERE venda_id = $1", [req.params.id]);
    for (const it of itens.rows) {
      await client.query("UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2", [it.quantidade, it.produto_id]);
      await client.query(
        "INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao) VALUES ($1, 'ENTRADA', $2, $3)",
        [it.produto_id, it.quantidade, `Estorno venda #${req.params.id}`]
      );
    }
    await client.query("UPDATE vendas SET status = 'CANCELADA' WHERE id = $1", [req.params.id]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar venda" });
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
app.get("/api/estoque/alertas", async (req, res) => {
  const result = await query(
    "SELECT id, codigo, nome, estoque_atual, estoque_minimo FROM produtos WHERE estoque_atual <= estoque_minimo AND ativo = TRUE AND empresa_id = $1 ORDER BY estoque_atual",
    [empresaId(req)]
  );
  res.json(result.rows);
});

app.post("/api/estoque/movimentar", async (req, res) => {
  const { produtoId, tipo, quantidade, observacao } = req.body;
  if (!produtoId || !tipo || !quantidade) {
    return res.status(400).json({ error: "Dados incompletos" });
  }
  const delta = tipo === "ENTRADA" ? quantidade : -quantidade;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2", [delta, produtoId]);
    await client.query(
      "INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao) VALUES ($1, $2, $3, $4)",
      [produtoId, tipo, quantidade, observacao || null]
    );
    await client.query("COMMIT");
    const prod = await query("SELECT id, nome, estoque_atual FROM produtos WHERE id = $1", [produtoId]);
    res.status(201).json(prod.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao movimentar estoque" });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------------
// RELATÓRIOS (Sprint 2B)
// ----------------------------------------------------------------------------
app.get("/api/relatorios/resumo", async (req, res) => {
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

app.get("/api/relatorios/top-produtos", async (req, res) => {
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

app.get("/api/relatorios/vendas-por-dia", async (req, res) => {
  const result = await query(
    `SELECT finalizada_em::date AS dia, COUNT(*) AS qtd, SUM(valor_total) AS total
     FROM vendas WHERE status = 'FINALIZADA' AND empresa_id = $1 AND finalizada_em >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY finalizada_em::date ORDER BY dia`,
    [empresaId(req)]
  );
  res.json(result.rows);
});

app.get("/api/relatorios/pagamentos", async (req, res) => {
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
