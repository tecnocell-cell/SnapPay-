# ✅ RELATÓRIO DE VALIDAÇÃO — ETAPA 1: Ambiente Piloto

**Data de início:** ___/___/2026  
**Data de conclusão:** ___/___/2026  
**Testador:** ________________________  
**Revisor:** ________________________

---

## 📋 Ambiente de Teste

### Configuração

| Item | Descrição |
|------|-----------|
| **SO** | Ubuntu 24.04 LTS ☐ / Outro: _____________ |
| **CPU** | _____ vCores |
| **RAM** | _____ GB |
| **Disco** | _____ GB |
| **Docker** | ☐ Sim ☐ Não |
| **Rede** | Local ☐ / VPS ☐ / Outro: __________ |

### Horário de Testes

- **Início:** ___:___ 
- **Fim:** ___:___
- **Duração total:** _____ horas

---

## 🧪 TESTE 1 — Deploy Limpo

**Objetivo:** Validar que procedimento de deploy é reproduzível

**Data:** ___/___/2026  
**Responsável:** ________________________

### Passos Executados

- [ ] Clone do repositório
- [ ] Build Frontend
- [ ] Build Backend
- [ ] Instalação de dependências
- [ ] Execução de migrations
- [ ] Criação do banco
- [ ] Inicialização de containers/processos
- [ ] Teste de acesso via navegador

### Resultados

| Etapa | Tempo | Status | Observação |
|-------|-------|--------|------------|
| Clone | ____ s | ☐ OK ☐ ERRO | _____________ |
| Build Frontend | ____ s | ☐ OK ☐ ERRO | _____________ |
| Build Backend | ____ s | ☐ OK ☐ ERRO | _____________ |
| Migrations | ____ s | ☐ OK ☐ ERRO | _____________ |
| Banco Online | ____ s | ☐ OK ☐ ERRO | _____________ |
| Backend Respondendo | ____ ms | ☐ OK ☐ ERRO | _____________ |
| Frontend Servindo | ____ ms | ☐ OK ☐ ERRO | _____________ |

**Tempo total de deploy:** _____ minutos

### Health Check

```json
{
  "status": "___",
  "api": "___",
  "database": "___",
  "disk_percent": ___,
  "memory_percent": ___
}
```

### Evidências

- [ ] Screenshot do navegador mostrando aplicação
- [ ] Log de deploy
- [ ] Resultado de `curl https://localhost/api/health`

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________
_________________________________________________________________________

---

## 💓 TESTE 2 — Health Check

**Objetivo:** Validar endpoint de monitoramento

**Data:** ___/___/2026  
**Responsável:** ________________________

### Testes Unitários

| Teste | Esperado | Obtido | Status |
|-------|----------|--------|--------|
| HTTP 200 | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| JSON válido | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| `status: "ok"` | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| `api: "ok"` | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| `database: "ok"` | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Tempo < 100ms | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Disco < 80% | Sim | __________ % | ☐ PASS ☐ FAIL |
| Memória < 85% | Sim | __________ % | ☐ PASS ☐ FAIL |

### Resposta Completa

```json
{
  "status": "__________",
  "api": "__________",
  "database": "__________",
  "disk": {
    "free_gb": __________,
    "used_percent": __________,
    "status": "__________"
  },
  "memory": {
    "used_mb": __________,
    "total_mb": __________,
    "percent": __________,
    "status": "__________"
  },
  "sync": {
    "pending": __________,
    "status": "__________"
  },
  "timestamp": "__________"
}
```

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## 💾 TESTE 3 — Backup Real

**Objetivo:** Validar que dados são protegidos

**Data:** ___/___/2026  
**Responsável:** ________________________

### Dados de Teste Criados

```sql
Produtos: __________ registros
Clientes: __________ registros
Vendas: __________ registros
Compras: __________ registros
```

### Backup Executado

| Item | Valor |
|------|-------|
| **Arquivo** | _________________________ |
| **Tamanho** | __________ MB |
| **Tempo** | __________ segundos |
| **Localização** | _________________________ |
| **Data** | ___/___/2026 ___:___ |

### Validações

- [ ] Arquivo criado com sucesso
- [ ] Tamanho > 1 MB (com dados)
- [ ] Integridade verificada (gunzip -t)
- [ ] Estrutura SQL presente
- [ ] Timestamp correto no nome

### Cronograma de Backup

```bash
Backup diário: ☐ Configurado (horário: __:__ )
Retenção 7 dias: ☐ Sim
Backup semanal: ☐ Sim
Retenção mensal: ☐ Não ☐ Sim
```

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## 🔄 TESTE 4 — Restauração Real

**Objetivo:** Validar que recuperação é possível

**Data:** ___/___/2026  
**Responsável:** ________________________

### Banco Antes da Restauração

| Tabela | Registros |
|--------|-----------|
| produtos | __________ |
| clientes | __________ |
| vendas | __________ |
| compras | __________ |
| auditoria | __________ |

### Restauração

