import express from "express";
import cors from "cors";
import "dotenv/config";
import { pool, query } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------------
// PRODUTOS
// ----------------------------------------------------------------------------
app.get("/api/produtos", async (req, res) => {
  const { q } = req.query;
  let sql =
    "SELECT id, codigo, barras, nome, unidade, preco_venda, estoque_atual, estoque_minimo FROM produtos WHERE ativo = TRUE";
  const params = [];
  if (q) {
    params.push(`%${q}%`, q);
    sql += " AND (nome ILIKE $1 OR barras = $2 OR codigo = $2)";
  }
  sql += " ORDER BY nome";
  const result = await query(sql, params);
  res.json(result.rows);
});

app.post("/api/produtos", async (req, res) => {
  const { codigo, barras, nome, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo } = req.body;
  if (!codigo || !nome) return res.status(400).json({ error: "Código e nome são obrigatórios" });
  try {
    const result = await query(
      `INSERT INTO produtos (codigo, barras, nome, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [codigo, barras || null, nome, unidade || "UN", preco_custo || 0, preco_venda || 0, estoque_atual || 0, estoque_minimo || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Código já cadastrado" });
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar produto" });
  }
});

app.put("/api/produtos/:id", async (req, res) => {
  const { barras, nome, unidade, preco_custo, preco_venda, estoque_minimo } = req.body;
  const result = await query(
    `UPDATE produtos SET barras = $1, nome = $2, unidade = $3, preco_custo = $4, preco_venda = $5, estoque_minimo = $6
     WHERE id = $7 RETURNING *`,
    [barras || null, nome, unidade || "UN", preco_custo || 0, preco_venda || 0, estoque_minimo || 0, req.params.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Produto não encontrado" });
  res.json(result.rows[0]);
});

app.delete("/api/produtos/:id", async (req, res) => {
  await query("UPDATE produtos SET ativo = FALSE WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ----------------------------------------------------------------------------
// VENDAS
// ----------------------------------------------------------------------------
app.post("/api/vendas", async (req, res) => {
  const { clienteId, itens } = req.body;
  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: "Venda sem itens" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const vendaResult = await client.query(
      "INSERT INTO vendas (cliente_id, status) VALUES ($1, 'ABERTA') RETURNING id",
      [clienteId || null]
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
      // baixa de estoque
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

    await client.query("COMMIT");
    res.status(201).json({ id: vendaId, total });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao finalizar venda" });
  } finally {
    client.release();
  }
});

app.get("/api/vendas/:id", async (req, res) => {
  const venda = await query("SELECT * FROM vendas WHERE id = $1", [req.params.id]);
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
     ORDER BY v.id DESC LIMIT 100`
  );
  res.json(result.rows);
});

app.post("/api/vendas/:id/cancelar", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = await client.query("SELECT status FROM vendas WHERE id = $1", [req.params.id]);
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
  let sql = "SELECT * FROM clientes WHERE ativo = TRUE";
  const params = [];
  if (q) {
    params.push(`%${q}%`, `%${q}%`);
    sql += " AND (nome ILIKE $1 OR cpf_cnpj ILIKE $2)";
  }
  sql += " ORDER BY nome";
  const result = await query(sql, params);
  res.json(result.rows);
});

app.post("/api/clientes", async (req, res) => {
  const { nome, cpf_cnpj, telefone, email, limite_credito } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  const result = await query(
    `INSERT INTO clientes (nome, cpf_cnpj, telefone, email, limite_credito)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nome, cpf_cnpj || null, telefone || null, email || null, limite_credito || 0]
  );
  res.status(201).json(result.rows[0]);
});

app.get("/api/clientes/:id/historico", async (req, res) => {
  const result = await query(
    "SELECT id, valor_total, status, finalizada_em FROM vendas WHERE cliente_id = $1 ORDER BY aberta_em DESC",
    [req.params.id]
  );
  res.json(result.rows);
});

// ----------------------------------------------------------------------------
// ESTOQUE (Sprint 2C)
// ----------------------------------------------------------------------------
app.get("/api/estoque/alertas", async (req, res) => {
  const result = await query(
    "SELECT id, codigo, nome, estoque_atual, estoque_minimo FROM produtos WHERE estoque_atual <= estoque_minimo AND ativo = TRUE ORDER BY estoque_atual"
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
  const hoje = await query(
    "SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM vendas WHERE status = 'FINALIZADA' AND finalizada_em::date = CURRENT_DATE"
  );
  const geral = await query(
    "SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS qtd FROM vendas WHERE status = 'FINALIZADA'"
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
     GROUP BY p.id, p.nome ORDER BY qtd DESC LIMIT $1`,
    [limite]
  );
  res.json(result.rows);
});

app.get("/api/relatorios/vendas-por-dia", async (req, res) => {
  const result = await query(
    `SELECT finalizada_em::date AS dia, COUNT(*) AS qtd, SUM(valor_total) AS total
     FROM vendas WHERE status = 'FINALIZADA' AND finalizada_em >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY finalizada_em::date ORDER BY dia`
  );
  res.json(result.rows);
});

app.get("/api/relatorios/pagamentos", async (req, res) => {
  const result = await query(
    `SELECT forma, COUNT(*) AS qtd, SUM(valor) AS total
     FROM venda_pagamentos GROUP BY forma ORDER BY total DESC`
  );
  res.json(result.rows);
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API do PDV rodando em http://localhost:${port}`));
