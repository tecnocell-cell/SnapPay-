// Motor Tributário — Calcula ICMS, PIS, COFINS, IPI baseado em regras
// Usa dados da empresa, produto, cliente e operação para determinar tributação

import { query } from "../db.js";

export async function calcularTributacao(opcoes) {
  const {
    empresa_id,
    produto_id,
    quantidade,
    valor_unitario,
    cliente_id,
    tipo_operacao = "VENDA_CONSUMIDOR",
    uf_destino = null,
    cfop_override = null,
  } = opcoes;

  // 1. Validações básicas
  if (!empresa_id || !produto_id) {
    throw new Error("Empresa e produto obrigatórios");
  }

  // 2. Carregar empresa (validar CRT, regime tributário)
  const empresaRes = await query(
    "SELECT id, crt, regime_tributario, uf FROM empresas WHERE id = $1",
    [empresa_id]
  );
  if (empresaRes.rowCount === 0) {
    throw new Error("Empresa não encontrada");
  }
  const empresa = empresaRes.rows[0];

  // 3. Carregar produto (validar NCM, CST, alíquotas)
  const produtoRes = await query(
    `SELECT id, ncm_codigo, cest_codigo, origem_mercadoria, cfop_padrao,
            cst_icms, cst_pis, cst_cofins, cst_ipi,
            aliquota_icms_padrao, aliquota_pis_padrao, aliquota_cofins_padrao, aliquota_ipi_padrao
     FROM produtos WHERE id = $1`,
    [produto_id]
  );
  if (produtoRes.rowCount === 0) {
    throw new Error("Produto não encontrado");
  }
  const produto = produtoRes.rows[0];

  // 4. Validar dados obrigatórios
  if (!produto.ncm_codigo) {
    throw new Error(`Produto ${produto_id} sem NCM — não pode emitir NFC-e`);
  }

  // Determinar UF de destino
  const ufDestino = uf_destino || empresa.uf;

  // 5. Determinar CFOP baseado no tipo de operação
  const cfop = cfop_override || (await determinarCFOP(tipo_operacao, ufDestino));

  // 6. Buscar alíquotas (usar padrão do produto se não houver alíquota específica)
  const aliquotas = await buscarAliquotas(
    produto.ncm_codigo,
    ufDestino,
    empresa.regime_tributario,
    produto
  );

  // 7. Calcular base de cálculo
  const valor_total = quantidade * valor_unitario;
  const base_icms = calcularBaseICMS(valor_total, aliquotas.cst_icms);

  // 8. Calcular tributos
  const valor_icms = (base_icms * aliquotas.aliquota_icms) / 100;
  const valor_pis = (valor_total * aliquotas.aliquota_pis) / 100;
  const valor_cofins = (valor_total * aliquotas.aliquota_cofins) / 100;
  const valor_ipi = (valor_total * aliquotas.aliquota_ipi) / 100;

  const valor_total_tributos = valor_icms + valor_pis + valor_cofins + valor_ipi;
  const percentual_tributos = (valor_total_tributos / valor_total) * 100;

  // 9. Retornar resultado estruturado
  return {
    // Dados de entrada
    quantidade,
    valor_unitario: parseFloat(valor_unitario),
    valor_total: parseFloat(valor_total.toFixed(2)),

    // Classificação fiscal
    ncm_codigo: produto.ncm_codigo,
    cest_codigo: produto.cest_codigo || null,
    origem_mercadoria: produto.origem_mercadoria || 0,
    cfop_codigo: cfop,
    tipo_operacao,

    // CST (Código Situação Tributária)
    cst_icms: aliquotas.cst_icms,
    cst_pis: aliquotas.cst_pis,
    cst_cofins: aliquotas.cst_cofins,
    cst_ipi: aliquotas.cst_ipi,

    // Alíquotas utilizadas
    aliquota_icms: parseFloat(aliquotas.aliquota_icms),
    aliquota_pis: parseFloat(aliquotas.aliquota_pis),
    aliquota_cofins: parseFloat(aliquotas.aliquota_cofins),
    aliquota_ipi: parseFloat(aliquotas.aliquota_ipi),

    // Bases de cálculo
    base_icms: parseFloat(base_icms.toFixed(2)),
    base_pis: parseFloat(valor_total.toFixed(2)),
    base_cofins: parseFloat(valor_total.toFixed(2)),
    base_ipi: parseFloat(valor_total.toFixed(2)),

    // Valores de tributos
    valor_icms: parseFloat(valor_icms.toFixed(2)),
    valor_pis: parseFloat(valor_pis.toFixed(2)),
    valor_cofins: parseFloat(valor_cofins.toFixed(2)),
    valor_ipi: parseFloat(valor_ipi.toFixed(2)),
    valor_total_tributos: parseFloat(valor_total_tributos.toFixed(2)),
    percentual_tributos: parseFloat(percentual_tributos.toFixed(2)),

    // Validações
    valido: true,
    avisos: [],
  };
}

