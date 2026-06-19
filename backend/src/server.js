import express from "express";
import cors from "cors";
import "dotenv/config";
import { pool, query } from "./db.js";
import { requireAuth, empresaId, requirePermissao, autorizarGerente } from "./auth.js";
import { registrarAuditoria } from "./routes/auditoria.js";
import { criarPrecificador } from "./precificacao.js";
// Fase 9 — Motor Tributário
import { calcularTributacao } from "./services/tributacaoService.js";
// Fase 8 — Impressão + Auditoria
import PrinterService from "../local/printer/printerService.js";
import AuditService from "../local/printer/auditService.js";
import PaymentPrinterService from "../local/printer/paymentPrinterService.js";
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
import fiscalprofilesRoutes from "./routes/fiscalprofiles.js";
import syncRoutes from "./routes/sync.js";
import precosRoutes from "./routes/precos.js";
import promocoesRoutes from "./routes/promocoes.js";
import unidadesRoutes from "./routes/unidades.js";
import terminalRoutes from "./routes/terminal.js";

const app = express();
app.use(cors());
app.use(express.json());

// Fase 8 — Inicializar serviços de impressão
const printerService = new PrinterService({ provider: "MOCK" });
const auditService = new AuditService();
const paymentPrinterService = new PaymentPrinterService(printerService, auditService);

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

// Fase 9 — Perfis Fiscais (presets por segmento)
app.use("/api/fiscal-profiles", fiscalprofilesRoutes);

// Fase 5 — Offline First / sincronização de terminais PDV
app.use("/api/sync", syncRoutes);

// Fase 6 — Consolidação comercial: tabelas de preço, promoções, multi-loja
app.use("/api/precos", precosRoutes);
app.use("/api/promocoes", promocoesRoutes);
app.use("/api/unidades", unidadesRoutes);

// Fase 8 — Terminal PDV
app.use("/api/terminal", terminalRoutes);

