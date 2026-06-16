# Relatório Técnico — TailPOS

> Fonte analisada: `referencias/tailpos/src` (clone shallow de `bailabs/tailpos`)

## Identidade

- **Repositório:** https://github.com/bailabs/tailpos
- **Natureza:** PDV **mobile, offline-first**, opcionalmente sincronizável com ERPNext.
- **Foco:** Tablets/celulares, pequenos comércios, ambientes com internet instável. **É a referência de Offline First / PWA da nossa missão.**

---

## Arquitetura

| Item | Detalhe |
|------|---------|
| **Linguagem** | JavaScript (+ Flow types) |
| **Framework** | **React Native** (Android/iOS) |
| **Estado** | MobX State Tree (`src/store`) |
| **Banco local** | **PouchDB / RxDB-like** (offline-first, embarcado no device) |
| **Sync** | Sincronização bidirecional opcional com ERPNext |
| **Hardware** | Impressora ESC/POS (Bluetooth), leitor de código de barras embutido |

### Estrutura
`src/` dividido em `store` (MobX), `container` (telas), `services`, `boot`, `theme`, `translations`. App React Native clássico (`App.js`, `index.js`, `android/`, `ios/`).

### Permissões / Relatórios
- Permissões simples (usuário/atendente local).
- Relatórios de vendas locais (diário, por produto) gerados no device.

---

## PDV
- **Tela de venda:** otimizada para toque em tablet.
- **Busca:** scanner de código de barras + busca por nome.
- **Carrinho:** quantidade, desconto, múltiplas formas de pagamento.
- **Cancelamentos:** anulação local, sincronizada depois.
- **Caixa:** abertura/fechamento de turno (shift) local.
- **Impressão:** recibo via ESC/POS Bluetooth.

## Estoque
- Controle de estoque **local** (offline), sincronizado com ERPNext quando online.
- Entradas/saídas refletidas no banco embarcado; inventário simples.

## Financeiro
- Mínimo — foco é venda no balcão. Fluxo financeiro fica no ERP quando sincronizado.

## Experiência do usuário — **referência de mobilidade/offline**
- App nativo, rápido, **funciona 100% sem internet** (premissa central).
- Sincroniza em background quando reconecta.
- UI mobile enxuta, pensada para um operador com tablet na mão.

---

## Lições para o nosso sistema
- ⭐ **Offline First com banco local + sync** → modelo para nosso requisito de **PWA / IndexedDB / sincronização automática**.
- ⭐ **Padrão "vende offline, concilia depois"** → essencial para mercado/feira/ambiente instável.
- ⭐ **Integração com hardware** (impressora ESC/POS, scanner) → roadmap de periféricos.
- ⚠️ React Native é outra stack; para nós o equivalente é **PWA (React + Service Worker + IndexedDB)** — mesma ideia, sem app nativo.
- 💡 Conceito de **store reativo (MobX State Tree)** ↔ no nosso React podemos usar Zustand/Redux para o carrinho offline.