| Etapa | Tempo | Status |
|-------|-------|--------|
| Drop banco antigo | ____ s | ☐ OK ☐ ERRO |
| Recriar banco vazio | ____ s | ☐ OK ☐ ERRO |
| Restaurar backup | ____ s | ☐ OK ☐ ERRO |
| Validar integridade | ____ s | ☐ OK ☐ ERRO |

**Tempo total:** _____ segundos

### Banco Após Restauração

| Tabela | Registros | Match |
|--------|-----------|-------|
| produtos | __________ | ☐ Sim ☐ Não |
| clientes | __________ | ☐ Sim ☐ Não |
| vendas | __________ | ☐ Sim ☐ Não |
| compras | __________ | ☐ Sim ☐ Não |
| auditoria | __________ | ☐ Sim ☐ Não |

### Testes Pós-Restauração

- [ ] SELECT COUNT(*) de cada tabela
- [ ] Validar relacionamentos (foreign keys)
- [ ] Testar queries críticas
- [ ] Verificar índices

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## 📦 TESTE 5 — Atualização (Zero-downtime)

**Objetivo:** Validar que updates não perdem dados

**Data:** ___/___/2026  
**Responsável:** ________________________

### Versão Antes da Atualização

- **Branch:** ________________________
- **Commit:** ________________________
- **Build Frontend:** __________ KB

### Migration Aplicada

```sql
ALTER TABLE _________________ 
ADD COLUMN _________________ 
...
```

### Testes Antes e Depois

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| Registros produtos | __________ | __________ | ☐ OK ☐ ERRO |
| Registros vendas | __________ | __________ | ☐ OK ☐ ERRO |
| Registros compras | __________ | __________ | ☐ OK ☐ ERRO |
| Estrutura válida | ☐ Sim | ☐ Sim | ☐ OK ☐ ERRO |

### Tempo de Downtime

- **Esperado:** 0 segundos (zero-downtime)
- **Observado:** __________ segundos
- **Status:** ☐ OK ☐ ACIMA DO ESPERADO

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## ↩️ TESTE 6 — Rollback

**Objetivo:** Validar que conseguimos recuperar de erro

**Data:** ___/___/2026  
**Responsável:** ________________________

### Erro Simulado

```
Descrição: _________________________________________________
Resultado: __________________________________________________
```

### Rollback Executado

- [ ] Backup de segurança criado antes
- [ ] Banco dropado
- [ ] Banco recriado vazio
- [ ] Backup restaurado
- [ ] Sistema operacional novamente

### Validação Pós-Rollback

- [ ] Dados intactos
- [ ] Sistema respondendo
- [ ] Erro removido
- [ ] Auditoria registra o evento

**Tempo de rollback:** __________ segundos

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## 📝 TESTE 7 — Logs

**Objetivo:** Validar auditoria completa

**Data:** ___/___/2026  
**Responsável:** ________________________

### Logs de Aplicação

- [ ] `/var/log/snappay/application/` existente
- [ ] Logs sendo gerados diariamente
- [ ] Formato: `app-YYYY-MM-DD.log`
- [ ] Tamanho esperado: > 1 KB

**Último arquivo:**
```
/var/log/snappay/application/app-__________-__________-__________.log
Tamanho: __________ bytes
Data de criação: ___/___/2026
```

### Logs de Erro

- [ ] `/var/log/snappay/errors/` existente
- [ ] Erros sendo registrados
- [ ] Formato: `error-YYYY-MM-DD.log`

**Erros encontrados no período:** __________

### Logs de Sincronização

- [ ] `/var/log/snappay/sync/` existente
- [ ] Sync offline registrado

### Logs Fiscais

- [ ] `/var/log/snappay/fiscal/` existente
- [ ] Emissões/cancelamentos registrados

### Rotação de Logs

- [ ] Logrotate configurado
- [ ] Retenção __________ dias
- [ ] Compressão ☐ Ativada

**Último arquivo rotacionado:** __________

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## 🔒 TESTE 8 — Segurança

**Objetivo:** Validar defesas ativas

**Data:** ___/___/2026  
**Responsável:** ________________________

### Checklist de Segurança

| Item | Esperado | Observado | Status |
|------|----------|-----------|--------|
| .env.homolog em .gitignore | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Permissões .env = 600 | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Porta 22 (SSH) aberta | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Porta 80 (HTTP) aberta | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Porta 443 (HTTPS) aberta | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Porta 3001 bloqueada externamente | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Porta 5432 bloqueada externamente | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Firewall ativo | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| HTTPS/SSL válido | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Certificado válido por: | > 30d | __________ dias | ☐ OK ☐ ATENÇÃO |
| Renovação SSL automática | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Headers de segurança | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| Sem credenciais em logs | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |
| SSH sem password login | Sim | ☐ Sim ☐ Não | ☐ PASS ☐ FAIL |

### Portas Abertas Verificadas

