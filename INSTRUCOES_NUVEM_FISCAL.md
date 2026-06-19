# Instruções — Habilitar NFC-e Real em Homologação

**Status Atual:** 🟡 Bloqueado por Credenciais  
**Objetivo:** Configurar Nuvem Fiscal para emissão real  
**Tempo Estimado:** 15-30 minutos  

---

## PASSO 1: Criar Conta em Nuvem Fiscal

### 1.1 Acessar plataforma

- Ir para: https://www.nuvemfiscal.com.br
- Clicar em "Começar Agora" ou "Criar Conta"
- Selecionar "Homologação" (não é produção)

### 1.2 Preencher dados

```
Nome da Empresa: SnapPay Test (ou seu nome)
CNPJ: 12.345.678/0001-90 (seu CNPJ)
Email: seu-email@example.com
Senha: segura (será usada apenas para login)
Tipo de Negócio: Comércio ou Distribuição
```

### 1.3 Confirmar email

- Você receberá email de confirmação
- Clicar no link de verificação

---

## PASSO 2: Obter Credenciais de API

### 2.1 Acessar Dashboard

- Login em Nuvem Fiscal
- Ir para: **Dashboard → Integrações → API**

### 2.2 Copiar Token JWT

```
Campo: "API Token" ou "Bearer Token"
Formato: eyJ0eXAiOiJKV1QiLCJhbGc... (começa com "eyJ")
Copiar: Botão "Copiar" ou selecionar manualmente
Guardar: Salvo temporariamente (você confirmará depois)
```

**Exemplo (NÃO USE):**
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczpcL1wvYXBpLm51dmVtZmlzY2FsLmNvbS5iciIsImF1ZCI6ImFwaS5udXZlbWZpc2NhbC5jb20uYnIiLCJpYXQiOjE2NDYzMjEwMDAsImV4cCI6MTY0NjQwNzQwMH0.EXAMPLEJWT
```

---

## PASSO 3: Obter CSC (Código de Segurança do Cliente)

### 3.1 Onde encontrar CSC

O CSC é emitido pelo **Portal da Prefeitura** ou **Secretaria da Fazenda estadual**.

**Por Estado:**

| Estado | Onde Obter | Link |
|---|---|---|
| **SP** | SEFAZ-SP | https://nfe.fazenda.sp.gov.br (login com e-CNPJ) |
| **MG** | SEFAZ-MG | https://www.sefaz.mg.gov.br |
| **RJ** | SEFAZ-RJ | https://nfce.sefaz.rj.gov.br |
| **BA** | SEFAZ-BA | https://nfce.sefaz.ba.gov.br |
| **RS** | SEFAZ-RS | https://nfce.sefaz.rs.gov.br |
| **Outros** | Consultar secretaria estadual | — |

### 3.2 Obter CSC da SEFAZ

```
Login SEFAZ (via e-CNPJ ou certificado digital)
Navegue até: "Segurança → Código de Segurança"
Copiar: 10 dígitos (ex: 1234567890)
Guardar: Valor numérico apenas
```

### 3.3 Copiar ID do CSC

Junto do CSC vem um **ID** (geralmente **1**, mas pode variar):

```
CSC_ID: 1 (ou 2, 3... verificar na SEFAZ)
```

---

## PASSO 4: Configurar em SnapPay

### Opção A: Via Variáveis de Ambiente (Recomendado)

**Arquivo:** `.env` (raiz do projeto backend)

```bash
# Nuvem Fiscal — Homologação
NUVEM_FISCAL_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
NUVEM_FISCAL_CSC=1234567890
NUVEM_FISCAL_CSC_ID=1

# Opcional
NUVEM_FISCAL_AMBIENTE=homologacao
```

**Salvar e reiniciar servidor:**

```bash
npm start
# Servidor reinicia com credenciais carregadas
```

### Opção B: Via Tela de Configuração (UI)

1. Abrir SnapPay no navegador
2. Menu → **Configuração** → **Configuração Fiscal**
3. Provedor: Selecionar **"Nuvem Fiscal"**
4. Preenchero campos:
   - **Token API:** (colar token JWT)
   - **CSC:** (colar CSC)
   - **CSC_ID:** (colar ID, geralmente 1)
   - **Série:** 1 (padrão)
   - **Número Atual:** 0 (começa do zero)

5. Clique **"Testar Conexão"**

---

## PASSO 5: Testar Conexão

### 5.1 Via UI

```
Menu → Configuração Fiscal
Botão: "🔗 Testar Conexão"
Resultado Esperado: ✓ Conectado a Nuvem Fiscal — Ambiente: homologacao
```

### 5.2 Via API (curl)

```bash
curl -X POST http://localhost:3000/api/fiscal/configuracoes/validar \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "NUVEM_FISCAL",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "csc": "1234567890",
    "csc_id": "1"
  }'
