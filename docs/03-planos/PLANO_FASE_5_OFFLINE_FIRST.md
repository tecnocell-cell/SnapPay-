# 📐 PLANO TÉCNICO — Fase 5: Offline First / PDV Local

**Data:** 17 de junho de 2026
**Status desta entrega:** ✅ Arquitetura de sincronização + **prova de conceito** funcionando. Sem Tauri/Electron, sem TEF, sem provedor fiscal real, sem impressão térmica.
**Meta:** preparar o SnapPay para operar no caixa **mesmo sem internet**, mantendo o cloud (PostgreSQL) como base e o terminal com operação local sincronizável.

---

## 1. Arquitetura

```
┌─────────────────────┐         sync (HTTPS)        ┌──────────────────────┐
│  PDV LOCAL (futuro) │  ───────────────────────▶   │   PDV CLOUD (atual)  │
│  Tauri/Electron     │   enviar-lote / bootstrap   │   Node + PostgreSQL  │
│  SQLite local       │  ◀───────────────────────   │   API /api/sync/*    │
└─────────────────────┘     alteracoes / confirmar  └──────────────────────┘
```

- **PDV Cloud continua o sistema principal.** Toda a lógica de venda/estoque/caixa vive no backend.
- **PDV Local** (etapa futura) será um app desktop (Tauri/Electron) com **SQLite**. Reutilizará a mesma lógica de venda via uma camada compartilhada.
- **Nesta etapa** entregamos **apenas a arquitetura de sincronização** e uma PoC no próprio frontend web (IndexedDB) para validar o fluxo ponta a ponta.

### Dados que sincronizam
- **Cloud → Terminal (bootstrap/alterações):** empresa, unidade, usuários+permissões, produtos, categorias, clientes básicos, caixa aberto.
- **Terminal → Cloud (enviar-lote):** vendas, itens, pagamentos, movimentações de estoque (derivadas da venda), fechamento de caixa.

---

## 2. Entidades offline

**No terminal (obrigatórias):** empresa, unidade, usuário/operador, permissões, produtos, categorias, clientes básicos, caixa aberto, vendas, itens da venda, pagamentos, movimentações de estoque, **fila de sincronização**.

**Fora do offline nesta fase:** relatórios avançados, auditoria completa, configurações fiscais sensíveis, financeiro completo, compras, inventário. (Continuam só no cloud.)

---

## 3. Fila de sincronização (cloud)

| Tabela | Direção | Função |
|--------|---------|--------|
| `sync_outbox` | cloud → terminal | Alterações a entregar (produto/preço/categoria/cliente). Status: PENDENTE/ENVIADO/PROCESSADO/ERRO |
| `sync_recebimentos` | terminal → cloud | Eventos recebidos (vendas offline). Idempotência por `(device_id, uuid)`. Status: PENDENTE/PROCESSADO/ERRO + tentativas/erro |

Campos comuns: `device_id`, `empresa_id`, `unidade_id`, `entidade`, `operacao`, `payload` (JSONB), `status`, `tentativas`, `erro`, `criado_em`, `processado_em`.

---

## 4. Dispositivo/terminal

Tabela `pdv_dispositivos`: `nome`, `device_id` (UUID único), `chave_hash` (segredo do terminal, bcrypt), `codigo_ativacao`, `empresa_id`, `unidade_id`, `ativo`, `ultimo_sync`, `versao_app`.

A **chave local** é gerada na ativação e devolvida **uma única vez** (o app a guarda localmente). No banco fica só o hash.

---

## 5. API de sincronização (`/api/sync`)

| Método | Rota | Função | Acesso |
|--------|------|--------|--------|
| POST | `/ativar-terminal` | Cria terminal, devolve device_id + chave_local (1x) | `dispositivos.gerenciar` (**ADMIN**) |
| GET | `/dispositivos` | Lista terminais da empresa | `dispositivos.gerenciar` |
| GET | `/bootstrap?device_id=` | Dataset inicial p/ o terminal | autenticado + terminal da empresa |
| POST | `/enviar-lote` | Recebe eventos (vendas offline) e cria registros definitivos | autenticado + terminal da empresa |
| GET | `/alteracoes?device_id=&desde=` | Delta de produtos + eventos do outbox | autenticado + terminal da empresa |
| POST | `/confirmar` | Terminal confirma processamento do outbox | autenticado + terminal da empresa |

