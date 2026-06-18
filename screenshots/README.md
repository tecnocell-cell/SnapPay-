# Screenshots reais — homologação do PDV (navegador, 18/06/2026)

Capturados via Chrome headless (Puppeteer) contra `localhost:5173`, login `admin@snappay.local`, segmento **mercado**.

| Arquivo | O que mostra |
|---------|--------------|
| `01_pdv_vazio.png` | PDV abre vazio: marca d'água SnapPay + "Passe o código de barras ou pesquise um produto". Sem catálogo. |
| `02_pdv_3itens.png` | 3 produtos bipados (Arroz, Feijão, Coca). Área central QTD \| PRODUTO \| UNITÁRIO \| TOTAL. Total R$ 41,90. Botão FINALIZAR ativo. Lateral só com resumo/cliente/desconto/total. |
| `03_pdv_finalizada.png` | Toast "✅ Venda #396 finalizada", comprovante e PDV limpo ao fundo (TOTAL R$ 0,00). |

## Homologação no backend (venda #396)
- Venda gravada: `status=FINALIZADA`, `valor_total=41.90`, `caixa_id=6`.
- Baixa de estoque: Arroz 56→55, Feijão 46→45, Coca 159→158.
- Kardex: 3× `SAIDA_VENDA`, `origem=VENDA`, `origem_id=396`, com saldo anterior/posterior.
- Caixa: venda vinculada ao caixa aberto #6.
