# Contrato de Sincronização — Terminal PDV ↔ Cloud

## Fluxo normal

### Bootstrap (primeira conexão)
1. Terminal gera `device_id` (UUID).
2. Admin registra em `/api/terminal/ativar` → recebe `chave_ativacao`.
3. Terminal confirma em `/api/terminal/confirmar-ativacao` → ativado.
4. Terminal baixa catálogo (produtos, categorias, clientes) → SQLite local.
5. Terminal baixa configuração (preços, promoções, empresa).

### Venda offline
1. Operador faz venda no PDV local.
2. Venda inserida em SQLite local com `status_sync: 'PENDENTE'`.
3. Fila de sync aguarda.
4. Nenhuma sincronização até voltar online.

### Sincronização ao voltar online
1. Sync engine detecta `online: true`.
2. Busca vendas com `status_sync = 'PENDENTE'` em lotes (até 50).
3. Envia para `/api/vendas` com payload estendido:
   ```json
   {
     "itens": [...],
     "pagamentos": [...],
     "device_id": "uuid-terminal",
     "uuid_local": "uuid-venda-local",
     "timestamp_local": "2026-06-18T14:32:00Z"
   }
   ```
4. Cloud retorna `id_cloud`, terminal armazena em `vendas.id_cloud`.
5. Marca venda como `status_sync: 'SINCRONIZADO'`.

## Casos especiais

### Divergência de estoque
- Terminal: estoque local vs. estoque na venda.
- Cloud: estoque global vs. venda sincronizada.
- **Alerta:** se local >= 100 ou >= 10%, flag a divergência.
- **Ação:** operador vê aviso "estoque divergente" e pode aceitar ou recusar venda.

### Divergência de preço
- Se preço local != preço na autorização cloud, aviso ao operador.
- Cloud é autoridade; preço na venda segue o local (que é o que foi vendido).

### Fiscal em CONTINGENCIA
- Venda com NFC-e tira autorização offline → status `CONTINGENCIA_PENDENTE`.
- Fica em `eventos_fiscais_pendentes` (PostgreSQL cloud).
- Ao voltar online, admin aciona `/api/fiscal/reprocessar/:notaId`.
- Terminal vê status atualizado na próxima sync.

### Eventos de devolução pendentes
- Devolução de venda com NFC-e AUTORIZADA cria evento em `eventos_fiscais_pendentes`.
- Status `DEVOLUCAO_PENDENTE` até autorização fiscal.
- Admin valida em `/api/fiscal/eventos/:eventoId/autorizar`.

## Garantias

- **Idempotência:** mesma venda enviada 2x = apenas 1 registrada (validar `uuid_local`).
- **Sequência:** vendas enviadas em ordem (timestamps locais = referência).
- **Retry:** até 3 tentativas por venda, esperar 5min entre tentativas.
- **Fallback:** se cloud indisponível, venda fica em fila (capacidade = max 1000 vendas).

## Status de sincronização

| Local | Significado |
|---|---|
| `PENDENTE` | Aguardando sincronização ao voltar online |
| `SINCRONIZADO` | Venda registrada na cloud (id_cloud preenchido) |
| `ERRO` | Falha após 3 tentativas (requer ação manual) |

## Headers e autenticação

- Terminal envia `X-Device-ID: <device_id>` em todas as requisições.
- Sync usa token JWT do operador ou um token de "sync automático" (futuro).
- Cloud valida `empresa_id` e `unidade_id` do terminal vs. token.