// ----------------------------------------------------------------------------
// VENDAS
// ----------------------------------------------------------------------------
app.post("/api/vendas", requireAuth, requirePermissao("vendas.criar"), async (req, res) => {
  const eid = empresaId(req);
  const { clienteId, itens } = req.body;
  const idem = req.body.idempotency_key || req.body.uuid_venda || null;
  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: "Venda sem itens" });
  }

  // A2 — Idempotência: mesma chave devolve a venda já criada (sem duplicar).
  if (idem) {
    const ex = await query("SELECT id, valor_total FROM vendas WHERE empresa_id=$1 AND idempotency_key=$2", [eid, idem]);
    if (ex.rowCount) return res.status(200).json({ id: ex.rows[0].id, total: Number(ex.rows[0].valor_total), idempotent: true });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // C1 — Caixa aberto define a UNIDADE da venda (matriz vende da matriz, filial da filial).
    const caixaAberto = await client.query(
      "SELECT id, unidade_id FROM caixas WHERE empresa_id = $1 AND status = 'ABERTO' ORDER BY aberto_em DESC LIMIT 1",
      [eid]
    );
    const caixaId = caixaAberto.rowCount > 0 ? caixaAberto.rows[0].id : null;
    const unidadeId = caixaAberto.rowCount > 0 ? caixaAberto.rows[0].unidade_id : null;

    // Carrega+bloqueia produtos (FOR UPDATE) e valida estoque.
    // C1 — quando o caixa tem loja E o produto tem saldo por loja (estoque_unidade),
    // a loja é a restrição; senão valida o consolidado (produtos.estoque_atual).
    const prodCache = {};
    for (const item of itens) {
      const prod = await client.query(
        "SELECT id, nome, estoque_atual, preco_venda, categoria_id FROM produtos WHERE id = $1 AND empresa_id = $2 FOR UPDATE",
        [item.produtoId, eid]
      );
      if (prod.rowCount === 0) throw { status: 400, msg: "Produto inexistente" };
      let validadoPorLoja = false;
      if (unidadeId) {
        const eu = await client.query(
          "SELECT quantidade FROM estoque_unidade WHERE unidade_id=$1 AND produto_id=$2 FOR UPDATE",
          [unidadeId, item.produtoId]
        );
        if (eu.rowCount > 0) {
          validadoPorLoja = true;
          if (Number(eu.rows[0].quantidade) < Number(item.quantidade)) {
            throw { status: 409, msg: `Estoque insuficiente na loja para "${prod.rows[0].nome}" (disponível: ${Number(eu.rows[0].quantidade)})` };
          }
        }
      }
      if (!validadoPorLoja && Number(prod.rows[0].estoque_atual) < Number(item.quantidade)) {
        throw { status: 409, msg: `Estoque insuficiente para "${prod.rows[0].nome}" (disponível: ${Number(prod.rows[0].estoque_atual)})` };
      }
      prodCache[item.produtoId] = prod.rows[0];
    }

    const vendaResult = await client.query(
      "INSERT INTO vendas (cliente_id, status, empresa_id, caixa_id, unidade_id, usuario_id, idempotency_key) VALUES ($1, 'ABERTA', $2, $3, $4, $5, $6) RETURNING id",
      [clienteId || null, eid, caixaId, unidadeId, req.usuario.id, idem]
    );
    const vendaId = vendaResult.rows[0].id;

    // PREÇO AUTORITATIVO: o servidor recalcula base/tabela/promoção. O preço do PDV é só sugestão.
    const precificar = await criarPrecificador(client, eid, clienteId || null);

    // Buscar UF da empresa para motor tributário
    const empresaUfRes = await client.query("SELECT uf FROM empresas WHERE id = $1", [eid]);
    const ufEmpresa = empresaUfRes.rowCount > 0 ? empresaUfRes.rows[0].uf : "SP";

    let total = 0;
    for (const item of itens) {
      const prod = prodCache[item.produtoId];
      const pr = await precificar(prod, item.quantidade);

      // Trava de segurança: operador não pode FORÇAR preço menor que o autorizado via API.
      if (item.precoUnitario != null && Number(item.precoUnitario) < pr.preco_unitario - 0.005) {
        throw { status: 409, msg: `Preço abaixo do autorizado para "${prod.nome}": enviado R$ ${Number(item.precoUnitario).toFixed(2)}, autorizado R$ ${pr.preco_unitario.toFixed(2)}` };
      }

      // Desconto = promoção (servidor) + desconto manual informado (operador), limitado ao bruto.
      const descontoManual = Math.max(0, Number(item.desconto || 0));
      const bruto = +(item.quantidade * pr.preco_unitario).toFixed(2);
      const descontoItem = Math.min(bruto, +(pr.desconto_promo + descontoManual).toFixed(2));
      const valorTotal = +(bruto - descontoItem).toFixed(2);
      total += valorTotal;

      // Fase 9 — Motor Tributário: calcular ICMS, PIS, COFINS, IPI
      let tributacao = null;
      try {
        tributacao = await calcularTributacao({
          empresa_id: eid,
          produto_id: item.produtoId,
          quantidade: item.quantidade,
          valor_unitario: pr.preco_unitario,
          tipo_operacao: "VENDA_CONSUMIDOR",
          uf_destino: ufEmpresa,
        });
      } catch (errTrib) {
        // Tributação é informativa: se falhar, venda continua mas sem dados fiscais
        console.warn(`[TRIBUTACAO] Falha ao calcular tributos para item ${item.produtoId}:`, errTrib.message);
        tributacao = null;
      }

      await client.query(
        `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, desconto, valor_total,
                                  preco_base, tabela_preco_id, promocao_id, desconto_promo, desconto_manual,
                                  ncm_codigo, cfop_codigo, cst_icms, cst_pis, cst_cofins, cst_ipi,
                                  aliquota_icms, aliquota_pis, aliquota_cofins, aliquota_ipi,
                                  base_icms, valor_icms, valor_pis, valor_cofins, valor_ipi)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
        [vendaId, item.produtoId, item.quantidade, pr.preco_unitario, descontoItem, valorTotal,
          pr.preco_base, pr.tabela_preco_id, pr.promocao_id, pr.desconto_promo, descontoManual,
          tributacao?.ncm_codigo || null, tributacao?.cfop_codigo || null,
          tributacao?.cst_icms || null, tributacao?.cst_pis || null, tributacao?.cst_cofins || null, tributacao?.cst_ipi || null,
          tributacao?.aliquota_icms || null, tributacao?.aliquota_pis || null, tributacao?.aliquota_cofins || null, tributacao?.aliquota_ipi || null,
          tributacao?.base_icms || null, tributacao?.valor_icms || null, tributacao?.valor_pis || null, tributacao?.valor_cofins || null, tributacao?.valor_ipi || null]
      );
      const saldoAntes = Number(prod.estoque_atual);
      // Estoque global (consolidado) sempre baixa.
      await client.query(
        "UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id = $2",
        [item.quantidade, item.produtoId]
      );
      // C1 — Estoque da UNIDADE do caixa também baixa (no-op se o produto não é controlado por loja).
      if (unidadeId) {
        await client.query(
          "UPDATE estoque_unidade SET quantidade = quantidade - $1 WHERE unidade_id=$2 AND produto_id=$3",
          [item.quantidade, unidadeId, item.produtoId]
        );
      }
      const saldoDepois = saldoAntes - Number(item.quantidade);
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem, origem_id, unidade_id)
         VALUES ($1, 'SAIDA_VENDA', $2, $3, $4, $5, $6, $7, 'VENDA', $8, $9)`,
        [item.produtoId, item.quantidade, `Venda #${vendaId}`, eid, req.usuario.id, saldoAntes, saldoDepois, vendaId, unidadeId]
      );
    }

    total = +total.toFixed(2);

    // Reconciliação preview × fechamento: se o total recalculado divergir do
    // previsto pelo PDV e o operador não confirmou o ajuste, rejeita (e audita).
    if (req.body.total_esperado != null) {
      const previsto = Number(req.body.total_esperado);
      if (Math.abs(total - previsto) > 0.01 && req.body.confirmar_ajuste !== true) {
        await client.query("ROLLBACK");
        await registrarAuditoria(req.usuario.id, eid, "DIVERGENCIA_PRECO", "vendas", null,
          `Divergência preview×fechamento: previsto R$ ${previsto.toFixed(2)}, correto R$ ${total.toFixed(2)}`, null,
          { previsto, total_correto: total });
        return res.status(409).json({ error: `Preço recalculado: total correto R$ ${total.toFixed(2)} (previsto R$ ${previsto.toFixed(2)})`, total_correto: total, total_previsto: previsto, requer_confirmacao: true });
      }
      if (Math.abs(total - previsto) > 0.01 && req.body.confirmar_ajuste === true) {
        await registrarAuditoria(req.usuario.id, eid, "AJUSTE_PRECO_CONFIRMADO", "vendas", vendaId,
          `Operador confirmou ajuste: previsto R$ ${previsto.toFixed(2)}, cobrado R$ ${total.toFixed(2)}`, null,
          { previsto, total_correto: total });
      }
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

    // Fase 8 — Impressão (pós-commit: venda é válida mesmo se impressão falhar)
    // Executado em background para não bloquear resposta ao cliente
    setImmediate(async () => {
      try {
        const empresaRes = await query("SELECT nome, cnpj FROM empresas WHERE id = $1", [eid]);
        const empresa = empresaRes.rows[0] || { nome: "SnapPay", cnpj: "00.000.000/0000-00" };

        // Recuperar itens da venda após commit
        const vendaItensRes = await query(
          `SELECT vi.*, p.nome FROM venda_itens vi
           JOIN produtos p ON p.id = vi.produto_id
           WHERE vi.venda_id = $1`,
          [vendaId]
        );

        const vendaObj = {
          numero: String(vendaId).padStart(7, "0"),
          id: vendaId,
          total: total,
          subtotal: total,
          desconto: 0,
          acrescimo: 0,
          formaPagamento: (req.body.pagamentos && req.body.pagamentos[0]) ? req.body.pagamentos[0].forma : "DINHEIRO",
          itens: vendaItensRes.rows.map(item => ({
            produto: item.nome,
            preco: Number(item.preco_unitario),
            qtd: Number(item.quantidade),
          })),
          unidade: unidadeId ? `Unidade #${unidadeId}` : "Matriz",
        };

        await paymentPrinterService.finalizarVenda(vendaObj, empresa, req.usuario.nome || "Operador");
      } catch (errImp) {
        console.error("[IMPRESSAO] Falha ao imprimir venda:", errImp.message);
        // Não rollback: venda é válida mesmo se impressão falhar
      }
    });
    await registrarAuditoria(req.usuario.id, eid, "VENDA", "vendas", vendaId, `Finalizou venda #${vendaId} (R$ ${total.toFixed(2)})`, null, { id: vendaId, total });
    res.status(201).json({ id: vendaId, total, caixaId });
  } catch (err) {
    await client.query("ROLLBACK");
    // A2 — corrida de idempotência: a chave já foi gravada por requisição paralela.
    if (err && err.code === "23505" && idem) {
      const ex = await query("SELECT id, valor_total FROM vendas WHERE empresa_id=$1 AND idempotency_key=$2", [eid, idem]);
      if (ex.rowCount) return res.status(200).json({ id: ex.rows[0].id, total: Number(ex.rows[0].valor_total), idempotent: true });
    }
    if (err && err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: "Erro ao finalizar venda" });
  } finally {
    client.release();
  }
});

