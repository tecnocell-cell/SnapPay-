# Backend Local — Terminal PDV Offline-First

## Estrutura

```
backend/local/
├── db/
│   └── schema_sqlite_inicial.sql    # Migrations SQLite para terminal
├── routes/
│   ├── vendas.js                     # (futuro) venda local
│   ├── caixa.js                      # (futuro) caixa local
│   └── sync.js                       # (futuro) pull/push cloud
├── sync/
│   └── syncEngine.js                 # (futuro) orquestrador de sincronização
├── printer/
│   └── printerService.js             # Serviço abstrato de impressão (mock + ESC/POS)
└── README_LOCAL_BACKEND.md           # este arquivo
```

## Propósito

Preparar estrutura para um backend local mínimo que roda no terminal mini PC:

- **Offline-first:** SQLite local, venda vai para `fila_sync`, sincroniza ao voltar online.
- **Modular:** cada rota trata um domínio (vendas, caixa, sync).
- **Abstraído:** printer service encapsula mock vs. ESC/POS.
- **Backup fiscal:** notas em CONTINGENCIA e eventos de devolução armazenados localmente.

## Inicialização futura

1. Terminal inicia em modo quiosque (vê PDV, nada mais).
2. Frontend detecta `ativo: true` no `/api/terminal`.
3. Conecta a SQLite local (via Electron/Tauri).
4. Offline: cria venda em SQLite, registra em `fila_sync`.
5. Online: sync engine tenta enviar fila para cloud.
6. Fiscal em CONTINGENCIA: fica em `fiscal_pendente` até reprocessamento manual.

## Não está implementado ainda

- Servidor Node local no terminal (será via Tauri/Electron)
- Sincronização real (sync engine)
- Leitor de código de barras/balança (hardware)
- Criptografia de dados locais

## Referência

- [SYNC_TERMINAL_CONTRATO.md](../SYNC_TERMINAL_CONTRATO.md) — protocolo de sincronização
- [Printer Service](./printer/printerService.js) — mock + roadmap ESC/POS
