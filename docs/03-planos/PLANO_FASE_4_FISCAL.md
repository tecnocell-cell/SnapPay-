# 📐 PLANO TÉCNICO — Fase 4 Fiscal (Arquitetura Plugável)

**Data:** 17 de junho de 2026
**Status desta entrega:** ✅ Fundação fiscal implementada com **provider MOCK** funcionando. **Sem comunicação real com SEFAZ.**
**Princípio:** o sistema **não fica amarrado a um único provedor**. A emissão é delegada a um *provider* selecionável por empresa.

---

## 1. Visão geral da arquitetura

```
Venda finalizada
      │
      ▼
POST /api/fiscal/notas/emitir
      │
      ▼
fiscal.js (rota)  ──cria fiscal_notas (EMITINDO)──▶ banco
      │
      ▼
getProvider(config)  ──resolve por config.provider──▶  MOCK | NUVEM_FISCAL | FOCUS_NFE | PLUGNOTAS | TECNOSPEED
      │
      ▼
provider.emitirNFCe({config, venda, itens})  ──▶ resultado normalizado
      │
      ▼
atualiza fiscal_notas (AUTORIZADA/REJEITADA/...) + fiscal_eventos + auditoria
```

A rota **não conhece** o provedor concreto — fala apenas com o **contrato** (`FiscalProvider`). Trocar de provedor é mudar `fiscal_configuracoes.provider`.

---

## 2. Modelo de dados (migration 08)

| Tabela | Função |
|--------|--------|
| `fiscal_configuracoes` | 1 por empresa: provider, ambiente, modelo, série, número atual, CSC, token, certificado (referência), regime, UF |
| `fiscal_notas` | Cada nota: venda_id, empresa_id, usuario_id, série/número, **status**, chave de acesso, protocolo, valor, motivo de rejeição, danfe_url, xml |
| `fiscal_eventos` | Histórico por nota: EMISSAO, AUTORIZACAO, REJEICAO, CANCELAMENTO, INUTILIZACAO, CONSULTA (com payload) |

**Status da nota:** `RASCUNHO → EMITINDO → AUTORIZADA | REJEITADA | CONTINGENCIA`, e `AUTORIZADA → CANCELADA`.

Vínculos garantidos: `venda_id`, `empresa_id`, `usuario_id` em toda nota; tudo escopado por empresa (multi-tenant).

---

## 3. Interface do provider (`src/fiscal/provider.js`)

Contrato que todo provedor implementa:

| Método | Responsabilidade |
|--------|------------------|
| `validarConfiguracao()` | Checa se a config está completa para operar |
| `emitirNFCe(ctx)` | Emite a NFC-e; devolve `{ ok, status, chave_acesso, protocolo, danfe_url, xml, motivo }` |
| `consultarStatus(ctx)` | Consulta status atual |
| `cancelarNota(ctx)` | Cancela nota autorizada |
| `inutilizarNumeracao(ctx)` | Inutiliza faixa |
| `gerarDanfe(ctx)` | Retorna DANFE (URL/conteúdo) |

Resultado **normalizado** entre provedores, então a rota trata todos de forma idêntica.

---

## 4. Provider MOCK (`src/fiscal/providers/mock.js`)

Simula a SEFAZ de forma **determinística**, sem rede. Controlado por `simular`:
- `AUTORIZAR` (padrão) → gera chave de acesso (44 díg.), protocolo e danfe_url.
- `REJEITAR` → status REJEITADA com motivo.
- `CONTINGENCIA` → autoriza em contingência.

Permite homologar **todo o fluxo** (emitir, rejeitar, cancelar, inutilizar, DANFE) sem certificado nem SEFAZ.

---

## 5. Provedores reais (preparados, não implementados)

`src/fiscal/index.js` já registra as factories de **Nuvem Fiscal, Focus NFe, PlugNotas e TecnoSpeed** como `ProviderNaoImplementado` (retornam erro claro em `validarConfiguracao`). Habilitar cada um = implementar os 6 métodos do contrato e plugar na factory — **sem tocar nas rotas nem no banco**.

---

## 6. Rotas backend (`/api/fiscal`)

| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/providers` | autenticado |
| GET/PUT | `/configuracoes` | `fiscal.configurar` |
| GET | `/configuracoes/validar` | `fiscal.configurar` |
| GET | `/notas` (filtro `?status=`) | `fiscal.emitir` |
| GET | `/notas/:id` (nota + eventos) | `fiscal.emitir` |
| POST | `/notas/emitir` (`{venda_id, simular}`) | `fiscal.emitir` |
| POST | `/notas/:id/cancelar` | `fiscal.cancelar` |
| GET | `/notas/:id/danfe` | `fiscal.emitir` |
| POST | `/inutilizar` | `fiscal.cancelar` |

**RBAC fiscal:** `fiscal.emitir` e `fiscal.cancelar` → ADMIN + GERENTE; `fiscal.configurar` → **ADMIN apenas**. Operador não acessa nada fiscal.

---

## 7. Integração com a venda

- Venda **FINALIZADA** pode gerar NFC-e (`POST /fiscal/notas/emitir`).
- **Duplicidade bloqueada:** não emite 2ª nota ativa para a mesma venda (409).
- **Venda travada:** não é possível cancelar uma venda que tenha NFC-e **AUTORIZADA/CONTINGÊNCIA** — é preciso cancelar a nota antes (409).
- Numeração **consumida e persistida** em `fiscal_configuracoes.numero_atual` apenas quando autoriza.
- Todos os eventos fiscais entram na **auditoria** (`tipo=FISCAL`).

---

## 8. Telas frontend

- **Config. Fiscal** (`FiscalConfig.jsx`): provedor, ambiente, modelo, série/número, CSC, token, certificado, regime, UF + botão "Validar configuração".
- **Notas Fiscais** (`NotasFiscais.jsx`): lista com status colorido; emitir a partir de venda (com opção de simulação no MOCK); detalhe com chave/protocolo/eventos; cancelar nota.

Menu respeita permissões: "Notas Fiscais" some para quem não tem `fiscal.emitir`; "Config. Fiscal" só para `fiscal.configurar` (admin).

---

## 9. Testes executados (provider MOCK) — 16/16 ✅

- Config default (MOCK/HOMOLOGACAO) e `validarConfiguracao`.
- Providers disponíveis listados.
- RBAC: operador 403 em config e emissão.
- Emissão **AUTORIZADA** (chave + protocolo + número).
- **Duplicidade** (409) e **bloqueio de cancelar venda** com nota ativa (409).
- DANFE, detalhe com eventos.
- **Rejeição** simulada (status + motivo).
- **Cancelamento** da nota e liberação da venda.
- **Inutilização** de faixa.
- **Auditoria** fiscal registrada.

Build frontend: ✅ 306.71 kB, 0 erros.

---

## 10. Próximos passos (fora desta entrega)

1. Implementar o **primeiro provedor real** (recomendado: Nuvem Fiscal ou Focus NFe) sobre o contrato existente.
2. Upload seguro do **certificado digital** (.pfx) — fora do banco.
3. Geração/armazenamento do **XML e PDF da DANFE** reais.
4. **Contingência** automática e reenvio.
5. Emissão **a partir do PDV** (botão na finalização da venda).

---

**Conclusão:** a fundação fiscal está pronta e **plugável** — o sistema emite, rejeita, cancela e inutiliza via MOCK de homologação, com RBAC, auditoria e integração com a venda. Conectar um provedor real é incremental e não exige reescrever rotas, banco ou telas.