app.get("/api/vendas/:id", requirePermissao("vendas.criar"), async (req, res) => {
  const venda = await query("SELECT * FROM vendas WHERE id = $1 AND empresa_id = $2", [req.params.id, empresaId(req)]);
  if (venda.rowCount === 0) return res.status(404).json({ error: "Venda não encontrada" });
  const itens = await query(
    `SELECT vi.*, p.nome FROM venda_itens vi JOIN produtos p ON p.id = vi.produto_id WHERE vi.venda_id = $1`,
    [req.params.id]
  );
  res.json({ venda: venda.rows[0], itens: itens.rows });
});

app.get("/api/vendas", requirePermissao("vendas.criar"), async (req, res) => {
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
  const { motivo, senha_autorizacao } = req.body || {};
  const formaEstorno = (req.body?.forma_estorno || "").toUpperCase();
  // Autorização protegida: motivo obrigatório + senha de gerente/admin.
  if (!motivo || !motivo.trim()) return res.status(400).json({ error: "Motivo do cancelamento é obrigatório" });
  const autorizador = await autorizarGerente(eid, senha_autorizacao);
  if (!autorizador) {
    await registrarAuditoria(req.usuario.id, eid, "AUTORIZACAO_NEGADA", "vendas", Number(req.params.id),
      `Tentativa de cancelar venda #${req.params.id} sem autorização válida`, null, { motivo });
    return res.status(403).json({ error: "Cancelamento exige senha de gerente/administrador" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = await client.query("SELECT status, cliente_id, valor_total FROM vendas WHERE id = $1 AND empresa_id = $2 FOR UPDATE", [req.params.id, eid]);
    if (venda.rowCount === 0) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Venda não encontrada" }); }
    if (venda.rows[0].status === "CANCELADA") { await client.query("ROLLBACK"); return res.status(400).json({ error: "Venda já cancelada" }); }

    // A1 — Nunca cancelar venda finalizada sem registrar impacto financeiro.
    // forma_estorno: CAIXA (estorna no caixa atual) | CREDITO_LOJA (vale p/ cliente) | AJUSTE_PENDENTE (conta a pagar).
    const caixaAbertoQ = await client.query("SELECT id FROM caixas WHERE empresa_id=$1 AND status='ABERTO' ORDER BY aberto_em DESC LIMIT 1", [eid]);
    const temCaixa = caixaAbertoQ.rowCount > 0;
    const FORMAS_ESTORNO = ["CAIXA", "CREDITO_LOJA", "AJUSTE_PENDENTE"];
    const forma = formaEstorno || (temCaixa ? "CAIXA" : "");
    if (!FORMAS_ESTORNO.includes(forma)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Escolha a forma de estorno: CAIXA (exige caixa aberto), CREDITO_LOJA ou AJUSTE_PENDENTE", requer_forma_estorno: true, caixa_aberto: temCaixa });
    }
    if (forma === "CAIXA" && !temCaixa) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Não há caixa aberto para estornar. Abra o caixa ou escolha CREDITO_LOJA / AJUSTE_PENDENTE", requer_forma_estorno: true, caixa_aberto: false });
    }
    if (forma === "CREDITO_LOJA" && !venda.rows[0].cliente_id) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Crédito de loja exige cliente identificado na venda", requer_forma_estorno: true });
    }
    // Bloqueia cancelamento se houver nota fiscal autorizada/contingência (deve-se cancelar a nota antes)
    const notaAtiva = await client.query(
      "SELECT id FROM fiscal_notas WHERE venda_id = $1 AND status IN ('AUTORIZADA','CONTINGENCIA')",
      [req.params.id]
    );
    if (notaAtiva.rowCount > 0) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Venda possui NFC-e autorizada. Cancele a nota fiscal antes de cancelar a venda." }); }
    // devolve estoque — apenas a quantidade AINDA NÃO devolvida por devoluções
    // parciais anteriores (senão o estoque seria estornado em dobro).
    const itens = await client.query("SELECT produto_id, quantidade FROM venda_itens WHERE venda_id = $1", [req.params.id]);
    for (const it of itens.rows) {
      const jaDevQ = await client.query(
        `SELECT COALESCE(SUM(di.quantidade),0) AS q FROM devolucao_itens di
         JOIN devolucoes d ON d.id = di.devolucao_id
         WHERE d.venda_id = $1 AND di.produto_id = $2`,
        [req.params.id, it.produto_id]
      );
      const retornar = Number(it.quantidade) - Number(jaDevQ.rows[0].q);
      if (retornar <= 0) continue; // tudo já devolvido: nada a estornar
      const antes = await client.query("SELECT estoque_atual FROM produtos WHERE id = $1", [it.produto_id]);
      const saldoAntes = Number(antes.rows[0].estoque_atual);
      await client.query("UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2", [retornar, it.produto_id]);
      await client.query(
        `INSERT INTO estoque_movimentacao (produto_id, tipo, quantidade, observacao, empresa_id, usuario_id, saldo_anterior, saldo_posterior, origem, origem_id)
         VALUES ($1, 'CANCELAMENTO_VENDA', $2, $3, $4, $5, $6, $7, 'VENDA', $8)`,
        [it.produto_id, retornar, `Estorno venda #${req.params.id}`, eid, req.usuario.id, saldoAntes, saldoAntes + retornar, req.params.id]
      );
    }
    // IMPACTO FINANCEIRO obrigatório conforme a forma escolhida.
    const valorVenda = Number(venda.rows[0].valor_total) || 0;
    if (forma === "CAIXA") {
      // Estorna no caixa atual conforme a forma de pagamento original.
      const pags = await client.query("SELECT forma, valor FROM venda_pagamentos WHERE venda_id = $1", [req.params.id]);
      for (const pg of pags.rows) {
        await client.query(
          "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, forma_pagamento, observacao, empresa_id, usuario_id, referencia_id, origem) VALUES ($1,'DEVOLUCAO',$2,$3,$4,$5,$6,$7,'CANCELAMENTO')",
          [caixaAbertoQ.rows[0].id, pg.valor, pg.forma, `Cancelamento venda #${req.params.id}`, eid, req.usuario.id, Number(req.params.id)]
        );
      }
    } else if (forma === "CREDITO_LOJA") {
      await client.query(
        "INSERT INTO creditos_cliente (empresa_id, cliente_id, origem, origem_id, valor, saldo) VALUES ($1,$2,'CANCELAMENTO',$3,$4,$4)",
        [eid, venda.rows[0].cliente_id, Number(req.params.id), valorVenda]
      );
    } else if (forma === "AJUSTE_PENDENTE") {
      await client.query(
        `INSERT INTO contas_pagar (empresa_id, fornecedor_id, valor, data_vencimento, status, observacoes, origem, criado_em)
         VALUES ($1, NULL, $2, CURRENT_DATE, 'PENDENTE', $3, 'ESTORNO_VENDA', NOW())`,
        [eid, valorVenda, `Estorno pendente do cancelamento da venda #${req.params.id} — ${motivo}`]
      );
    }

    await client.query("UPDATE vendas SET status = 'CANCELADA' WHERE id = $1", [req.params.id]);
    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "CANCELAMENTO_VENDA", "vendas", Number(req.params.id),
      `Cancelou venda #${req.params.id} (R$ ${valorVenda.toFixed(2)}). Estorno: ${forma}. Motivo: ${motivo}. Autorizado por ${autorizador.nome} (${autorizador.papel})`, null,
      { operador_id: req.usuario.id, autorizador_id: autorizador.id, autorizador_nome: autorizador.nome, motivo, forma_estorno: forma, valor: valorVenda });
    res.json({ ok: true, forma_estorno: forma, autorizador: { id: autorizador.id, nome: autorizador.nome } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar venda" });
  } finally {
    client.release();
  }
});

// DEVOLUÇÃO (total ou parcial) com impacto financeiro.
// body: { itens:[{produto_id, quantidade}], motivo, tipo_reembolso, cliente_id }
//   tipo_reembolso: DINHEIRO | PIX | CARTAO_CREDITO | CARTAO_DEBITO (A: estorno no caixa)
//                 | CREDITO_LOJA (B: vale-troca/crédito do cliente)
//                 | NENHUM (C: só ajuste de estoque — exige motivo e permissão)
const FORMA_REEMBOLSO = { DINHEIRO: "DINHEIRO", PIX: "PIX", CARTAO_CREDITO: "CREDITO", CARTAO_DEBITO: "DEBITO" };
app.post("/api/vendas/:id/devolver", requirePermissao("vendas.cancelar"), async (req, res) => {
  const eid = empresaId(req);
  const { itens, motivo } = req.body;
  const tipoReembolso = (req.body.tipo_reembolso || "DINHEIRO").toUpperCase();
  if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ error: "Informe os itens a devolver" });
  const REEMBOLSOS = ["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "CREDITO_LOJA", "NENHUM"];
  if (!REEMBOLSOS.includes(tipoReembolso)) return res.status(400).json({ error: "tipo_reembolso inválido" });
  // (C) devolução sem financeiro exige motivo e permissão especial (somente ADMIN/GERENTE).
  if (tipoReembolso === "NENHUM") {
    if (!motivo || !motivo.trim()) return res.status(400).json({ error: "Devolução sem reembolso exige motivo" });
    if (!["ADMIN", "GERENTE"].includes(req.usuario.papel)) return res.status(403).json({ error: "Sem permissão para devolução sem reembolso (ajuste de estoque): exige ADMIN/GERENTE" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const venda = await client.query("SELECT status, cliente_id FROM vendas WHERE id=$1 AND empresa_id=$2", [req.params.id, eid]);
    if (venda.rowCount === 0) throw { status: 404, msg: "Venda não encontrada" };
    if (venda.rows[0].status !== "FINALIZADA") throw { status: 400, msg: "Só é possível devolver itens de venda FINALIZADA" };
    const clienteId = req.body.cliente_id || venda.rows[0].cliente_id || null;
    if (tipoReembolso === "CREDITO_LOJA" && !clienteId) throw { status: 400, msg: "Crédito de loja exige um cliente identificado na venda" };

    // M4: Checar se venda tem NFC-e AUTORIZADA — devolução parcial exige evento fiscal
    const notaFiscal = await client.query(
      "SELECT id, status FROM fiscal_notas WHERE venda_id=$1 AND status='AUTORIZADA'",
      [req.params.id]
    );
    let eventoFiscalPendente = false;
    if (notaFiscal.rowCount > 0) {
      // Venda tem NFC-e autorizada — marcar devolução como pendente de evento fiscal
      eventoFiscalPendente = true;
      // Registrar evento pendente
      await client.query(
        `INSERT INTO eventos_fiscais_pendentes (empresa_id, nota_id, tipo, descricao, dados, status)
         VALUES ($1, $2, 'DEVOLUCAO', $3, $4, 'PENDENTE')`,
        [eid, notaFiscal.rows[0].id, `Devolução parcial de venda #${req.params.id}`, JSON.stringify({ venda_id: req.params.id, itens })]
      );
    }

    const devQ = await client.query(
      "INSERT INTO devolucoes (empresa_id, venda_id, usuario_id, motivo, tipo_reembolso, cliente_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [eid, req.params.id, req.usuario.id, motivo || null, tipoReembolso, clienteId]
    );
    const devId = devQ.rows[0].id;
    let valorTotal = 0;

    for (const it of itens) {
      // item vendido — usa o valor LÍQUIDO (já com desconto/promoção) para o reembolso
      const vi = await client.query(
        "SELECT quantidade, preco_unitario, valor_total FROM venda_itens WHERE venda_id=$1 AND produto_id=$2",
        [req.params.id, it.produto_id]
      );
      if (vi.rowCount === 0) throw { status: 400, msg: `Produto ${it.produto_id} não está na venda` };
      const vendido = Number(vi.rows[0].quantidade);
      const precoUnitLiquido = +(Number(vi.rows[0].valor_total) / vendido).toFixed(4); // líquido por unidade
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

      // valor reembolsável = quantidade devolvida × valor LÍQUIDO unitário (nunca > líquido vendido)
      const valorItem = +(qDev * precoUnitLiquido).toFixed(2);
      valorTotal += valorItem;
      await client.query(
        "INSERT INTO devolucao_itens (devolucao_id, produto_id, quantidade, valor_unitario, valor_total) VALUES ($1,$2,$3,$4,$5)",
        [devId, it.produto_id, qDev, precoUnitLiquido, valorItem]
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

    valorTotal = +valorTotal.toFixed(2);
    await client.query("UPDATE devolucoes SET valor_total=$1 WHERE id=$2", [valorTotal, devId]);

    // ===== IMPACTO FINANCEIRO =====
    if (["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO"].includes(tipoReembolso)) {
      // (A) Estorno: movimento DEVOLUCAO no caixa aberto, na forma correspondente.
      const cx = await client.query("SELECT id FROM caixas WHERE empresa_id=$1 AND status='ABERTO' ORDER BY aberto_em DESC LIMIT 1", [eid]);
      if (cx.rowCount === 0) throw { status: 400, msg: "Não há caixa aberto para estornar o reembolso" };
      await client.query(
        "INSERT INTO caixa_movimentos (caixa_id, tipo, valor, forma_pagamento, observacao, empresa_id, usuario_id, referencia_id) VALUES ($1,'DEVOLUCAO',$2,$3,$4,$5,$6,$7)",
        [cx.rows[0].id, valorTotal, FORMA_REEMBOLSO[tipoReembolso], `Devolução venda #${req.params.id}`, eid, req.usuario.id, devId]
      );
    } else if (tipoReembolso === "CREDITO_LOJA") {
      // (B) Crédito/vale-troca: cria saldo para o cliente, sem mexer no caixa.
      await client.query(
        "INSERT INTO creditos_cliente (empresa_id, cliente_id, origem, origem_id, valor, saldo) VALUES ($1,$2,'DEVOLUCAO',$3,$4,$4)",
        [eid, clienteId, devId, valorTotal]
      );
    }
    // (C) NENHUM: nenhum lançamento financeiro (só estoque/kardex).

    await client.query("COMMIT");
    await registrarAuditoria(req.usuario.id, eid, "DEVOLUCAO", "devolucoes", devId, `Devolução da venda #${req.params.id} (R$ ${valorTotal.toFixed(2)}) — reembolso: ${tipoReembolso}${eventoFiscalPendente ? ' (evento fiscal pendente)' : ''}`, null, { itens, motivo, tipo_reembolso: tipoReembolso, cliente_id: clienteId, evento_fiscal_pendente: eventoFiscalPendente });
    res.status(201).json({ id: devId, venda_id: Number(req.params.id), valor_total: valorTotal, tipo_reembolso: tipoReembolso, evento_fiscal_pendente: eventoFiscalPendente });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.status) return res.status(err.status).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: "Erro ao processar devolução" });
  } finally {
    client.release();
  }
});

// Crédito do cliente (vale-troca gerado por devolução CREDITO_LOJA)
app.get("/api/clientes/:id/creditos", async (req, res) => {
  const eid = empresaId(req);
  const r = await query(
    "SELECT id, origem, origem_id, valor, saldo, status, criado_em FROM creditos_cliente WHERE empresa_id=$1 AND cliente_id=$2 ORDER BY id DESC",
    [eid, req.params.id]
  );
  const saldo = r.rows.filter((c) => c.status === "ATIVO").reduce((a, c) => a + Number(c.saldo), 0);
  res.json({ saldo_total: +saldo.toFixed(2), creditos: r.rows });
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

// M6 — criar cliente exige permissão (vendas.criar); limite de crédito é SENSÍVEL
// (só ADMIN/GERENTE pode definir > 0). Criação é auditada.
app.post("/api/clientes", requirePermissao("vendas.criar"), async (req, res) => {
  const eid = empresaId(req);
  const { nome, cpf_cnpj, telefone, email } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  const limite = Number(req.body.limite_credito || 0);
  if (limite > 0 && !["ADMIN", "GERENTE"].includes(req.usuario.papel)) {
    return res.status(403).json({ error: "Definir limite de crédito exige ADMIN/GERENTE" });
  }
  const result = await query(
    `INSERT INTO clientes (nome, cpf_cnpj, telefone, email, limite_credito, empresa_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [nome, cpf_cnpj || null, telefone || null, email || null, limite, eid]
  );
  await registrarAuditoria(req.usuario.id, eid, "CREATE", "clientes", result.rows[0].id,
    `Criou cliente ${nome}${limite > 0 ? ` (limite R$ ${limite.toFixed(2)})` : ""}`, null, result.rows[0]);
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