```

**Resposta (Sucesso):**
```json
{
  "ok": true,
  "mensagem": "Conectado a Nuvem Fiscal — Ambiente: homologacao",
  "credenciais_ok": true,
  "ambiente": "homologacao"
}
```

**Resposta (Erro):**
```json
{
  "ok": false,
  "status": "BLOQUEADO_POR_CREDENCIAIS",
  "motivo": "Credenciais Nuvem Fiscal não configuradas..."
}
```

---

## PASSO 6: Testar Emissão Real

### 6.1 Criar Venda

1. Menu → **Vendas** → **Nova Venda**
2. Adicionar produto com NCM (ex: Arroz NCM 10061000)
3. Confirmar venda

### 6.2 Emitir NFC-e

```
Menu → Fiscal → Emitir NFC-e
Selecionar: Venda criada
Clicar: "Emitir NFC-e"
```

**Resultado Esperado:**

```
Status: ✅ AUTORIZADA
Chave de Acesso: 35240612345678000190550010000000001234567890 (44 dígitos)
Protocolo: 135240618901234 (número SEFAZ)
DANFE URL: https://homolog-api.nuvemfiscal.com.br/nfce/danfe/35240612345678000190550010000000001234567890
```

### 6.3 Baixar DANFE

- Clicar no link de DANFE
- PDF deve abrir com comprovante fiscal
- Validar: Chave, Protocolo, Valores, Tributos

---

## PASSO 7: Testes Adicionais

### Teste 1: Cancelamento

```bash
POST /api/fiscal/notas/:chaveAcesso/cancelar
{
  "motivo": "Erro no cadastro"
}
```

**Resposta (Sucesso):**
```json
{
  "status": "CANCELADA",
  "protocolo_cancelamento": "135240618901235"
}
```

### Teste 2: Inutilização

```bash
POST /api/fiscal/inutilizar
{
  "faixa": {
    "serie": 1,
    "numero_inicio": 10,
    "numero_fim": 20,
    "motivo": "Séries danificadas"
  }
}
```

### Teste 3: Contingência (Offline)

Desligar internet → Tentar emitir NFC-e

```
Status: CONTINGENCIA_PENDENTE
XML local gerado
Quando online: POST /api/fiscal/reprocessar/:notaId
```

---

## TROUBLESHOOTING

### ❌ Erro: "Token inválido"

**Solução:**
- Verificar se token começa com `eyJ`
- Regenerar token em Nuvem Fiscal
- Copiar token completo (não truncar)

### ❌ Erro: "CSC não encontrado"

**Solução:**
- Verificar CSC_ID (não é o CSC)
- CSC_ID é geralmente **1**, mas confirmar na SEFAZ
- CSC deve ter 10 dígitos

### ❌ Erro: "Empresa não encontrada em Nuvem Fiscal"

**Solução:**
- Verificar CNPJ cadastrado
- Deve corresponder ao CNPJ no SnapPay
- Pode precisar sincronizar em Nuvem Fiscal

### ❌ Erro: "Timeout comunicando com Nuvem Fiscal"

**Solução:**
- Verificar conexão internet
- Verificar endpoint correto (homologacao vs producao)
- Aumentar timeout em nuvemfiscal.js linha 79 (30000ms)

### ❌ NFC-e criada mas status "REJEITADA"

**Solução:**
- Verificar produto tem NCM
- Verificar empresa tem CNPJ + CRT + CNAE
- Ler motivo_rejeicao na resposta
- Validar dados fiscais em Nuvem Fiscal

---

## EVIDÊNCIAS ESPERADAS

Após habilitar, você verá:

### ✅ Log de Sucesso

```
[15:30:00] POST /api/fiscal/notas/emitir
[15:30:02] Enviando para Nuvem Fiscal...
[15:30:05] ✓ AUTORIZADA — Chave: 3524061234567800019055001000000000123456789
[15:30:05] DANFE: https://homolog-api.nuvemfiscal.com.br/nfce/danfe/...
```

### ✅ XML Real (assinado)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35240612345678000190550010000000001234567890">
      <ide>
        <cUF>35</cUF>
        <CNPJ>12.345.678/0001-90</CNPJ>
        <assinaturaQRCode>...REAL...</assinaturaQRCode>
      </ide>
      ...
    </infNFe>
    <Signature>...</Signature> <!-- Assinado! -->
  </NFe>
</nfeProc>
```

### ✅ DANFE PDF

- Link ativo: `https://homolog-api.nuvemfiscal.com.br/nfce/danfe/35240612345678000190550010000000001234567890`
- PDF real (não mock)
- Validado visualmente com Chave + Protocolo

---

## ROADMAP APÓS HABILITAR

| Passo | Ação | Status |
|---|---|---|
| 1 | Testar emissão real (happy path) | 🟡 Bloqueado |
| 2 | Testar cancelamento real | 🟡 Bloqueado |
| 3 | Testar inutilização | 🟡 Bloqueado |
| 4 | Testar contingência (offline) | 🟡 Bloqueado |
| 5 | Validar XML assinado digitalmente | 🟡 Bloqueado |
| 6 | Validar DANFE PDF completo | 🟡 Bloqueado |
| 7 | Testes stress (100 vendas) | 🟡 Bloqueado |
| 8 | Auditoria fiscal em produção | 🟡 Bloqueado |

---

## REFERÊNCIAS

- **Nuvem Fiscal:** https://www.nuvemfiscal.com.br
- **Documentação API:** https://docs.nuvemfiscal.com.br
- **Dashboard:** https://app.nuvemfiscal.com.br
- **Suporte:** support@nuvemfiscal.com.br

---

## DÚVIDAS?

Se tiver dúvidas durante a configuração:

1. Verificar logs em: `backend/logs/nfce.log`
2. Testar conectividade:
   ```bash
   curl -I https://homolog-api.nuvemfiscal.com.br/nfce/status
   ```
3. Contatar suporte Nuvem Fiscal com screenshot do erro

---

**Versão:** 1.0  
**Data:** 2026-06-18  
**Status:** Aguardando Credenciais  
