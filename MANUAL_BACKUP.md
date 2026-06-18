# 💾 MANUAL DE BACKUP — Ambiente Piloto SnapPay

**Versão:** 1.0  
**Data:** 18 de junho de 2026

---

## 🎯 Objetivo

Automatizar backups diários do banco `snappay_homolog` com retenção de 7 dias e possibilidade de restauração rápida.

---

## 1. Estratégia de Backup

| Aspecto | Especificação |
|---------|---------------|
| **Frequência** | Diária, às 22h (horário fora de pico) |
| **Retenção** | 7 backups diários + 4 backups semanais |
| **Localização** | `/backup/snappay_homolog/` |
| **Formato** | SQL comprimido (.sql.gz) |
| **Tamanho esperado** | ~10–50 MB (comprimido) |
| **Tempo de backup** | ~2 minutos |
| **Tempo de restauração** | ~5 minutos |

---

## 2. Preparar Ambiente de Backup

### 2.1 Criar diretório

```bash
sudo mkdir -p /backup/snappay_homolog/{daily,weekly,logs}
sudo chown ubuntu:ubuntu /backup/snappay_homolog -R
sudo chmod 750 /backup/snappay_homolog

echo "✅ Diretório de backup criado"
```

### 2.2 Criar arquivo `.pgpass` para autenticação sem senha

PostgreSQL precisa de credenciais para fazer backup. Criar arquivo `.pgpass`:

```bash
cat > ~/.pgpass <<'EOF'
localhost:5432:snappay_homolog:snappay_homolog_user:COLOQUE_A_SENHA_AQUI
EOF

# Proteger (PostgreSQL exige permissões 600)
chmod 600 ~/.pgpass

echo "✅ .pgpass configurado"
```

**Teste:**
```bash
pg_dump -h localhost -U snappay_homolog_user -d snappay_homolog --no-password -F p | head -20
```

---

## 3. Scripts de Backup

### 3.1 Criar script de backup diário

```bash
mkdir -p scripts
cat > scripts/backup-db.sh <<'EOFSCRIPT'
#!/bin/bash

# Variáveis
BACKUP_DIR="/backup/snappay_homolog/daily"
DB_NAME="snappay_homolog"
DB_USER="snappay_homolog_user"
DB_HOST="localhost"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
LOG_FILE="/backup/snappay_homolog/logs/backup_${DATE}.log"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Criar diretório de log se não existir
mkdir -p "$(dirname "$LOG_FILE")"

log "=== INICIANDO BACKUP ==="
log "Banco: $DB_NAME"
log "Arquivo: $BACKUP_FILE"

# Executar backup
if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-password -F p | gzip > "$BACKUP_FILE" 2>> "$LOG_FILE"; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup concluído com sucesso!"
    log "Tamanho: $SIZE"
    
    # Testar integridade
    if gunzip -t "$BACKUP_FILE" 2>> "$LOG_FILE"; then
        log "✅ Verificação de integridade: OK"
    else
        log "❌ ERRO: Arquivo corrompido!"
        exit 1
    fi
else
    log "❌ ERRO ao fazer backup!"
    exit 1
fi

# Limpar backups antigos (manter últimos 7 dias)
log "Limpando backups com mais de 7 dias..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete

log "=== BACKUP FINALIZADO ==="
exit 0
EOFSCRIPT

chmod +x scripts/backup-db.sh

echo "✅ Script de backup criado"
```

### 3.2 Teste o script manualmente

```bash
./scripts/backup-db.sh

# Verificar resultado
ls -lh /backup/snappay_homolog/daily/
tail -f /backup/snappay_homolog/logs/backup_*.log
```

---

## 4. Agendar Backup Automático com Cron

### 4.1 Adicionar ao crontab

```bash
# Editar crontab
crontab -e

# Adicionar linha (fazer backup diário às 22h)
0 22 * * * /var/www/snappay-homolog/scripts/backup-db.sh >> /backup/snappay_homolog/logs/cron.log 2>&1

# Verificar
crontab -l
```

### 4.2 Backup semanal (opcional)

Se quiser manter backup semanal separado:

```bash
cat > scripts/backup-db-weekly.sh <<'EOFSCRIPT'
#!/bin/bash

BACKUP_DIR="/backup/snappay_homolog/weekly"
DB_NAME="snappay_homolog"
DB_USER="snappay_homolog_user"
DB_HOST="localhost"
DATE=$(date +"%Y_W%U")  # Semana do ano
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-password -F p | gzip > "$BACKUP_FILE"

# Manter 4 backups semanais
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +28 -delete

echo "✅ Backup semanal: $BACKUP_FILE"
EOFSCRIPT

chmod +x scripts/backup-db-weekly.sh

# Agendar para domingo 22h
# 0 22 * * 0 /var/www/snappay-homolog/scripts/backup-db-weekly.sh
```

---

## 5. Monitoramento de Backups

### 5.1 Verificar se backup foi feito hoje

```bash
# Script de verificação
cat > scripts/check-backup.sh <<'EOFSCRIPT'
#!/bin/bash

BACKUP_DIR="/backup/snappay_homolog/daily"
TODAY=$(date +"%Y-%m-%d")
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*${TODAY}*.sql.gz" | wc -l)

if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "✅ Backup de hoje: ENCONTRADO"
    ls -lh "$BACKUP_DIR"/*${TODAY}*.sql.gz
else
    echo "❌ AVISO: Nenhum backup encontrado para hoje!"
    exit 1
fi
EOFSCRIPT

chmod +x scripts/check-backup.sh

# Testar
./scripts/check-backup.sh
```

