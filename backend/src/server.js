import express from "express";
import cors from "cors";
import "dotenv/config";
import { poolPromise, sql } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/produtos", async (req, res) => {
  const { q } = req.query;
  const pool = await poolPromise;
  const request = pool.request();
  let query = "SELECT id, codigo, barras, nome, unidade, preco_venda, estoque_atual FROM produtos WHERE ativo = 1";
  if (q) {
    request.input("q", sql.NVarChar, `%${q}%`);
    query += " AND (nome LIKE @q OR barras = @barras OR codigo = @codigo)";
    request.input("barras", sql.NVarChar, q);
    request.input("codigo", sql.NVarChar, q);
  }
  query += " ORDER BY nome";
  const result = await request.query(query);
  res.json(result.recordset);
});

app.post("/api/vendas", async (req, res) => {
  const { clienteId, itens } = req.body;
  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: "Venda sem itens" });
  }
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const vendaResult = await new sql.Request(transaction)
      .input("clienteId", sql.Int, clienteId || null)
      .query(
        "INSERT INTO vendas (cliente_id, status) OUTPUT INSERTED.id VALUES (@clienteId, 'ABERTA')"
      );
    const vendaId = vendaResult.recordset[0].id;

    let total = 0;
    for (const item of itens) {
      const valorTotal = item.quantidade * item.precoUnitario - (item.desconto || 0);
      total += valorTotal;
      await new sql.Request(transaction)
        .input("vendaId", sql.Int, vendaId)
        .input("produtoId", sql.Int, item.produtoId)
        .input("quantidade", sql.Decimal(12, 3), item.quantidade)
        .input("precoUnitario", sql.Decimal(12, 2), item.precoUnitario)
        .input("desconto", sql.Decimal(12, 2), item.desconto || 0)
        .input("valorTotal", sql.Decimal(12, 2), valorTotal)
        .query(
          `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, desconto, valor_total)
           VALUES (@vendaId, @produtoId, @quantidade, @precoUnitario, @desconto, @valorTotal)`
        );
    }

    await new sql.Request(transaction)
      .input("vendaId", sql.Int, vendaId)
      .input("total", sql.Decimal(12, 2), total)
      .query(
        "UPDATE vendas SET status = 'FINALIZADA', valor_total = @total, finalizada_em = SYSUTCDATETIME() WHERE id = @vendaId"
      );

    for (const pagamento of req.body.pagamentos || []) {
      await new sql.Request(transaction)
        .input("vendaId", sql.Int, vendaId)
        .input("forma", sql.NVarChar, pagamento.forma)
        .input("valor", sql.Decimal(12, 2), pagamento.valor)
        .query("INSERT INTO venda_pagamentos (venda_id, forma, valor) VALUES (@vendaId, @forma, @valor)");
    }

    await transaction.commit();
    res.status(201).json({ id: vendaId, total });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: "Erro ao finalizar venda" });
  }
});

app.get("/api/vendas/:id", async (req, res) => {
  const pool = await poolPromise;
  const venda = await pool
    .request()
    .input("id", sql.Int, req.params.id)
    .query("SELECT * FROM vendas WHERE id = @id");
  const itens = await pool
    .request()
    .input("id", sql.Int, req.params.id)
    .query(
      `SELECT vi.*, p.nome FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id WHERE vi.venda_id = @id`
    );
  res.json({ venda: venda.recordset[0], itens: itens.recordset });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API do PDV rodando em http://localhost:${port}`));
