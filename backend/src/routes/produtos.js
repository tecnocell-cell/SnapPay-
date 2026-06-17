import express from "express";
import { query, empresaId } from "../db.js";

const router = express.Router();

// GET /produtos - Lista com busca e filtros
router.get("/", async (req, res) => {
  try {
    const eid = empresaId(req);
    const { q, categoria, marca, estoquebaixo } = req.query;
    let sql = "SELECT * FROM produtos WHERE empresa_id = $1";
    let params = [eid];

    if (q) {
      sql += ` AND (nome ILIKE $${params.length + 1} OR codigo = $${params.length + 1} OR barras = $${params.length + 1} OR sku = $${params.length + 1})`;
      params.push(`%${q}%`);
    }
    if (categoria) {
      sql += ` AND categoria_id = $${params.length + 1}`;
      params.push(categoria);
    }
    if (marca) {
      sql += ` AND marca_id = $${params.length + 1}`;
      params.push(marca);
    }
    if (estoquebaixo) {
      sql += ` AND estoque_atual <= estoque_minimo`;
    }

    sql += " ORDER BY nome";
    const prods = await query(sql, params);

    res.json(prods);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /produtos/:id - Detalhes do produto
router.get("/:id", async (req, res) => {
  try {
    const prod = await query("SELECT * FROM produtos WHERE id = $1 AND empresa_id = $2", [req.params.id, empresaId(req)]);
    if (!prod.length) return res.status(404).json({ error: "Produto não encontrado" });
    res.json(prod[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /produtos - Criar novo produto
router.post("/", async (req, res) => {
  try {
    const eid = empresaId(req);
    const {
      codigo, sku, barras, nome, descricao, unidade, marca_id, categoria_id, subcategoria,
      fornecedor_id, preco_custo, preco_venda, margem_lucro_pct, estoque_minimo, estoque_maximo,
      controla_estoque, permite_estoque_negativo, localizacao, ncm, cest, cfop, origem, unidade_tributavel
    } = req.body;

    // Validações obrigatórias
    if (!codigo || !nome) {
      return res.status(400).json({ error: "Código e nome são obrigatórios" });
    }

    // Verificar unicidade de código e SKU por empresa
    const existing = await query("SELECT id FROM produtos WHERE (codigo = $1 OR sku = $2) AND empresa_id = $3", [codigo, sku, eid]);
    if (existing.length) {
      return res.status(400).json({ error: "Código ou SKU já existente nesta empresa" });
    }

    // Calcular margem se não informada
    let margem_pct = margem_lucro_pct || 0;
    if (preco_custo && preco_venda && !margem_lucro_pct) {
      margem_pct = ((preco_venda - preco_custo) / preco_custo * 100).toFixed(2);
    }

    const result = await query(
      `INSERT INTO produtos (
        empresa_id, codigo, sku, barras, nome, descricao, unidade, marca_id, categoria_id, subcategoria,
        fornecedor_id, preco_custo, preco_venda, margem_lucro_pct, margem_lucro_valor,
        estoque_minimo, estoque_maximo, controla_estoque, permite_estoque_negativo, localizacao,
        ncm, cest, cfop, origem, unidade_tributavel, ativo, criado_em, atualizado_em
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, TRUE, NOW(), NOW()
      ) RETURNING *`,
      [eid, codigo, sku, barras, nome, descricao, unidade || "UN", marca_id, categoria_id, subcategoria,
        fornecedor_id, preco_custo || 0, preco_venda || 0, margem_pct, (preco_venda - preco_custo) || 0,
        estoque_minimo || 0, estoque_maximo || 999999, controla_estoque !== false, permite_estoque_negativo === true, localizacao,
        ncm, cest, cfop, origem, unidade_tributavel]
    );

    res.json(result[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /produtos/:id - Atualizar produto
router.put("/:id", async (req, res) => {
  try {
    const eid = empresaId(req);
    const {
      sku, barras, nome, descricao, unidade, marca_id, categoria_id, subcategoria,
      fornecedor_id, preco_custo, preco_venda, margem_lucro_pct, estoque_minimo, estoque_maximo,
      controla_estoque, permite_estoque_negativo, localizacao, ativo,
      preco_promocional, data_inicio_promo, data_fim_promo,
      ncm, cest, cfop, origem, unidade_tributavel
    } = req.body;

    const prod = await query("SELECT * FROM produtos WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    if (!prod.length) return res.status(404).json({ error: "Produto não encontrado" });

    // Calcular margem se preço foi alterado
    let margem_pct = margem_lucro_pct;
    let margem_valor = (preco_venda || prod[0].preco_venda) - (preco_custo || prod[0].preco_custo);

    if (preco_custo || preco_venda) {
      const custo = preco_custo !== undefined ? preco_custo : prod[0].preco_custo;
      const venda = preco_venda !== undefined ? preco_venda : prod[0].preco_venda;
      if (custo > 0) {
        margem_pct = ((venda - custo) / custo * 100).toFixed(2);
      }
      margem_valor = venda - custo;
    }

    const result = await query(
      `UPDATE produtos SET
        sku = COALESCE($1, sku),
        barras = COALESCE($2, barras),
        nome = COALESCE($3, nome),
        descricao = COALESCE($4, descricao),
        unidade = COALESCE($5, unidade),
        marca_id = COALESCE($6, marca_id),
        categoria_id = COALESCE($7, categoria_id),
        subcategoria = COALESCE($8, subcategoria),
        fornecedor_id = COALESCE($9, fornecedor_id),
        preco_custo = COALESCE($10, preco_custo),
        preco_venda = COALESCE($11, preco_venda),
        margem_lucro_pct = COALESCE($12, margem_lucro_pct),
        margem_lucro_valor = COALESCE($13, margem_lucro_valor),
        estoque_minimo = COALESCE($14, estoque_minimo),
        estoque_maximo = COALESCE($15, estoque_maximo),
        controla_estoque = COALESCE($16, controla_estoque),
        permite_estoque_negativo = COALESCE($17, permite_estoque_negativo),
        localizacao = COALESCE($18, localizacao),
        preco_promocional = COALESCE($19, preco_promocional),
        data_inicio_promo = COALESCE($20, data_inicio_promo),
        data_fim_promo = COALESCE($21, data_fim_promo),
        ncm = COALESCE($22, ncm),
        cest = COALESCE($23, cest),
        cfop = COALESCE($24, cfop),
        origem = COALESCE($25, origem),
        unidade_tributavel = COALESCE($26, unidade_tributavel),
        ativo = COALESCE($27, ativo),
        atualizado_em = NOW()
      WHERE id = $28 AND empresa_id = $29
      RETURNING *`,
      [sku, barras, nome, descricao, unidade, marca_id, categoria_id, subcategoria,
        fornecedor_id, preco_custo, preco_venda, margem_pct, margem_valor, estoque_minimo, estoque_maximo,
        controla_estoque, permite_estoque_negativo, localizacao,
        preco_promocional, data_inicio_promo, data_fim_promo,
        ncm, cest, cfop, origem, unidade_tributavel,
        ativo, req.params.id, eid]
    );

    res.json(result[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /produtos/:id - Soft delete
router.delete("/:id", async (req, res) => {
  try {
    const eid = empresaId(req);
    await query("UPDATE produtos SET ativo = FALSE, atualizado_em = NOW() WHERE id = $1 AND empresa_id = $2", [req.params.id, eid]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /produtos/kardex/:id - Histórico de movimentações do produto
router.get("/kardex/:id", async (req, res) => {
  try {
    const eid = empresaId(req);
    const { data_inicio, data_fim } = req.query;

    let sql = `
      SELECT em.*, u.nome as usuario_nome, p.nome as produto_nome
      FROM estoque_movimentacao em
      LEFT JOIN usuarios u ON u.id = em.usuario_id
      JOIN produtos p ON p.id = em.produto_id
      WHERE em.produto_id = $1 AND em.empresa_id = $2
    `;
    let params = [req.params.id, eid];

    if (data_inicio) {
      sql += ` AND em.criado_em >= $${params.length + 1}`;
      params.push(data_inicio);
    }
    if (data_fim) {
      sql += ` AND em.criado_em <= $${params.length + 1}`;
      params.push(data_fim);
    }

    sql += " ORDER BY em.criado_em DESC LIMIT 1000";
    const movimentacoes = await query(sql, params);
    res.json(movimentacoes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
