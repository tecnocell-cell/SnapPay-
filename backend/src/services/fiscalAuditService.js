// Serviço de auditoria fiscal — registra mudanças em NCM, CFOP, CST, alíquotas, etc
// Persiste versão anterior e nova para análise

import { query } from "../db.js";

export class FiscalAuditService {
  // Campos fiscais monitorados
  static CAMPOS_MONITORADOS = [
    "ncm_codigo",
    "cest_codigo",
    "cfop_padrao",
    "cst_icms",
    "cst_pis",
    "cst_cofins",
    "cst_ipi",
    "aliquota_icms_padrao",
    "aliquota_pis_padrao",
    "aliquota_cofins_padrao",
    "aliquota_ipi_padrao",
    "origem_mercadoria",
  ];

  // Registrar mudança em produto
  static async registrarMudancaProduto(
    usuarioId,
    empresaId,
    produtoId,
    produtoAntes,
    produtoDepois
  ) {
    const mudancas = [];

    for (const campo of this.CAMPOS_MONITORADOS) {
      const valorAntes = produtoAntes?.[campo];
      const valorDepois = produtoDepois?.[campo];

      // Registra apenas se mudou
      if (valorAntes !== valorDepois) {
        mudancas.push({
          campo,
          valor_antes: valorAntes,
          valor_depois: valorDepois,
          tipo_mudanca: !valorAntes ? "CRIACAO" : !valorDepois ? "REMOCAO" : "ATUALIZACAO",
        });
      }
    }

    // Se teve mudanças, registra auditoria
    if (mudancas.length > 0) {
      try {
        await query(
          `INSERT INTO auditoria_fiscal
           (usuario_id, empresa_id, produto_id, tabela, tipo_mudanca, campo, valor_antes, valor_depois, atualizado_em)
           VALUES ($1, $2, $3, 'produtos', $4, $5, $6, $7, NOW())`,
          [
            usuarioId,
            empresaId,
            produtoId,
            "ATUALIZACAO",
            JSON.stringify(mudancas.map((m) => m.campo)),
            JSON.stringify(produtoAntes),
            JSON.stringify(produtoDepois),
          ]
        );
      } catch (err) {
        console.error("[FISCAL_AUDIT] Erro ao registrar mudança:", err);
        // Não falha a operação se auditoria falhar
      }
    }

    return mudancas;
  }

  // Registrar mudança em empresa
  static async registrarMudancaEmpresa(usuarioId, empresaId, empresaAntes, empresaDepois) {
    const campos_empresa = [
      "crt",
      "cnpj",
      "ie",
      "im",
      "cnae_principal",
      "regime_tributario",
    ];

    const mudancas = [];

    for (const campo of campos_empresa) {
      const valorAntes = empresaAntes?.[campo];
      const valorDepois = empresaDepois?.[campo];

      if (valorAntes !== valorDepois) {
        mudancas.push({
          campo,
          valor_antes: valorAntes,
          valor_depois: valorDepois,
        });
      }
    }

    if (mudancas.length > 0) {
      try {
        await query(
          `INSERT INTO auditoria_fiscal
           (usuario_id, empresa_id, tabela, tipo_mudanca, campo, valor_antes, valor_depois, atualizado_em)
           VALUES ($1, $2, 'empresas', $3, $4, $5, $6, NOW())`,
          [
            usuarioId,
            empresaId,
            "ATUALIZACAO",
            JSON.stringify(mudancas.map((m) => m.campo)),
            JSON.stringify(empresaAntes),
            JSON.stringify(empresaDepois),
          ]
        );
      } catch (err) {
        console.error("[FISCAL_AUDIT] Erro ao registrar mudança empresa:", err);
      }
    }

    return mudancas;
  }

  // Listar auditoria fiscal por empresa
  static async listarAuditoriaFiscal(empresaId, filtros = {}) {
    const { produto_id, usuario_id, tipo_mudanca, dias = 90, limit = 100 } = filtros;

    let sql = `
      SELECT
        id, usuario_id, produto_id, tabela, tipo_mudanca, campo,
        valor_antes, valor_depois, atualizado_em
      FROM auditoria_fiscal
      WHERE empresa_id = $1
        AND atualizado_em > NOW() - INTERVAL '${dias} days'
    `;

    const params = [empresaId];

    if (produto_id) {
      params.push(produto_id);
      sql += ` AND produto_id = $${params.length}`;
    }

    if (usuario_id) {
      params.push(usuario_id);
      sql += ` AND usuario_id = $${params.length}`;
    }

    if (tipo_mudanca) {
      params.push(tipo_mudanca);
      sql += ` AND tipo_mudanca = $${params.length}`;
    }

    sql += ` ORDER BY atualizado_em DESC LIMIT ${Math.min(limit, 500)}`;

    try {
      const result = await query(sql, params);
      return result.rows;
    } catch (err) {
      console.error("[FISCAL_AUDIT] Erro ao listar auditoria:", err);
      return [];
    }
  }

  // Gerar relatório de mudanças em alíquota
  static async gerarRelatoriAliquotasPorProduto(empresaId, produtoId) {
    try {
      const result = await query(
        `SELECT
          id, campo, valor_antes, valor_depois, usuario_id, atualizado_em
         FROM auditoria_fiscal
         WHERE empresa_id = $1 AND produto_id = $2
           AND campo LIKE '%aliquota%'
         ORDER BY atualizado_em DESC
         LIMIT 50`,
        [empresaId, produtoId]
      );

      return result.rows.map((row) => ({
        timestamp: row.atualizado_em,
        usuario_id: row.usuario_id,
        campo: row.campo,
        valor_antes: row.valor_antes,
        valor_depois: row.valor_depois,
      }));
    } catch (err) {
      console.error("[FISCAL_AUDIT] Erro gerar relatório alíquota:", err);
      return [];
    }
  }

  // Detectar mudanças suspeitas (ex: redução de alíquota para simular economia fiscal)
  static async detectarAnomaliasAliquota(empresaId, dias = 7) {
    try {
      const result = await query(
        `SELECT
          produto_id, campo, COUNT(*) as mudancas,
          AVG(CAST(valor_depois AS FLOAT) - CAST(valor_antes AS FLOAT)) as variacao_media
         FROM auditoria_fiscal
         WHERE empresa_id = $1
           AND campo LIKE '%aliquota%'
           AND atualizado_em > NOW() - INTERVAL '${dias} days'
         GROUP BY produto_id, campo
         HAVING AVG(CAST(valor_depois AS FLOAT) - CAST(valor_antes AS FLOAT)) < 0
         ORDER BY variacao_media ASC
         LIMIT 50`,
        [empresaId]
      );

      // Retorna mudanças onde alíquota foi REDUZIDA (anomalia potencial)
      return result.rows.filter((row) => row.variacao_media < 0);
    } catch (err) {
      console.error("[FISCAL_AUDIT] Erro detectar anomalias:", err);
      return [];
    }
  }

  // Bloqueio de mudanças fiscais não autorizadas (futuro: integrar com papéis)
  static async validarPermissaoMudancaFiscal(usuarioId, empresa_usuario_id, tipo_mudanca) {
    // Simplificado: apenas ADMIN/GERENTE podem mudar dados fiscais críticos
    // TODO: Integrar com sistema de papéis (requirePermissao)
    return true; // Por enquanto, permite todos
  }
}

export default FiscalAuditService;
