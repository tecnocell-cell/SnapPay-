# 📋 Roteiro — Dia 2 (2026-06-19)

**Última Atualização:** 2026-06-18 16:05  
**Status Hoje:** Fase 9 concluída (100% implementação)  
**Bloqueador:** Credenciais Nuvem Fiscal  

---

## ✅ O QUE FOI FEITO HOJE (2026-06-18)

### Fase 9.2C — Homologação
- 14 testes de homologação executados
- **Resultado: 14/14 VERDE (100%)**
- 1 bug menor encontrado e corrigido
- Documentação completa

### Fase 9.3 — NFC-e Real
- Provider Nuvem Fiscal implementado (350 linhas)
- UI Configuração Fiscal (250 linhas)
- Endpoints de validação + testar conexão
- Fallback graceful: BLOQUEADO_POR_CREDENCIAIS

### Documentação Entregue
- FASE_9_SUMMARY.md — visão geral 1 página
- STATUS_FASE_9_FINAL.md — detalhes técnicos completos
- INSTRUCOES_NUVEM_FISCAL.md — passo-a-passo configuração
- RELATORIO_FASE_9.3_NFCE_REAL.md — payloads e evidências

### Commits
```
1. fix(fase-9.2c): Typo fix
2. docs(fase-9.2c): Homologação estruturada
3. feat(fase-9.3): NFC-e Real — Nuvem Fiscal
4. docs(fase-9): Status final + instruções
5. docs(fase-9): Summary executivo
```

---

## 🎯 TAREFAS PARA AMANHÃ

### Prioridade 🔴 CRÍTICA (Fazer primeiro)

#### 1. Configurar Nuvem Fiscal (15-30 min)
- [ ] Ir para: https://www.nuvemfiscal.com.br
- [ ] Criar conta (selecionar "Homologação")
- [ ] Obter Token API (Dashboard → Integrações)
- [ ] Obter CSC (Portal Prefeitura/SEFAZ)
- [ ] Copiar CSC_ID (geralmente 1)

#### 2. Configurar Credenciais em SnapPay (5 min)
- [ ] Criar/editar arquivo `.env`:
  ```bash
  NUVEM_FISCAL_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
  NUVEM_FISCAL_CSC=1234567890
  NUVEM_FISCAL_CSC_ID=1
  ```
- [ ] Reiniciar servidor (npm start)

#### 3. Testar Conexão (5 min)
- [ ] Menu → Configuração → Configuração Fiscal
- [ ] Provider: "Nuvem Fiscal"
- [ ] Colar credenciais
- [ ] Clique "Testar Conexão"
- [ ] Validar: ✓ Conectado a Nuvem Fiscal

#### 4. Emitir NFC-e Real (10 min)
- [ ] Criar venda (com produto NCM)
- [ ] Menu → Fiscal → Emitir NFC-e
- [ ] Validar resposta:
  - Status: AUTORIZADA
  - Chave: 44 dígitos (vs 40 do MOCK)
  - Protocolo: número SEFAZ
  - DANFE URL: ativo
- [ ] Salvar evidência (screenshot + JSON resposta)

#### 5. Validar XML e DANFE (5 min)
- [ ] Clique no link DANFE
- [ ] Validar: PDF real (não mock)
- [ ] Verificar: Chave, Protocolo, Valores, Tributos
- [ ] Salvar evidência (screenshot PDF)

### Prioridade 🟡 IMPORTANTE (Se tempo permitir)

#### 6. Testar Cancelamento Real (10 min)
```bash
POST /api/fiscal/notas/:chaveAcesso/cancelar
{
  "motivo": "Teste cancelamento"
}
```
- [ ] Validar: status "CANCELADA"
- [ ] Validar: protocolo_cancelamento (número real)
- [ ] Salvar evidência

#### 7. Testar Contingência (5 min)
- [ ] Desligar internet
- [ ] Tentar emitir NFC-e
- [ ] Validar: status "CONTINGENCIA_PENDENTE"
- [ ] Ligar internet novamente
- [ ] POST /api/fiscal/reprocessar/:notaId
- [ ] Validar: status atualizado para "AUTORIZADA"

#### 8. Registrar Evidências em Documento
- [ ] Criar arquivo EVIDENCIAS_NFCE_REAL.md
- [ ] Listar payloads (request → response)
- [ ] Listar XMLs (full XML real assinado)
- [ ] Screenshots (PDFs, status SEFAZ)
- [ ] Timestamps e hashes (para rastreamento)

### Prioridade 🟢 MÉDIO PRAZO (Próximos dias)

- [ ] Suporte inter-estadual (ICMS-ST)
- [ ] Suporte nota devolvida
- [ ] Treinamento de operadores
- [ ] Migração para produção

---

## 📚 DOCUMENTAÇÃO PARA CONSULTAR

| Documento | Use quando... |
|---|---|
| **FASE_9_SUMMARY.md** | Precisa de contexto rápido |
| **INSTRUCOES_NUVEM_FISCAL.md** | Configurando Nuvem Fiscal |
| **STATUS_FASE_9_FINAL.md** | Detalhes técnicos |
| **RELATORIO_FASE_9.3_NFCE_REAL.md** | Vendo payloads esperados |

---

## 🔗 LINKS RÁPIDOS

- Nuvem Fiscal: https://www.nuvemfiscal.com.br
- Dashboard: https://app.nuvemfiscal.com.br
- Docs API: https://docs.nuvemfiscal.com.br
- SEFAZ (SP): https://nfe.fazenda.sp.gov.br

---

## ✋ BLOQUEADORES CONHECIDOS

- 🟡 **Credenciais Nuvem Fiscal** — Fora do escopo técnico, aguardando configuração
  - Solução: Criar conta, seguir INSTRUCOES_NUVEM_FISCAL.md

---

## 📝 CHECKPOINT

**Ao final do dia de amanhã, você terá:**

✅ NFC-e real emitida com sucesso  
✅ Chave SEFAZ válida (44 dígitos)  
✅ XML assinado digitalmente  
✅ DANFE PDF real  
✅ Cancelamento testado  
✅ Contingência testada  
✅ Evidências documentadas  

**Status resultante:** 🟢 VERDE (Fase 9.3 funcional em homologação)

---

## 💡 DICAS

1. **Se erro "CSC inválido":**
   - CSC_ID deve corresponder ao CSC na SEFAZ
   - Geralmente ID=1, mas confirmar

2. **Se erro "Token expirado":**
   - Regenerar Token em Nuvem Fiscal

3. **Se erro "Empresa não encontrada":**
   - Verificar CNPJ no SnapPay = CNPJ em Nuvem Fiscal

4. **Se dúvida sobre dados:**
   - Verificar RELATORIO_FASE_9.3_NFCE_REAL.md (exemplos)

---

**Boa sorte amanhã! 🚀**

Você tem tudo pronto — é só conectar as credenciais reais.

---

*Gerado: 2026-06-18 16:05*  
*Próxima atualização: Após sucesso Nuvem Fiscal*
