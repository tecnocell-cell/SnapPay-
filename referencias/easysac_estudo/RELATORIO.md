# Estudo — EasySAC (sistema legado de referência)

> Base: documentação do projeto original (`README.md`, `ROADMAP.md`) + schema importado e código do PDV atual (SnapPay), que nasceu do EasySAC.

## Identidade

- **Natureza:** ERP/PDV **desktop legado em Delphi** (2010), usado em varejo brasileiro.
- **Banco:** SQL Server (arquivo `EasySAC.mdf`), ~**321 tabelas** mapeadas (prefixo `SAC###`).
- **Por que é referência:** define o **escopo funcional brasileiro** que precisamos igualar (e depois superar), incluindo fiscal (SEFAZ/NFC-e/SAT).

---

## Arquitetura (legado)

| Item | Detalhe |
|------|---------|
| **Linguagem** | Delphi (Object Pascal) |
| **UI** | VCL desktop (Windows) |
| **Banco** | SQL Server, Windows Integrated Auth |
| **Fiscal** | Esquema SEFAZ embutido (NFe/NFCe/SAT), pasta `Fiscal/Xml/` |

### Tabelas-chave mapeadas (do schema importado)
- `SAC441` → **produtos** (catálogo, 50 itens reais importados para o MVP)
- `SAC311` → **clientes**
- `SAC100` / `SAC105` → **NF/NFCe** (cabeçalho + chaves de acesso)
- `SAC470` → **itens de venda**
- `SAC511` / `SAC521` → **financeiro** (recebimentos / contas)
- `SAC251` → multi-loja, integrações (WhatsApp/API key)

---

## Funcionalidades do EasySAC (escopo a igualar)

### PDV
- Venda balcão, busca por código/barras/nome, carrinho, descontos.
- Múltiplas formas de pagamento (DINHEIRO, DÉBITO, CRÉDITO, PIX, CREDIÁRIO).
- **Emissão fiscal NFC-e/SAT** integrada à SEFAZ (diferencial forte).

### Estoque
- Catálogo com custo/venda/estoque, entrada/saída, mínimos.

### Financeiro
- Contas a receber (crediário/carnê via `SAC511`), contas a pagar, caixa.

### Fiscal — **o grande diferencial do EasySAC**
- NFC-e, NFe, SAT, armazenamento de XML assinado, contingência.

### Outros
- Multi-loja, integração WhatsApp, base para relatórios.

---

## O que o SnapPay (sistema atual) já herdou
- Modelo de produtos/clientes/vendas/itens/pagamentos (espelho simplificado de SAC441/311/470).
- Cálculo de impostos (ICMS/PIS/COFINS) — porém **em memória, não fiscal**.

## O que falta para igualar o EasySAC
- **Emissão fiscal real (NFC-e/NFe/SAT)** — hoje inexistente.
- **Financeiro (contas a pagar/receber, crediário com carnê)** — hoje só `limite_credito`.
- **Caixa (abertura/fechamento/sangria)** — inexistente.
- **Compras/fornecedores** — inexistente.
- **Multi-loja / multiusuário / permissões** — inexistente.

## O que falta para SUPERAR o EasySAC
- Ser **web/SaaS, modular e multi-segmento** (mercado, padaria, restaurante, distribuidora, serviços).
- **Offline-first/PWA**, mobilidade.
- **WhatsApp + IA**, campanhas.
- UX moderna (o EasySAC é desktop datado).

> Detalhamento completo na matriz comparativa: `referencias/relatorios/02_matriz_comparativa.md`.
