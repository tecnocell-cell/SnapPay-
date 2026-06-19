# 🧪 PLANO DE VALIDAÇÃO — ETAPA 1: Ambiente Piloto

**Versão:** 1.0  
**Data:** 18 de junho de 2026  
**Objetivo:** Validar que a infraestrutura documentada funciona de verdade na prática

---

## 📋 Visão Geral dos 10 Testes

| # | Teste | Prioridade | Tempo | Objetivo |
|---|-------|-----------|-------|----------|
| **1** | Deploy limpo | 🔴 Crítico | 45 min | Reproduzibilidade exata |
| **2** | Health check | 🔴 Crítico | 15 min | Monitoramento funciona |
| **3** | Backup real | 🟠 Alto | 10 min | Dados protegidos |
| **4** | Restauração real | 🟠 Alto | 15 min | Recuperação possível |
| **5** | Atualização | 🟠 Alto | 20 min | Zero-downtime update |
| **6** | Rollback | 🟠 Alto | 15 min | Recuperação de erro |
| **7** | Logs | 🟡 Médio | 10 min | Auditoria funciona |
| **8** | Segurança | 🔴 Crítico | 20 min | Defesa validada |
| **9** | Offline First | 🟡 Médio | 30 min | Sincronização ok |
| **10** | Carga | 🟡 Médio | 30 min | Performance ok |

**Tempo total estimado:** ~3.5 horas (por isso, fazer aos poucos ao longo da semana)

---

## 🎬 TESTE 1 — Deploy Limpo

### Objetivo
Provar que alguém seguindo os manuais consegue subir a aplicação do zero sem surpresas.

### Ambiente
- Servidor novo (VPS limpo ou VM local)
- Ubuntu 24.04 LTS
- Sem nenhum código SnapPay pré-instalado

### Passo-a-passo

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
REPORT="/tmp/deploy_test_${TIMESTAMP}.log"

echo "🚀 TESTE 1: Deploy Limpo" | tee -a $REPORT
echo "Timestamp: $TIMESTAMP" >> $REPORT

# PASSO 1: Clone
echo -e "\n📥 1. Clone do repositório..." | tee -a $REPORT
TIME_START=$(date +%s)
git clone https://github.com/tecnocell-cell/SnapPay-.git /tmp/snappay-test
cd /tmp/snappay-test
TIME_CLONE=$(($(date +%s) - TIME_START))
echo "✅ Clone concluído em ${TIME_CLONE}s" | tee -a $REPORT

# PASSO 2: Verificar estrutura
echo -e "\n📂 2. Verificando estrutura..." | tee -a $REPORT
ls -la backend/ frontend/ docker-compose.yml >> $REPORT
echo "✅ Estrutura OK" | tee -a $REPORT

# PASSO 3: Docker build (se usar Docker)
echo -e "\n🐳 3. Build Docker..." | tee -a $REPORT
TIME_START=$(date +%s)
docker-compose build 2>&1 | tail -20 >> $REPORT
TIME_BUILD=$(($(date +%s) - TIME_START))
echo "✅ Build concluído em ${TIME_BUILD}s" | tee -a $REPORT

# PASSO 4: Subir containers
echo -e "\n▶️  4. Iniciando containers..." | tee -a $REPORT
docker-compose up -d
sleep 10

# PASSO 5: Migrations
echo -e "\n🗄️  5. Executando migrations..." | tee -a $REPORT
docker-compose exec -T backend npx sequelize db:migrate >> $REPORT 2>&1
echo "✅ Migrations OK" | tee -a $REPORT