// Determinar CFOP baseado em tipo de operação
async function determinarCFOP(tipoOperacao, ufDestino) {
  const cfopMap = {
    VENDA_CONSUMIDOR: "5101",
    VENDA_EMPRESA: "6101",
    TRANSFERENCIA: "5911",
    DEVOLUCAO: "5201",
    COMPRA: "1101",
  };

  return cfopMap[tipoOperacao] || "5101";
}

// Buscar alíquotas na tabela (ou usar padrão do produto)
async function buscarAliquotas(ncm, ufDestino, regimeTributario, produto) {
  // Tentar buscar alíquota específica
  const res = await query(
    `SELECT cst_icms, aliquota_icms, cst_pis, aliquota_pis,
            cst_cofins, aliquota_cofins, cst_ipi, aliquota_ipi
     FROM aliquotas_tributarias
     WHERE ncm_codigo = $1 AND uf_destino = $2 AND regime_tributario = $3 AND ativo = true
     LIMIT 1`,
    [ncm, ufDestino, regimeTributario]
  );

  if (res.rowCount > 0) {
    return res.rows[0];
  }

  // Usar padrão do produto (fallback)
  return {
    cst_icms: produto.cst_icms || "000",
    aliquota_icms: parseFloat(produto.aliquota_icms_padrao) || 18.0,
    cst_pis: produto.cst_pis || "01",
    aliquota_pis: parseFloat(produto.aliquota_pis_padrao) || 1.65,
    cst_cofins: produto.cst_cofins || "07",
    aliquota_cofins: parseFloat(produto.aliquota_cofins_padrao) || 7.6,
    cst_ipi: produto.cst_ipi || "00",
    aliquota_ipi: parseFloat(produto.aliquota_ipi_padrao) || 0.0,
  };
}

// Calcular base de ICMS (diferente conforme CST)
function calcularBaseICMS(valorTotal, cstICMS) {
  // CST 000 = Tributada (base = valor total)
  // CST 100 = ICMS suspenso (base = 0)
  // CST 900 = Outras (base = valor total)
  // Simplificado para MVP

  if (cstICMS === "100") {
    return 0;
  }

  return valorTotal;
}

// Validar se venda pode ser emitida (dados obrigatórios)
export async function validarEmissaoNFCe(empresaId, itensVenda) {
  const erros = [];

  // 1. Validar empresa
  const empresaRes = await query(
    "SELECT cnpj, crt FROM empresas WHERE id = $1",
    [empresaId]
  );
  if (empresaRes.rowCount === 0) {
    erros.push("Empresa não encontrada");
    return { valido: false, erros };
  }
  const empresa = empresaRes.rows[0];

  if (!empresa.cnpj) {
    erros.push("Empresa sem CNPJ — configure dados tributários");
  }
  if (!empresa.crt) {
    erros.push("Empresa sem CRT (Código Regime Tributário) — configure dados tributários");
  }

  // 2. Validar itens
  for (const item of itensVenda) {
    const prodRes = await query(
      "SELECT id, ncm_codigo FROM produtos WHERE id = $1",
      [item.produto_id]
    );

    if (prodRes.rowCount === 0) {
      erros.push(`Produto ${item.produto_id} não encontrado`);
      continue;
    }

    const produto = prodRes.rows[0];
    if (!produto.ncm_codigo) {
      erros.push(`Produto ${item.produto_id} sem NCM — não pode emitir NFC-e`);
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

// Gerar resumo tributário da venda (para relatório)
export async function gerarResumoTributario(vendaId) {
  const res = await query(
    `SELECT
       SUM(valor_icms) as total_icms,
       SUM(valor_pis) as total_pis,
       SUM(valor_cofins) as total_cofins,
       SUM(valor_ipi) as total_ipi,
       SUM(valor_icms + valor_pis + valor_cofins + valor_ipi) as total_tributos,
       SUM(valor_total) as valor_total,
       COUNT(*) as total_itens
     FROM venda_itens
     WHERE venda_id = $1`,
    [vendaId]
  );

  if (res.rowCount === 0) {
    return null;
  }

  const row = res.rows[0];

  return {
    venda_id: vendaId,
    total_icms: parseFloat(row.total_icms) || 0,
    total_pis: parseFloat(row.total_pis) || 0,
    total_cofins: parseFloat(row.total_cofins) || 0,
    total_ipi: parseFloat(row.total_ipi) || 0,
    total_tributos: parseFloat(row.total_tributos) || 0,
    valor_total: parseFloat(row.valor_total) || 0,
    total_itens: row.total_itens,
    percentual_tributos:
      row.valor_total > 0
        ? ((parseFloat(row.total_tributos) / parseFloat(row.valor_total)) * 100).toFixed(2)
        : 0,
  };
}
