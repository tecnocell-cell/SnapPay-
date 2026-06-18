// Diagnóstico + limpeza de dados de teste/homologação contra o banco real.
// Estratégia: SOFT-DELETE (ativo=FALSE). O PDV/catálogo só listam ativos,
// então os artefatos somem da base de demonstração sem violar FKs
// (venda_itens, estoque_movimentacao, etc.) nem perder histórico.
// Uso (dentro de backend/ para resolver 'pg'): node _limpeza_tmp.mjs
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "snappay",
});

const PROD_FILTRO = `
  nome ILIKE 'Produto Stress%' OR nome ILIKE 'Prod Gerente%'
  OR nome ILIKE 'Produto criado por operador%' OR nome ILIKE 'Produto Teste%'
  OR nome ILIKE 'Teste %' OR nome ILIKE '%homolog%'
  OR codigo ILIKE 'STRESS%' OR codigo ILIKE 'ST00%' OR codigo ILIKE 'TESTE%' OR codigo ILIKE 'OPE-TEST%'`;

const CAT_FILTRO = `
  nome ILIKE 'Cat56-%' OR nome ILIKE 'Cat_%' OR nome ILIKE 'Categoria Teste%'
  OR nome ILIKE 'Teste %' OR nome ILIKE '%homolog%'`;

async function main() {
  console.log("=== DIAGNÓSTICO (antes) ===");
  const prodAntes = await pool.query(`SELECT COUNT(*) FROM produtos WHERE (${PROD_FILTRO}) AND ativo = TRUE`);
  const catAntes = await pool.query(`SELECT COUNT(*) FROM categorias WHERE (${CAT_FILTRO}) AND ativo = TRUE`);
  console.log(`Produtos de teste ATIVOS: ${prodAntes.rows[0].count}`);
  console.log(`Categorias de teste ATIVAS: ${catAntes.rows[0].count}`);

  console.log("\n=== LIMPEZA (soft-delete) ===");
  const softProd = await pool.query(`UPDATE produtos SET ativo = FALSE WHERE (${PROD_FILTRO}) AND ativo = TRUE`);
  console.log(`Produtos inativados: ${softProd.rowCount}`);
  const softCat = await pool.query(`UPDATE categorias SET ativo = FALSE WHERE (${CAT_FILTRO}) AND ativo = TRUE`);
  console.log(`Categorias inativadas: ${softCat.rowCount}`);

  console.log("\n=== ESTADO (depois) ===");
  const restProd = await pool.query(`SELECT COUNT(*) FROM produtos WHERE (${PROD_FILTRO}) AND ativo = TRUE`);
  const restCat = await pool.query(`SELECT COUNT(*) FROM categorias WHERE (${CAT_FILTRO}) AND ativo = TRUE`);
  const totalProd = await pool.query("SELECT COUNT(*) FROM produtos WHERE ativo = TRUE");
  const totalCat = await pool.query("SELECT COUNT(*) FROM categorias WHERE ativo = TRUE");
  console.log(`Produtos de teste ainda ATIVOS: ${restProd.rows[0].count}`);
  console.log(`Categorias de teste ainda ATIVAS: ${restCat.rows[0].count}`);
  console.log(`Produtos ativos (total): ${totalProd.rows[0].count}`);
  console.log(`Categorias ativas (total): ${totalCat.rows[0].count}`);

  await pool.end();
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
