// Precificação AUTORITATIVA no servidor.
// Prioridade das regras (do mais base ao mais específico):
//   1. preço base = produtos.preco_venda
//   2. TABELA DE PREÇO (atacado/varejo/especial): tabela do cliente > tabela padrão.
//      Dentro da tabela, a maior faixa qtd_min <= quantidade define o preço unitário.
//   3. PROMOÇÃO vigente (por prioridade) aplica DESCONTO sobre (qtd * preço unitário).
// O servidor é a fonte da verdade; o preço enviado pelo PDV é apenas sugestão.

function promoVigente(p, agora) {
  if (!p.ativo) return false;
  const hoje = agora.toISOString().slice(0, 10);
  if (p.data_inicio && hoje < String(p.data_inicio).slice(0, 10)) return false;
  if (p.data_fim && hoje > String(p.data_fim).slice(0, 10)) return false;
  if (p.dias_semana) {
    const dia = agora.getDay();
    if (!p.dias_semana.split(",").map((x) => Number(x.trim())).includes(dia)) return false;
  }
  if (p.hora_inicio && p.hora_fim) {
    const hhmm = agora.toTimeString().slice(0, 8);
    if (!(hhmm >= p.hora_inicio && hhmm <= p.hora_fim)) return false;
  }
  return true;
}

function promoCasaItem(p, produtoId, categoriaId) {
  if (p.escopo === "PRODUTO") return Number(p.alvo_id) === Number(produtoId);
  if (p.escopo === "CATEGORIA") return Number(p.alvo_id) === Number(categoriaId);
  return true; // GERAL
}

// Pré-carrega tabela do cliente, tabela padrão e promoções vigentes — uma vez por venda.
export async function criarPrecificador(client, eid, clienteId) {
  let tabelaClienteId = null;
  if (clienteId) {
    const c = await client.query("SELECT tabela_preco_id FROM clientes WHERE id=$1 AND empresa_id=$2", [clienteId, eid]);
    tabelaClienteId = c.rows[0]?.tabela_preco_id || null;
  }
  const padrao = await client.query("SELECT id FROM tabelas_preco WHERE empresa_id=$1 AND padrao=TRUE AND ativo=TRUE LIMIT 1", [eid]);
  const tabelaPadraoId = padrao.rows[0]?.id || null;
  const tabelaId = tabelaClienteId || tabelaPadraoId;

  const agora = new Date();
  const promos = (await client.query(
    "SELECT * FROM promocoes WHERE empresa_id=$1 AND ativo=TRUE ORDER BY prioridade, id", [eid]
  )).rows.filter((p) => promoVigente(p, agora));

  // Retorna a precificação de um item já com o produto carregado (preco_venda, categoria_id).
  return async function precificar(produto, quantidade) {
    const qtd = Number(quantidade);
    const precoBase = Number(produto.preco_venda);
    let precoUnitario = precoBase, tabelaAplicadaId = null, faixa = 1;

    if (tabelaId) {
      const r = await client.query(
        `SELECT preco, qtd_min FROM tabela_preco_itens
         WHERE tabela_id=$1 AND produto_id=$2 AND qtd_min <= $3
         ORDER BY qtd_min DESC LIMIT 1`,
        [tabelaId, produto.id, qtd]
      );
      if (r.rowCount) { precoUnitario = Number(r.rows[0].preco); tabelaAplicadaId = tabelaId; faixa = Number(r.rows[0].qtd_min); }
    }

    const bruto = +(qtd * precoUnitario).toFixed(2);
    let descontoPromo = 0, promocaoId = null;
    for (const p of promos) {
      if (!promoCasaItem(p, produto.id, produto.categoria_id)) continue;
      let d = 0;
      if (p.tipo === "PERCENTUAL") d = +(bruto * (Number(p.valor) / 100)).toFixed(2);
      else if (p.tipo === "VALOR") d = +Math.min(bruto, Number(p.valor) * qtd).toFixed(2);
      else if (p.tipo === "LEVE_X_PAGUE_Y" && p.leve_qtd && p.pague_qtd) {
        const grupos = Math.floor(qtd / p.leve_qtd);
        d = +((grupos * (p.leve_qtd - p.pague_qtd)) * precoUnitario).toFixed(2);
      }
      if (d > 0) { descontoPromo = d; promocaoId = p.id; break; }
    }

    return {
      preco_base: precoBase,
      preco_unitario: precoUnitario,
      tabela_preco_id: tabelaAplicadaId,
      faixa_qtd_min: faixa,
      promocao_id: promocaoId,
      desconto_promo: descontoPromo,
    };
  };
}
