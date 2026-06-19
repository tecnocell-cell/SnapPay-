# 🏢 RELATÓRIO TÉCNICO — Fase 6: Consolidação Comercial

**Data:** 17 de junho de 2026
**Objetivo:** transformar o SnapPay de ERP operacional em ERP comercial pronto para implantação.
**Escopo respeitado:** sem TEF, Tauri, Self-Checkout, App Cliente ou IA.
**Homologação backend:** **12/12 verificações aprovadas, 0 falhas.**

---

## Etapa 6.1 — Fiscal Real (provider Focus NFe)

**Entregue:** provider real **Focus NFe** (`src/fiscal/providers/focusnfe.js`) implementando o contrato `FiscalProvider` — emissão, consulta, cancelamento, inutilização, DANFE e validação de configuração, sobre a API REST da Focus (autenticação Basic com token, ambiente homologação/produção).

- Registrado no registry (`getProvider` retorna `FocusNFeProvider` quando `provider=FOCUS_NFE`).
- Mapeia formas de pagamento internas → códigos SEFAZ; monta payload de NFC-e a partir da venda/itens.
- Validado: o provider é **selecionável** e sua `validarConfiguracao()` rejeita corretamente quando faltam token/CSC/UF.

### ⚠️ Limitação honesta (importante)
A **emissão fiscal real contra a SEFAZ não foi testada** porque depende de credenciais que não estão disponíveis no ambiente de desenvolvimento:
- **Token Focus NFe** (conta no provedor),
- **Certificado digital A1** (.pfx) cadastrado no painel da Focus,
- **CSC/token da SEFAZ** e CNPJ habilitado.

O código está **pronto para operar** assim que o cliente inserir essas credenciais em **Config. Fiscal** (`provider_token`, `csc`, `uf`, `ambiente`). Até lá, o **provider MOCK** continua para homologação interna (Fase 4). Recomenda-se um primeiro teste em **ambiente de homologação da SEFAZ** com o certificado real antes de produção.

---

## Etapa 6.2 — Tabelas de Preço ✅ (backend completo e testado)

**Migration 11:** `tabelas_preco` (VAREJO/ATACADO/ESPECIAL, com flag `padrao`), `tabela_preco_itens` (preço por **faixa de quantidade** `qtd_min`), e `clientes.tabela_preco_id`.

**Rotas `/api/precos`:** CRUD de tabelas, definição de preço por produto/faixa, e **resolução de preço** (`GET /resolver`): usa a tabela do cliente → ou a informada → ou a padrão; dentro dela pega a **maior faixa `qtd_min ≤ quantidade`**; fallback `preco_venda`.

**Validado (faixas 1+/10+/20+/50+ = R$10/8/7/5):**
| Quantidade | Preço resolvido |
|-----------|-----------------|
| 5 un | R$ 10 (faixa 1+) |
| 15 un | R$ 8 (faixa 10+) |
| 25 un | R$ 7 (faixa 20+) |
| 60 un | R$ 5 (faixa 50+) |

**Integração ao PDV:** endpoint `GET /api/precos/resolver?produto_id=&quantidade=&cliente_id=` pronto para o PDV chamar ao adicionar item (frontend pendente — ver abaixo).

---

## Etapa 6.3 — Promoções ✅ (motor completo e testado)

**Migration 12:** `promocoes` (tipo, valor, leve/pague, escopo PRODUTO/CATEGORIA/GERAL, alvo, **faixa de horário**, dias da semana, período, prioridade).

**Motor `POST /api/promocoes/aplicar`:** recebe o carrinho, filtra promoções **vigentes** (data, dia da semana, faixa de horário) e aplica por prioridade, retornando desconto por item + total. Tipos: `PERCENTUAL`, `VALOR`, `LEVE_X_PAGUE_Y`, e por **horário/categoria** via os campos de vigência/escopo.