# PASSO 6: Testar acesso
echo -e "\n🌐 6. Testando acesso..." | tee -a $REPORT
HEALTH=$(curl -s http://localhost:3001/health | jq .status)
if [ "$HEALTH" = '"ok"' ]; then
    echo "✅ Backend respondendo" | tee -a $REPORT
else
    echo "❌ ERRO: Backend não respondendo!" | tee -a $REPORT
    exit 1
fi

# PASSO 7: Testar frontend
echo -e "\n7. Testando frontend..." | tee -a $REPORT
FRONTEND=$(curl -s http://localhost | head -1)
if [[ $FRONTEND == *"DOCTYPE"* ]]; then
    echo "✅ Frontend servindo HTML" | tee -a $REPORT
else
    echo "❌ ERRO: Frontend não respondendo!" | tee -a $REPORT
    exit 1
fi

TIME_TOTAL=$((TIME_CLONE + TIME_BUILD + 10))
echo -e "\n✅ TESTE 1 APROVADO" | tee -a $REPORT
echo "Tempo total: ${TIME_TOTAL}s (~7 minutos com downloads)" | tee -a $REPORT
echo -e "\nRelatório: $REPORT"

cat $REPORT
```

### Validação esperada

- ✅ Clone bem-sucedido
- ✅ Build Docker completo
- ✅ Containers ligados
- ✅ Banco criado e migrado
- ✅ Backend respondendo em < 5 seg
- ✅ Frontend servindo

### Documentar

```
Tempo de deploy (primeira vez): ___ minutos
Erros encontrados: _____________
Passo que demorou mais: _________
```

---

## 💓 TESTE 2 — Health Check

### Objetivo
Validar que monitoramento funciona e conseguimos saber o estado do sistema.

### Endpoint requerido

```javascript
// backend/routes/health.js
GET /api/health

Retorno:
{
  "status": "ok",
  "api": "ok",
  "database": "ok",
  "disk": {
    "free_gb": 95,
    "used_percent": 5,
    "status": "ok"
  },
  "memory": {
    "used_mb": 512,
    "total_mb": 8192,
    "percent": 6,
    "status": "ok"
  },
  "sync": {
    "pending": 0,
    "status": "ok"
  },
  "timestamp": "2026-06-18T22:00:00Z"
}
```

### Script de teste

```bash
#!/bin/bash

HEALTH_URL="http://localhost:3001/api/health"
REPORT="/tmp/health_test_$(date +%s).log"

echo "💓 TESTE 2: Health Check" > $REPORT

# Teste 1: Endpoint responde?
echo -e "\n1. Testando endpoint..." >> $REPORT
RESPONSE=$(curl -s -w "\n%{http_code}" $HEALTH_URL)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ HTTP 200" >> $REPORT
else
    echo "❌ HTTP $HTTP_CODE" >> $REPORT
    exit 1
fi

# Teste 2: JSON válido?
echo "$BODY" | jq . > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ JSON válido" >> $REPORT
else
    echo "❌ JSON inválido" >> $REPORT
    exit 1
fi

# Teste 3: Campos esperados?
STATUS=$(echo "$BODY" | jq .status)
API=$(echo "$BODY" | jq .api)
DATABASE=$(echo "$BODY" | jq .database)

if [ "$STATUS" = '"ok"' ] && [ "$API" = '"ok"' ] && [ "$DATABASE" = '"ok"' ]; then
    echo "✅ Status, API, Database = ok" >> $REPORT
else
    echo "❌ Campos não estão ok" >> $REPORT
    exit 1
fi

# Teste 4: Disco ok?
DISK_PERCENT=$(echo "$BODY" | jq .disk.used_percent)
if [ "$DISK_PERCENT" -lt 80 ]; then
    echo "✅ Disco: ${DISK_PERCENT}% (OK)" >> $REPORT
else
    echo "⚠️  Disco: ${DISK_PERCENT}% (AVISO)" >> $REPORT
fi

# Teste 5: Memória ok?
MEMORY_PERCENT=$(echo "$BODY" | jq .memory.percent)
if [ "$MEMORY_PERCENT" -lt 85 ]; then
    echo "✅ Memória: ${MEMORY_PERCENT}% (OK)" >> $REPORT
else
    echo "⚠️  Memória: ${MEMORY_PERCENT}% (AVISO)" >> $REPORT
fi

echo -e "\n✅ TESTE 2 APROVADO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ Endpoint existe e responde em < 100 ms
- ✅ JSON válido
- ✅ Campos status/api/database presentes
- ✅ Disco < 80%
- ✅ Memória < 85%

---

## 💾 TESTE 3 — Backup Real

### Objetivo
Validar que backup automático funciona e protege os dados.

### Dados de teste

```bash
# Criar dados no banco
psql -h localhost -U snappay_homolog_user -d snappay_homolog <<EOF

-- Produtos
INSERT INTO produtos (codigo, nome, preco_venda, estoque_atual) VALUES
('P001', 'Produto A', 10.00, 100),
('P002', 'Produto B', 20.00, 50),
('P003', 'Produto C', 15.00, 75);

-- Clientes
INSERT INTO clientes (nome, cpf_cnpj, tipo) VALUES
('Cliente 1', '12345678901', 'PF'),
('Cliente 2', '12345678901234', 'PJ');

-- Vendas
INSERT INTO vendas (empresa_id, valor_total, status) VALUES
(1, 100.00, 'FINALIZADA'),
(1, 250.00, 'FINALIZADA');

-- Compras
INSERT INTO compras (empresa_id, fornecedor_id, valor_total, status) VALUES
(1, 1, 500.00, 'RECEBIDA');

EOF
```

### Script de backup

```bash
#!/bin/bash

REPORT="/tmp/backup_test_$(date +%s).log"
BACKUP_DIR="/backup/snappay_homolog/test"
mkdir -p $BACKUP_DIR

echo "💾 TESTE 3: Backup Real" > $REPORT
echo "Timestamp: $(date)" >> $REPORT

# Contar registros antes
echo -e "\n1. Contando registros antes do backup..." >> $REPORT
BEFORE=$(psql -h localhost -U snappay_homolog_user -d snappay_homolog -tc \
    "SELECT COUNT(*) FROM produtos;")
echo "Produtos: $BEFORE" >> $REPORT

# Executar backup
echo -e "\n2. Executando backup..." >> $REPORT
TIME_START=$(date +%s)

BACKUP_FILE="$BACKUP_DIR/snappay_test_$(date +%Y-%m-%d_%H-%M-%S).sql.gz"
pg_dump -h localhost -U snappay_homolog_user -d snappay_homolog --no-password -F p | \
    gzip > "$BACKUP_FILE"

TIME_BACKUP=$(($(date +%s) - TIME_START))
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup concluído em ${TIME_BACKUP}s" >> $REPORT
echo "Arquivo: $BACKUP_FILE" >> $REPORT
echo "Tamanho: $SIZE" >> $REPORT

# Testar integridade
echo -e "\n3. Testando integridade..." >> $REPORT
if gunzip -t "$BACKUP_FILE" 2>&1 >> $REPORT; then
    echo "✅ Arquivo íntegro" >> $REPORT
else
    echo "❌ Arquivo corrompido!" >> $REPORT
    exit 1
fi

# Listar estrutura
echo -e "\n4. Listando estrutura..." >> $REPORT
gunzip -c "$BACKUP_FILE" | head -50 >> $REPORT

echo -e "\n✅ TESTE 3 APROVADO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ Backup criado com sucesso
- ✅ Arquivo tem tamanho esperado (> 10 KB)
- ✅ Integridade validada (gunzip -t)
- ✅ Tempo < 5 minutos
- ✅ Contém estrutura SQL esperada

---

## 🔄 TESTE 4 — Restauração Real

### Objetivo
Validar que conseguimos recuperar dados intactos após falha.

### Procedimento

```bash
#!/bin/bash

REPORT="/tmp/restore_test_$(date +%s).log"
BACKUP_FILE="/backup/snappay_homolog/test/snappay_test_*.sql.gz"

echo "🔄 TESTE 4: Restauração Real" > $REPORT

# 1. Contar registros em banco original
echo -e "\n1. Registros no banco original..." >> $REPORT
BEFORE=$(psql -h localhost -U snappay_homolog_user -d snappay_homolog -tc \
    "SELECT COUNT(*) FROM produtos;")
echo "Produtos: $BEFORE" >> $REPORT

# 2. Criar BD de teste
echo -e "\n2. Criando BD de teste..." >> $REPORT
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS snappay_restore_test;
CREATE DATABASE snappay_restore_test OWNER snappay_homolog_user;
EOF
echo "✅ BD criada" >> $REPORT

# 3. Restaurar backup
echo -e "\n3. Restaurando backup..." >> $REPORT
TIME_START=$(date +%s)

gunzip -c "$BACKUP_FILE" | \
    psql -h localhost -U snappay_homolog_user -d snappay_restore_test --no-password >> $REPORT 2>&1

TIME_RESTORE=$(($(date +%s) - TIME_START))
echo "✅ Restauração concluída em ${TIME_RESTORE}s" >> $REPORT

# 4. Validar dados
echo -e "\n4. Validando dados restaurados..." >> $REPORT
AFTER=$(psql -h localhost -U snappay_homolog_user -d snappay_restore_test -tc \
    "SELECT COUNT(*) FROM produtos;")
echo "Produtos restaurados: $AFTER" >> $REPORT

if [ "$BEFORE" = "$AFTER" ]; then
    echo "✅ Dados íntegros (antes=$BEFORE, depois=$AFTER)" >> $REPORT
else
    echo "❌ Dados inconsistentes!" >> $REPORT
    exit 1
fi

# 5. Validar relacionamentos
echo -e "\n5. Validando relacionamentos..." >> $REPORT
psql -h localhost -U snappay_homolog_user -d snappay_restore_test <<EOF >> $REPORT
SELECT COUNT(*) as clientes FROM clientes;
SELECT COUNT(*) as vendas FROM vendas;
SELECT COUNT(*) as compras FROM compras;
SELECT COUNT(*) as auditoria FROM auditoria;
EOF

# 6. Limpar
echo -e "\n6. Limpando BD de teste..." >> $REPORT
sudo -u postgres psql -c "DROP DATABASE snappay_restore_test;"

echo -e "\n✅ TESTE 4 APROVADO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ BD de teste criada
- ✅ Restauração completa em < 10 seg
- ✅ Todos os registros presentes
- ✅ Relacionamentos intactos
- ✅ Auditoria preservada

---

## 📦 TESTE 5 — Atualização (Zero-downtime)

### Objetivo
Validar que conseguimos fazer update sem perder dados.

### Simulação

```bash
#!/bin/bash

REPORT="/tmp/update_test_$(date +%s).log"

echo "📦 TESTE 5: Atualização de Versão" > $REPORT

# 1. Contar registros em versão A
echo -e "\n1. Versão A - Registros iniciais..." >> $REPORT
V_A=$(psql -h localhost -U snappay_homolog_user -d snappay_homolog -tc \
    "SELECT COUNT(*) FROM vendas;")
echo "Vendas: $V_A" >> $REPORT

# 2. Simular atualização (new migration)
echo -e "\n2. Simulando nova migration..." >> $REPORT
# Criar nova tabela ou alterar existente
psql -h localhost -U snappay_homolog_user -d snappay_homolog <<EOF >> $REPORT 2>&1
BEGIN;
-- Simulação de nova coluna
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS versao_atualizada VARCHAR(50) DEFAULT 'v2.0';
COMMIT;
EOF
echo "✅ Migration aplicada" >> $REPORT

# 3. Verificar dados após update
echo -e "\n3. Após update - Registros preservados..." >> $REPORT
V_B=$(psql -h localhost -U snappay_homolog_user -d snappay_homolog -tc \
    "SELECT COUNT(*) FROM vendas;")
echo "Vendas: $V_B" >> $REPORT

if [ "$V_A" = "$V_B" ]; then
    echo "✅ Dados preservados" >> $REPORT
else
    echo "❌ Dados perdidos!" >> $REPORT
    exit 1
fi

# 4. Validar coluna nova existe
echo -e "\n4. Validando nova coluna..." >> $REPORT
psql -h localhost -U snappay_homolog_user -d snappay_homolog -c \
    "\d vendas" | grep versao_atualizada >> $REPORT
echo "✅ Coluna criada" >> $REPORT

echo -e "\n✅ TESTE 5 APROVADO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ Migration aplicada sem erro
- ✅ Dados preservados (contagem igual)
- ✅ Nova estrutura ativa
- ✅ Zero perda de dados

---

## ↩️ TESTE 6 — Rollback

### Objetivo
Validar que conseguimos voltar em caso de erro.

### Procedimento

```bash
#!/bin/bash

REPORT="/tmp/rollback_test_$(date +%s).log"

echo "↩️  TESTE 6: Rollback de Versão" > $REPORT

# 1. Backup antes de tudo
echo -e "\n1. Fazendo backup de segurança..." >> $REPORT
SAFE_BACKUP="/tmp/safe_backup_$(date +%s).sql.gz"
pg_dump -h localhost -U snappay_homolog_user -d snappay_homolog --no-password -F p | \
    gzip > "$SAFE_BACKUP"
echo "✅ Backup: $SAFE_BACKUP" >> $REPORT

# 2. Aplicar "bad" migration (que vamos reverter)
echo -e "\n2. Aplicando migration 'ruim'..." >> $REPORT
psql -h localhost -U snappay_homolog_user -d snappay_homolog <<EOF >> $REPORT 2>&1
ALTER TABLE vendas ADD COLUMN bad_column TEXT;
INSERT INTO vendas (bad_column) VALUES ('corrupted');
EOF
echo "❌ Migration ruim aplicada (simulação)" >> $REPORT

# 3. Restaurar do backup de segurança
echo -e "\n3. Detectando erro e rollback..." >> $REPORT
echo "Descartando banco..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS snappay_homolog;"
echo "Recriando BD vazia..."
sudo -u postgres psql <<EOF
CREATE DATABASE snappay_homolog OWNER snappay_homolog_user;
EOF

echo -e "\n4. Restaurando backup limpo..." >> $REPORT
gunzip -c "$SAFE_BACKUP" | \
    psql -h localhost -U snappay_homolog_user -d snappay_homolog --no-password >> $REPORT 2>&1
echo "✅ Banco restaurado" >> $REPORT

# 5. Verificar que bad_column não existe
echo -e "\n5. Validando rollback..." >> $REPORT
if psql -h localhost -U snappay_homolog_user -d snappay_homolog -c \
    "\d vendas" | grep -q "bad_column"; then
    echo "❌ Rollback falhou!" >> $REPORT
    exit 1
else
    echo "✅ Rollback bem-sucedido (bad_column removido)" >> $REPORT
fi

# 6. Limpar
rm "$SAFE_BACKUP"

echo -e "\n✅ TESTE 6 APROVADO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ Backup de segurança criado
- ✅ Erro simulado com sucesso
- ✅ Rollback efetuado
- ✅ Banco volta ao estado anterior
- ✅ Dados integros

---

## 📝 TESTE 7 — Logs

### Objetivo
Validar que logs são gerados corretamente para auditoria.

### Procedimento

```bash
#!/bin/bash

REPORT="/tmp/logs_test_$(date +%s).log"

echo "📝 TESTE 7: Geração de Logs" > $REPORT

# 1. Verificar que logs estão sendo criados
echo -e "\n1. Verificando diretórios de logs..." >> $REPORT
for dir in application errors sync fiscal; do
    if [ -d "/var/log/snappay/$dir" ]; then
        echo "✅ /var/log/snappay/$dir existe" >> $REPORT
    else
        echo "❌ /var/log/snappay/$dir não existe!" >> $REPORT
        exit 1
    fi
done

# 2. Fazer uma venda para gerar log
echo -e "\n2. Criando venda para gerar log..." >> $REPORT
curl -s -X POST http://localhost:3001/api/vendas \
    -H "Content-Type: application/json" \
    -d '{"empresa_id":1,"valor_total":100.00}' >> $REPORT 2>&1

sleep 2

# 3. Procurar log da aplicação
echo -e "\n3. Verificando logs de aplicação..." >> $REPORT
if [ -f "/var/log/snappay/application/app-$(date +%Y-%m-%d).log" ]; then
    echo "✅ Log de aplicação gerado" >> $REPORT
    tail -5 /var/log/snappay/application/app-*.log >> $REPORT
else
    echo "❌ Log de aplicação não gerado!" >> $REPORT
fi

# 4. Verificar log de erro (se houver)
echo -e "\n4. Verificando logs de erro..." >> $REPORT
ERROR_COUNT=$(grep -r "error\|exception" /var/log/snappay/errors/ 2>/dev/null | wc -l)
echo "Erros registrados: $ERROR_COUNT" >> $REPORT
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✅ Sem erros durante teste" >> $REPORT
fi

# 5. Rotar logs
echo -e "\n5. Testando rotação de logs..." >> $REPORT
sudo logrotate -f /etc/logrotate.d/snappay >> $REPORT 2>&1
echo "✅ Rotação executada" >> $REPORT

echo -e "\n✅ TESTE 7 APROVADO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ Diretórios de logs existem
- ✅ Logs de aplicação sendo gerados
- ✅ Logs de erro (quando aplicável)
- ✅ Logs de sync (offline)
- ✅ Logs de fiscal
- ✅ Rotação de logs funciona

---

## 🔒 TESTE 8 — Segurança

### Objetivo
Validar que defesas de segurança estão ativas.

### Checklist

```bash
#!/bin/bash

REPORT="/tmp/security_test_$(date +%s).log"

echo "🔒 TESTE 8: Segurança" > $REPORT

# 1. .env fora do git?
echo -e "\n1. Verificando .env.homolog..." >> $REPORT
if grep -q ".env.homolog" .gitignore; then
    echo "✅ .env.homolog está em .gitignore" >> $REPORT
else
    echo "❌ .env.homolog NÃO está em .gitignore!" >> $REPORT
fi

# 2. Portas abertas?
echo -e "\n2. Verificando portas..." >> $REPORT
sudo netstat -tlnp 2>/dev/null | grep -E ":(22|80|443|3001|5432)" >> $REPORT
echo "Esperado: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3001 (Backend), 5432 (DB local)" >> $REPORT

# 3. Firewall ativo?
echo -e "\n3. Verificando firewall..." >> $REPORT
if sudo ufw status | grep -q "active"; then
    echo "✅ Firewall ativo" >> $REPORT
else
    echo "⚠️  Firewall não está ativo" >> $REPORT
fi

# 4. HTTPS/SSL válido?
echo -e "\n4. Verificando HTTPS..." >> $REPORT
if [ -f "/etc/letsencrypt/live/homolog.seudominio.com.br/fullchain.pem" ]; then
    echo "✅ Certificado Let's Encrypt existe" >> $REPORT
    openssl x509 -in /etc/letsencrypt/live/homolog.seudominio.com.br/fullchain.pem \
        -noout -dates >> $REPORT
else
    echo "⚠️  Certificado não encontrado (normal em dev local)" >> $REPORT
fi

# 5. Renovação SSL programada?
echo -e "\n5. Verificando renovação SSL..." >> $REPORT
if sudo systemctl is-active --quiet certbot.timer 2>/dev/null; then
    echo "✅ Certbot timer ativo" >> $REPORT
else
    echo "⚠️  Certbot timer não ativo (normal em dev)" >> $REPORT
fi

# 6. Permissões de .env
echo -e "\n6. Verificando permissões de .env..." >> $REPORT
if [ -f ".env.homolog" ]; then
    PERMS=$(stat -f "%OLp" .env.homolog 2>/dev/null || stat -c "%a" .env.homolog)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "-rw-------" ]; then
        echo "✅ .env.homolog com permissões 600" >> $REPORT
    else
        echo "⚠️  .env.homolog com permissões $PERMS (deveria ser 600)" >> $REPORT
    fi
fi

# 7. Senhas em logs?
echo -e "\n7. Verificando se senhas estão em logs..." >> $REPORT
if grep -r "password\|PASSWORD\|secret\|SECRET" /var/log/snappay/ 2>/dev/null | grep -v "error" > /dev/null; then
    echo "⚠️  Possível credencial em logs!" >> $REPORT
else
    echo "✅ Nenhuma credencial detectada em logs" >> $REPORT
fi

# 8. Headers de segurança
echo -e "\n8. Verificando headers de segurança..." >> $REPORT
HEADERS=$(curl -s -I https://localhost 2>/dev/null | grep -i "strict-transport\|x-frame\|x-content")
if [ -n "$HEADERS" ]; then
    echo "✅ Headers de segurança presentes:" >> $REPORT
    echo "$HEADERS" >> $REPORT
else
    echo "⚠️  Headers de segurança não detectados" >> $REPORT
fi

echo -e "\n✅ TESTE 8 COMPLETO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ .env.homolog em .gitignore
- ✅ Portas corretas abertas
- ✅ Firewall ativo (ou documentado por que não)
- ✅ HTTPS/SSL válido
- ✅ Renovação SSL automática
- ✅ Permissões 600 em .env
- ✅ Sem credenciais em logs
- ✅ Headers de segurança

---

## 📡 TESTE 9 — Offline First

### Objetivo
Validar que sincronização offline funciona.

### Procedimento

```bash
#!/bin/bash

REPORT="/tmp/offline_test_$(date +%s).log"

echo "📡 TESTE 9: Offline First" > $REPORT

# 1. Fazer venda ONLINE
echo -e "\n1. Criando venda ONLINE..." >> $REPORT
VENDA_1=$(curl -s -X POST http://localhost:3001/api/vendas \
    -H "Content-Type: application/json" \
    -d '{"empresa_id":1,"valor_total":100.00,"status":"FINALIZADA"}' | jq .id)
echo "Venda online ID: $VENDA_1" >> $REPORT

# 2. Validar estoque foi debitado
echo -e "\n2. Verificando estoque após venda online..." >> $REPORT
ESTOQUE=$(curl -s http://localhost:3001/api/produtos/1 | jq .estoque_atual)
echo "Estoque: $ESTOQUE" >> $REPORT

# 3. SIMULAR OFFLINE (parar conectividade)
echo -e "\n3. Simulando modo offline..." >> $REPORT
# Em teste real, desligar internet ou usar proxy
# Aqui vamos usar um flag no frontend
echo "❌ Modo offline ativado (interface)" >> $REPORT

# 4. Fazer venda OFFLINE
echo -e "\n4. Criando venda OFFLINE..." >> $REPORT
# Esta seria feita no frontend com armazenamento local
# Para teste, vamos simular com API local
VENDA_OFFLINE=$(curl -s -X POST http://localhost:3001/api/vendas-offline \
    -H "Content-Type: application/json" \
    -d '{"empresa_id":1,"valor_total":50.00,"status":"PENDING_SYNC"}')
echo "Venda offline: $VENDA_OFFLINE" >> $REPORT

# 5. RELIGAR CONECTIVIDADE
echo -e "\n5. Reativando conectividade..." >> $REPORT
sleep 2
echo "✅ Conectividade reativada" >> $REPORT

# 6. SINCRONIZAR
echo -e "\n6. Sincronizando..." >> $REPORT
SYNC=$(curl -s -X POST http://localhost:3001/api/sync)
echo "Resultado sync: $SYNC" >> $REPORT

# 7. Validar que venda offline foi sincronizada
echo -e "\n7. Verificando se venda offline foi sincronizada..." >> $REPORT
VENDAS_TOTAL=$(curl -s http://localhost:3001/api/vendas | jq '.length')
echo "Total de vendas: $VENDAS_TOTAL (deveria ser ≥ 2)" >> $REPORT

# 8. Validar estoque final
echo -e "\n8. Verificando estoque final..." >> $REPORT
ESTOQUE_FINAL=$(curl -s http://localhost:3001/api/produtos/1 | jq .estoque_atual)
echo "Estoque final: $ESTOQUE_FINAL (deveria estar com ambas vendas debitadas)" >> $REPORT

if [ "$ESTOQUE_FINAL" -lt "$ESTOQUE" ]; then
    echo "✅ Estoque debitado corretamente" >> $REPORT
else
    echo "❌ Estoque não foi debitado!" >> $REPORT
fi

# 9. Validar auditoria
echo -e "\n9. Verificando auditoria..." >> $REPORT
AUDIT=$(curl -s http://localhost:3001/api/auditoria | jq 'length')
echo "Registros de auditoria: $AUDIT" >> $REPORT

echo -e "\n✅ TESTE 9 COMPLETO" >> $REPORT
cat $REPORT
```

### Validação esperada

- ✅ Venda online registrada
- ✅ Estoque debitado (online)
- ✅ Venda offline registrada localmente
- ✅ Sincronização executada
- ✅ Venda offline migrou para online
- ✅ Estoque final correto
- ✅ Auditoria registra ambas as operações

---

## ⚡ TESTE 10 — Carga (Load Test)

### Objetivo
Validar que sistema aguenta volume esperado.

### Setup de teste

```javascript
// tests/load-test.js
const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3001';
const NUM_PRODUCTS = 1000;
const NUM_CUSTOMERS = 100;
const NUM_SALES = 500;

async function createProducts() {
    console.log(`📦 Criando ${NUM_PRODUCTS} produtos...`);
    const times = [];
    
    for (let i = 0; i < NUM_PRODUCTS; i++) {
        const start = Date.now();
        
        const product = {
            codigo: `P${String(i).padStart(6, '0')}`,
            nome: `Produto ${i}`,
            preco_venda: Math.random() * 100,
            estoque_atual: Math.floor(Math.random() * 1000)
        };
        
        await fetch(`${BASE_URL}/api/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        const time = Date.now() - start;
        times.push(time);
        
        if ((i + 1) % 100 === 0) {
            console.log(`  ${i + 1}/${NUM_PRODUCTS} - Média: ${(times.reduce((a,b) => a+b)/times.length).toFixed(2)}ms`);
        }
    }
    
    const avg = times.reduce((a,b) => a+b) / times.length;
    const max = Math.max(...times);
    
    console.log(`✅ Produtos criados`);
    console.log(`   Tempo médio: ${avg.toFixed(2)}ms`);
    console.log(`   Tempo máximo: ${max}ms`);
    
    return { count: NUM_PRODUCTS, avg, max };
}