### 5.2 Adicionar alerta de backup à rotina diária

```bash
# No crontab, executar check após backup
0 23 * * * /var/www/snappay-homolog/scripts/check-backup.sh >> /backup/snappay_homolog/logs/check.log 2>&1
```

---

## 6. Tamanho e Espaço em Disco

### 6.1 Estimar espaço necessário

```bash
# Banco atual
psql -h localhost -U snappay_homolog_user -d snappay_homolog -c "
SELECT 
    pg_size_pretty(pg_database_size('snappay_homolog')) as tamanho_banco;
"

# Estimativa de backups
# Sem compressão: ~500 MB por backup
# Com compressão (gzip): ~50–100 MB por backup
# 7 dias × 100 MB = 700 MB
# 4 semanas × 100 MB = 400 MB
# Total esperado: ~1 GB

# Verificar espaço livre
df -h /backup
```

### 6.2 Alerta de espaço em disco

```bash
cat > scripts/check-disk.sh <<'EOFSCRIPT'
#!/bin/bash

USAGE=$(df /backup | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$USAGE" -gt 80 ]; then
    echo "❌ ALERTA: Disco em /backup com $USAGE% de uso!"
    echo "Limpar backups antigos ou expandir disco."
    exit 1
elif [ "$USAGE" -gt 60 ]; then
    echo "⚠️  AVISO: Disco em /backup com $USAGE% de uso"
else
    echo "✅ Espaço em disco: OK ($USAGE%)"
fi
EOFSCRIPT

chmod +x scripts/check-disk.sh

# Agendar verificação semanal
# 0 9 * * 1 /var/www/snappay-homolog/scripts/check-disk.sh
```

---

## 7. Replicação para Servidor Remoto (Opcional)

Se quiser backup em servidor remoto (segurança extra):

### 7.1 Copiar backup para servidor remoto

```bash
cat > scripts/backup-to-remote.sh <<'EOFSCRIPT'
#!/bin/bash

LOCAL_BACKUP="/backup/snappay_homolog/daily"
REMOTE_USER="backup_user"
REMOTE_HOST="backup-server.com"
REMOTE_PATH="/backups/snappay_homolog"

# Sincronizar com rsync
rsync -avz --delete "$LOCAL_BACKUP/" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" \
    >> /backup/snappay_homolog/logs/rsync.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Backup replicado para servidor remoto"
else
    echo "❌ Erro ao replicar backup"
    exit 1
fi
EOFSCRIPT

chmod +x scripts/backup-to-remote.sh

# Adicionar ao cron após backup local
# 30 22 * * * /var/www/snappay-homolog/scripts/backup-to-remote.sh
```

---

## 8. Teste de Restauração

### 8.1 Simular falha (em ambiente de teste)

```bash
# ⚠️ CUIDADO: Isso vai sobrescrever o banco!
# Faça isso APENAS em ambiente de teste.

# 1. Verificar backups disponíveis
ls -lh /backup/snappay_homolog/daily/

# 2. Listar bancos (para verificar antes de restaurar)
psql -h localhost -U snappay_homolog_user -l

# 3. RESTAURAÇÃO (ver MANUAL_RESTAURACAO.md para passos detalhados)
```

---

## 9. Documentação de Backups

### 9.1 Log de backups

O arquivo `/backup/snappay_homolog/logs/backup_*.log` contém:

```
[2026-06-18 22:00:01] === INICIANDO BACKUP ===
[2026-06-18 22:00:01] Banco: snappay_homolog
[2026-06-18 22:00:01] Arquivo: /backup/snappay_homolog/daily/snappay_homolog_2026-06-18_22-00-01.sql.gz
[2026-06-18 22:02:15] ✅ Backup concluído com sucesso!
[2026-06-18 22:02:15] Tamanho: 85M
[2026-06-18 22:02:17] ✅ Verificação de integridade: OK
[2026-06-18 22:02:17] === BACKUP FINALIZADO ===
```

### 9.2 Checklist semanal

```bash
cat > CHECKLIST_BACKUP.md <<'EOF'
# ✅ Checklist de Backup Semanal

## Segunda-feira
- [ ] Verificar se backup de sexta foi feito
- [ ] Testar restauração em BD de teste
- [ ] Revisar logs de erro em /backup/snappay_homolog/logs/

## Antes de implantar em produção
- [ ] Treinar operador em restauração
- [ ] Documentar credenciais de acesso (seguro)
- [ ] Verificar espaço em disco (/backup)
- [ ] Testar replicação remota (se configurada)

## Mensal
- [ ] Validar retenção de 7 dias está funcionando
- [ ] Revisar tamanho dos backups (crescimento anormal?)
- [ ] Confirmar que cronJob está rodando
EOF
```

---

## ✅ Resumo

| Item | Status |
|------|--------|
| Script de backup criado | ✅ |
| Cron configurado (22h diário) | ✅ |
| .pgpass configurado | ✅ |
| Retenção 7 dias | ✅ |
| Verificação de integridade | ✅ |
| Monitoramento de espaço | ✅ |
| Logs centralizados | ✅ |
| Documentação completa | ✅ |

**Próximo:** Ler `MANUAL_RESTAURACAO.md` para aprender a restaurar do backup.