**Validado:**
- **Leve 3 Pague 2** num produto: 3× R$10 → desconto R$10 (1 grátis), líquido R$20.
- **Percentual 10%** geral: R$100 → desconto R$10.
- **Prioridade respeitada** (promo de prioridade menor vence).

---

## Etapa 6.4 — Multi-loja ✅ (backend completo e testado)

**Migration 13:** `estoque_unidade` (saldo por loja), `transferencias` + `transferencia_itens`, e `vendas.unidade_id`. O estoque global (`produtos.estoque_atual`) é mantido como consolidado.

**Rotas `/api/unidades`:** lojas (CRUD), estoque por loja (consulta/ajuste) e **transferência entre lojas** (`POST /transferir`) — transacional, com baixa na origem, entrada no destino, **kardex `TRANSFERENCIA`** e auditoria.

**Validado:**
- Matriz + filial criadas.
- Estoque por loja: matriz 100 → 70, filial 0 → 30 após transferência de 30.
- **Bloqueia transferência sem saldo** na origem.
- Kardex e auditoria registram a transferência.

> **Evolução natural (documentada):** integrar a **venda para baixar da unidade do caixa** (hoje a venda baixa do estoque global). A estrutura (`estoque_unidade`, `vendas.unidade_id`) já está pronta para esse próximo passo.

---

## Etapa 6.5 — Homologação

Script automatizado executou **12 verificações** cobrindo fiscal (seleção/validação), preço (4 faixas), promoções (3 regras), multi-loja (estoque/transferência/bloqueio/kardex/auditoria): **12/12 aprovadas, 0 falhas.**

---

## Pendência declarada: Frontend das features 6.2–6.4

O **backend está completo e testado**, com endpoints prontos. As **telas de gestão** dessas features (cadastro de tabelas de preço, painel de promoções, gestão de lojas/transferências) e a **integração visual no PDV** (resolver preço por cliente/quantidade, aplicar promoções no carrinho) **ficaram para a próxima iteração** — foi priorizada a solidez e a validação das regras de negócio no backend. Os endpoints já permitem que o frontend seja construído sem mudanças no servidor.

---

## Classificação

| Etapa | Backend | Testado | Frontend | Observação |
|-------|---------|---------|----------|------------|
| 6.1 Fiscal real (Focus) | ✅ | ⚠️ parcial | (config existe) | falta credenciais reais p/ emitir |
| 6.2 Tabelas de preço | ✅ | ✅ | ⏳ pendente | endpoints prontos |
| 6.3 Promoções | ✅ | ✅ | ⏳ pendente | motor pronto |
| 6.4 Multi-loja | ✅ | ✅ | ⏳ pendente | transferência pronta; venda-por-loja é evolução |

**Bugs encontrados na homologação:** nenhum (12/12).

---

## Entregáveis

1. **Relatório técnico** — este documento.
2. **Migrations** — 11 (preços), 12 (promoções), 13 (multi-loja).
3. **Backend** — `precos.js`, `promocoes.js`, `unidades.js`, provider `focusnfe.js`, rotas registradas no `server.js`.
4. **Frontend** — pendente para 6.2–6.4 (declarado); fiscal já tem tela de config (Fase 4).
5. **Homologação** — 12/12.
6. **Build** — ✅ frontend 314.77 kB, backend sobe sem erro.

---

## Conclusão

As **regras de negócio comerciais** que faltavam (tabelas de preço com atacado por quantidade, motor de promoções, multi-loja com transferências) estão **implementadas e validadas no backend**, e o **provider fiscal real (Focus NFe)** está pronto para ser ativado com credenciais. O SnapPay deu um passo decisivo de ERP operacional para **ERP comercial** — faltando, para a implantação plena: as **telas** dessas features, a **emissão fiscal real** com certificado, e a evolução de **venda-por-loja**. Nada de TEF, Tauri, Self-Checkout, App Cliente ou IA foi iniciado.