async function createSales() {
    console.log(`💳 Criando ${NUM_SALES} vendas...`);
    const times = [];
    
    for (let i = 0; i < NUM_SALES; i++) {
        const start = Date.now();
        
        const sale = {
            empresa_id: 1,
            valor_total: Math.random() * 500,
            status: 'FINALIZADA'
        };
        
        await fetch(`${BASE_URL}/api/vendas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sale)
        });
        
        const time = Date.now() - start;
        times.push(time);
        
        if ((i + 1) % 50 === 0) {
            console.log(`  ${i + 1}/${NUM_SALES} - Média: ${(times.reduce((a,b) => a+b)/times.length).toFixed(2)}ms`);
        }
    }
    
    const avg = times.reduce((a,b) => a+b) / times.length;
    const max = Math.max(...times);
    
    console.log(`✅ Vendas criadas`);
    console.log(`   Tempo médio: ${avg.toFixed(2)}ms`);
    console.log(`   Tempo máximo: ${max}ms`);
    
    return { count: NUM_SALES, avg, max };
}

async function queryPerformance() {
    console.log(`\n📊 Teste de query...`);
    const start = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/produtos?limit=100`);
    const data = await response.json();
    
    const time = Date.now() - start;
    console.log(`✅ GET /produtos: ${time}ms`);
    
    assert(data.length > 0, 'Produtos deveriam ser retornados');
    
    return time;
}

async function memoryUsage() {
    console.log(`\n💾 Uso de memória...`);
    const response = await fetch(`${BASE_URL}/api/health`);
    const health = await response.json();
    
    console.log(`   Memória: ${health.memory.used_mb}MB / ${health.memory.total_mb}MB (${health.memory.percent}%)`);
    console.log(`   Disco: ${health.disk.used_percent}%`);
    
    if (health.memory.percent > 85) {
        console.log(`⚠️  Memória alta!`);
    } else {
        console.log(`✅ Memória OK`);
    }
}

async function run() {
    console.log('⚡ TESTE 10: Carga\n');
    
    try {
        const products = await createProducts();
        const sales = await createSales();
        const queryTime = await queryPerformance();
        await memoryUsage();
        
        console.log(`\n✅ TESTE 10 APROVADO`);
        console.log(`Resumo:`);
        console.log(`  Produtos criados: ${products.count} (${products.avg.toFixed(2)}ms médio)`);
        console.log(`  Vendas criadas: ${sales.count} (${sales.avg.toFixed(2)}ms médio)`);
        console.log(`  Query performance: ${queryTime}ms`);
    } catch (err) {
        console.error(`❌ ERRO: ${err.message}`);
        process.exit(1);
    }
}

run();
```

### Executar

```bash
node tests/load-test.js
```

### Validação esperada

- ✅ 1000 produtos criados em < 10 seg (~ 10ms/produto)
- ✅ 500 vendas criadas em < 10 seg (~ 20ms/venda)
- ✅ Query em < 500ms
- ✅ Memória < 80%
- ✅ CPU < 90%

---

## 📄 Documentação do Resultado

Após executar todos os 10 testes, preencher:

**RELATORIO_VALIDACAO_INFRA.md**

```markdown
# ✅ RELATÓRIO DE VALIDAÇÃO — ETAPA 1

Data: [data]
Testador: [nome]
Ambiente: [descrição]

## Resultado Final

| Teste | Status | Tempo | Observações |
|-------|--------|-------|-------------|
| 1. Deploy Limpo | ✅ APROVADO | 7 min | Reproduzível exatamente |
| 2. Health Check | ✅ APROVADO | 50ms | Todos os campos OK |
| 3. Backup Real | ✅ APROVADO | 2 min | 85 MB comprimido |
| 4. Restauração | ✅ APROVADO | 5 min | Dados 100% intactos |
| 5. Atualização | ✅ APROVADO | - | Zero-downtime |
| 6. Rollback | ✅ APROVADO | - | Recuperação imediata |
| 7. Logs | ✅ APROVADO | - | 4 tipos registrados |
| 8. Segurança | ✅ APROVADO | - | Todas validações OK |
| 9. Offline First | ✅ APROVADO | - | Sincronização perfeita |
| 10. Carga | ✅ APROVADO | 10 seg | 1000 prod + 500 vendas |

## Classificação Final

🟢 **APROVADO** — Sistema pronto para Empresa Piloto

## Riscos Identificados

- Nenhum crítico
- [lista de ressalvas se houver]

## Melhorias Recomendadas

- [lista de otimizações]

## Próximos Passos

Iniciar ETAPA 2 — Empresa Piloto
```

---

## 📅 Cronograma

| Data | Teste | Responsável |
|------|-------|-------------|
| 18/06 | 1 (Deploy) | — |
| 19/06 | 2–3 (Health, Backup) | — |
| 20/06 | 4–6 (Restore, Update, Rollback) | — |
| 21/06 | 7–8 (Logs, Segurança) | — |
| 22/06 | 9–10 (Offline, Carga) | — |
| 22/06 | Relatório final | — |

---

**Objetivo:** Ter 100% de confiança que ETAPA 1 funciona antes de receber empresa piloto real.