---

## 6. PoC no frontend web

- `lib/offline.js`: detecta `navigator.onLine`, guarda vendas pendentes no **IndexedDB**, sincroniza via `/api/sync/enviar-lote`, marca como SINCRONIZADA.
- Banner **🟢 Online / 🔴 Offline** no header (reage a `online`/`offline`).
- Página **PDV Offline**: ativar terminal, **simular venda local** (IndexedDB), checkbox "Simular offline", botão **Sincronizar** (envia o lote ao voltar online), lista de pendentes com status e a venda cloud resultante, lista de terminais.

---

## 7. Regras de conflito (implementadas)

- Venda local recebe **uuid** e **nunca é editada** após finalizada.
- Ao sincronizar, o backend **cria a venda definitiva** (idempotente: reenvio do mesmo uuid não duplica).
- **Preço praticado** no momento da venda é mantido (usa `preco_unitario` do payload, não o preço atual da nuvem).
- Se o estoque ficar **negativo** por conflito, a venda é criada mesmo assim e é gravado um **alerta de divergência** (`vendas.divergencia` + retorno no resultado do sync).
- O caixa local pode **fechar offline** e sincronizar depois (movimentos de caixa são recriados no sync, com `forma_pagamento`).

---

## 8. Fiscal em offline

- **Não emite NFC-e real offline.**
- Venda offline com `fiscal_pendente` gera, no sync, uma nota com status **`CONTINGENCIA_PENDENTE`** vinculada à venda.
- Quando a internet voltar, o fluxo de emissão (Fase 4) pode tentar autorizar; se autorizada, vincula; se rejeitada, marca para correção fiscal. *(Emissão automática pós-retorno fica para a próxima etapa.)*

---

## 9. Segurança

- Terminal só é **ativado por ADMIN** (`dispositivos.gerenciar`).
- Cada terminal tem `device_id` + chave local (hash no banco).
- Toda rota de sync valida que o `device_id` **pertence à empresa do token** (`empresa_id`). Testado: empresa B recebe **403** ao usar terminal da empresa A.
- Sincronizações são **auditadas** (`tipo=SYNC`).

---

## 10. Testes executados (backend) — 14/14 ✅

- Ativação só por ADMIN (operador 403).
- Bootstrap entrega produtos/usuários/permissões/empresa.
- **Cross-empresa bloqueado** (403) em bootstrap e enviar-lote.
- Venda offline → **venda definitiva criada** no cloud.
- **Idempotência**: reenvio do mesmo uuid não duplica.
- **Preço praticado** mantido; venda marcada `OFFLINE` com `uuid_sync`; **estoque baixado**.
- Fiscal offline gera **`CONTINGENCIA_PENDENTE`**.
- Auditoria de sync registrada.
- Endpoint de alterações responde delta.

Build frontend: ✅ 315.78 kB, 0 erros. (A PoC IndexedDB é exercida pela página **PDV Offline**.)

---

## Fora desta entrega (intencional)
Tauri/Electron, TEF, self-checkout, app cliente, provedor fiscal real, impressão térmica.

## Próximos passos
1. App desktop (Tauri) com SQLite reaproveitando a lógica de venda.
2. Sincronização incremental bidirecional automática (outbox → terminal).
3. Emissão fiscal automática ao reconectar (consumir as `CONTINGENCIA_PENDENTE`).
4. Resolução assistida de divergências de estoque.

---

**Conclusão:** a base **Offline First** está pronta e segura — terminais ativáveis por ADMIN, fila de sync com idempotência, isolamento multi-tenant, regras de conflito e fiscal-em-contingência preparado. A PoC no navegador valida o ciclo **vender offline → reconectar → sincronizar** antes de virar app desktop.