```
22/tcp   - SSH (esperado)
80/tcp   - HTTP redirect (esperado)
443/tcp  - HTTPS (esperado)
3001/tcp - Backend (LOCAL ONLY)
5432/tcp - Banco (LOCAL ONLY)
```

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Riscos identificados:**
_________________________________________________________________________
_________________________________________________________________________

---

## 📡 TESTE 9 — Offline First

**Objetivo:** Validar sincronização offline

**Data:** ___/___/2026  
**Responsável:** ________________________

### Cenário: Venda Offline

1. Venda ONLINE criada: __________ (ID)
2. Modo OFFLINE ativado
3. Venda OFFLINE criada: __________ (ID)
4. Conectividade reativada
5. Sincronização executada

### Validações

| Item | Antes | Depois | Status |
|------|-------|--------|--------|
| Estoque produto | __________ | __________ | ☐ OK ☐ ERRO |
| Total vendas | __________ | __________ | ☐ OK ☐ ERRO |
| Registros auditoria | __________ | __________ | ☐ OK ☐ ERRO |
| Saldo caixa | __________ | __________ | ☐ OK ☐ ERRO |

### Teste de Sincronização

- [ ] Venda offline armazenada localmente
- [ ] Conectar internet
- [ ] Sync executado com sucesso
- [ ] Venda migrou para FINALIZADA
- [ ] Estoque debitado em ambas

**Tempo de sincronização:** __________ segundos

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## ⚡ TESTE 10 — Carga

**Objetivo:** Validar performance sob volume

**Data:** ___/___/2026  
**Responsável:** ________________________

### Setup de Teste

```
Produtos criados: 1000
Clientes criados: 100
Vendas criadas: 500
Compras criadas: 50
```

### Performance Medida

| Operação | Tempo | Tempo Médio | Status |
|----------|-------|-------------|--------|
| Criar 1000 produtos | __________ s | __________ ms | ☐ OK ☐ LENTO |
| Criar 500 vendas | __________ s | __________ ms | ☐ OK ☐ LENTO |
| Query /produtos | __________ ms | — | ☐ OK ☐ LENTO |
| Query /vendas | __________ ms | — | ☐ OK ☐ LENTO |

### Uso de Recursos

| Recurso | Limite | Observado | Status |
|---------|--------|-----------|--------|
| CPU | < 90% | __________ % | ☐ OK ☐ CRÍTICO |
| Memória | < 80% | __________ % | ☐ OK ☐ CRÍTICO |
| Disco | < 80% | __________ % | ☐ OK ☐ CRÍTICO |
| Conexões BD | < 50 | __________ | ☐ OK ☐ CRÍTICO |

### Resposta de Queries

```javascript
GET /api/produtos: __________ ms (esperado: < 500ms)
GET /api/vendas: __________ ms (esperado: < 500ms)
POST /api/vendas: __________ ms (esperado: < 500ms)
POST /api/produtos: __________ ms (esperado: < 500ms)
```

### Status Final

☐ **APROVADO**  
☐ **APROVADO COM RESSALVAS**  
☐ **REPROVADO**

**Observações:**
_________________________________________________________________________

---

## 📊 RESUMO EXECUTIVO

### Resultado Final

| Teste | Status | Tempo |
|-------|--------|-------|
| 1. Deploy Limpo | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 2. Health Check | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ ms |
| 3. Backup Real | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 4. Restauração | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 5. Atualização | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 6. Rollback | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 7. Logs | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 8. Segurança | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 9. Offline First | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |
| 10. Carga | ☐ ✅ ☐ ⚠️ ☐ ❌ | __________ min |

### Classificação Final

☐ **APROVADO** — Sistema pronto para Empresa Piloto  
☐ **APROVADO COM RESSALVAS** — Necessárias correções menores  
☐ **REPROVADO** — Necessárias correções críticas

---

## 🚨 Riscos Identificados

### Críticos (bloqueiam implantação)
_________________________________________________________________________
_________________________________________________________________________

### Altos (corrigir em 2–3 dias)
_________________________________________________________________________
_________________________________________________________________________

### Médios (corrigir em 1–2 sprints)
_________________________________________________________________________
_________________________________________________________________________

---

## ✨ Melhorias Recomendadas

### Performance
_________________________________________________________________________

### Segurança
_________________________________________________________________________

### Operacional
_________________________________________________________________________

---

## ✅ Aprovação

| Papel | Nome | Data | Assinatura |
|------|------|------|-----------|
| Testador | _____________ | ___/___/2026 | ✓ |
| Revisor | _____________ | ___/___/2026 | ✓ |
| Responsável | _____________ | ___/___/2026 | ✓ |

---

## 🎯 Próximas Etapas

☐ Iniciar ETAPA 2 — Empresa Piloto (23/06/2026)  
☐ Implementar melhorias recomendadas  
☐ Documentar correções realizadas  
☐ Compartilhar com stakeholders

---

**Documento versão:** 1.0  
**Gerado em:** ___/___/2026  
**Próxima revisão:** ___/___/2026
