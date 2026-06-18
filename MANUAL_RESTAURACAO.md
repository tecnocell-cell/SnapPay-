# 🔄 MANUAL DE RESTAURAÇÃO — Ambiente Piloto SnapPay

**Versão:** 1.0  
**Data:** 18 de junho de 2026  
**Tempo estimado:** 5–10 minutos

---

## 🎯 Objetivo

Restaurar banco de dados `snappay_homolog` a partir de um backup quando necessário (falha, corrupção, erro operacional).

**Cenários:**
- Banco corrompido
- Erro operacional que afetou dados
- Teste de recuperação
- Manutenção preventiva

---

## ⚠️ PRÉ-REQUISITOS

Antes de restaurar, responda:

- [ ] Você tem um backup válido? (teste `gunzip -t arquivo.sql.gz`)
- [ ] Você sabe qual data/hora restaurar?
- [ ] O ambiente de produção pode ficar offline por 10 minutos?
- [ ] Você documentou o motivo da restauração?

**Se respondeu "não" a qualquer pergunta, contate o administrador antes de prosseguir.**

---

## 1. Verificar Backups Disponíveis

### 1.1 Listar backups

```bash
# Ver todos os backups
ls -lh /backup/snappay_homolog/daily/

# Exemplo de saída:
# -rw-r--r-- 1 ubuntu ubuntu 85M Jun 18 22:00 snappay_homolog_2026-06-18_22-00-00.sql.gz
# -rw-r--r-- 1 ubuntu ubuntu 84M Jun 17 22:00 snappay_homolog_2026-06-17_22-00-00.sql.gz
# -rw-r--r-- 1 ubuntu ubuntu 83M Jun 16 22:00 snappay_homolog_2026-06-16_22-00-00.sql.gz
```

### 1.2 Testar integridade do arquivo

```bash
# Testar se o arquivo está corrompido
gunzip -t /backup/snappay_homolog/daily/snappay_homolog_2026-06-18_22-00-00.sql.gz

# Se OK, não imprime nada
# Se erro, imprime mensagem de erro

# Verificar tamanho
du -h /backup/snappay_homolog/daily/snappay_homolog_2026-06-18_22-00-00.sql.gz
```

---

## 2. Parar a Aplicação

### 2.1 Parar PM2 (backend)

```bash
# Parar sem matar o processo (permite reiniciar depois)
pm2 stop snappay-homolog

# Verificar status
pm2 status
# Deve mostrar "stopped"
```

### 2.2 Desabilitar Nginx (frontend)

```bash
# Desabilitar site
sudo systemctl stop nginx

# Ou deixar Nginx rodando com página de manutenção (opcional)
# Criar arquivo /var/www/snappay-homolog-static/maintenance.html
```

**Resultado esperado:**
```
Acessar https://homolog.seudominio.com.br → erro (site offline)
```

---

## 3. Criar Backup de Segurança (Antes de restaurar!)

### 3.1 Fazer backup de segurança do banco atual

```bash
# Criar backup do estado ANTES de restaurar
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
SAFETY_BACKUP="/backup/snappay_homolog/pre-restore_${TIMESTAMP}.sql.gz"

pg_dump -h localhost -U snappay_homolog_user -d snappay_homolog --no-password -F p | \
    gzip > "$SAFETY_BACKUP"

echo "✅ Backup de segurança criado: $SAFETY_BACKUP"

# Verificar
ls -lh "$SAFETY_BACKUP"
```

**Este arquivo será necessário se algo der errado!**

---

## 4. Restaurar do Backup

### 4.1 Escolher arquivo de backup

```bash
# Variável para o arquivo que vai restaurar
BACKUP_FILE="/backup/snappay_homolog/daily/snappay_homolog_2026-06-18_22-00-00.sql.gz"

# Verificar se existe
ls -lh "$BACKUP_FILE"
```

### 4.2 Dropar banco antigo (⚠️ cuidado!)

```bash
# Conectar ao PostgreSQL como superusuário
sudo -u postgres psql <<EOF

-- Ver bancos
\l

-- Desconectar usuários
SELECT pid, usename, application_name 
FROM pg_stat_activity 
WHERE datname = 'snappay_homolog';

-- Terminar conexões
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'snappay_homolog' AND pid != pg_backend_pid();

-- Dropar banco
DROP DATABASE snappay_homolog;

-- Criar banco vazio
CREATE DATABASE snappay_homolog OWNER snappay_homolog_user;

-- Confirmar
\l

EOF

echo "✅ Banco snappay_homolog recriado (vazio)"
```

### 4.3 Restaurar dados do backup

```bash
# Descomprimir e restaurar em uma operação
BACKUP_FILE="/backup/snappay_homolog/daily/snappay_homolog_2026-06-18_22-00-00.sql.gz"

echo "Restaurando banco a partir de: $BACKUP_FILE"

# Mostrar progresso
gunzip -c "$BACKUP_FILE" | \
    psql -h localhost -U snappay_homolog_user -d snappay_homolog --no-password

# Verificar resultado
if [ $? -eq 0 ]; then
    echo "✅ Restauração concluída com sucesso!"
else
    echo "❌ ERRO ao restaurar! Verifique logs acima."
    exit 1
fi
```

### 4.4 Verificar integridade dos dados

```bash
# Conectar e verificar
psql -h localhost -U snappay_homolog_user -d snappay_homolog <<EOF

-- Contar tabelas
SELECT COUNT(*) as total_tabelas FROM information_schema.tables 
WHERE table_schema = 'public';

-- Contar registros principais
SELECT 
    (SELECT COUNT(*) FROM usuarios) as usuarios,
    (SELECT COUNT(*) FROM empresas) as empresas,
    (SELECT COUNT(*) FROM produtos) as produtos,
    (SELECT COUNT(*) FROM vendas) as vendas,
    (SELECT COUNT(*) FROM compras) as compras;

-- Verificar última sincronização
SELECT MAX(data_criacao) as ultima_operacao FROM vendas;

EOF
```

---

## 5. Reinicar Aplicação

### 5.1 Reiniciar backend

```bash
# Remover processo antigo
pm2 delete snappay-homolog

# Reiniciar
pm2 start ecosystem.config.js

# Verificar
pm2 status
pm2 logs snappay-homolog --lines 20
```

### 5.2 Reiniciar Nginx

```bash
# Testar configuração
sudo nginx -t

# Reiniciar
sudo systemctl start nginx

# Verificar
sudo systemctl status nginx
```

### 5.3 Testar acesso

```bash
# Health check
curl https://homolog.seudominio.com.br/api/health

# Deve retornar:
# {"status":"ok","database":"connected"}

# Frontend
curl https://homolog.seudominio.com.br | head -20
```

---

## 6. Validação Pós-Restauração

### 6.1 Testar fluxos críticos

No navegador, acessar https://homolog.seudominio.com.br e testar:

- [ ] Login com usuário admin
- [ ] Ver dashboard (produtos, vendas, compras)
- [ ] Criar nova venda (para validar escrita)
- [ ] Fazer checkout
- [ ] Ver relatório de vendas

### 6.2 Verificar logs

```bash
# Verificar se há erros
tail -f /var/log/snappay/application/*.log

# Buscar erros
grep -i "error\|exception" /var/log/snappay/application/*.log | tail -20
```

### 6.3 Monitorar performance

```bash
# CPU e memória
top -b -n 1 | head -20

# Conexões BD
psql -h localhost -U snappay_homolog_user -d snappay_homolog -c "
SELECT COUNT(*) as conexoes_ativas FROM pg_stat_activity;
"

# Tamanho do banco
psql -h localhost -U snappay_homolog_user -d snappay_homolog -c "
SELECT pg_size_pretty(pg_database_size('snappay_homolog')) as tamanho;
"
```

---

## 7. Se Algo Der Errado

### 7.1 Reverter para backup de segurança

Se a restauração falhou e você criou um backup de segurança (passo 3.1):

```bash
# Encontrar o arquivo de segurança mais recente
ls -lh /backup/snappay_homolog/pre-restore_*.sql.gz

# Repetir passos 4.2–6.3 usando este arquivo

SAFETY_BACKUP=$(ls -t /backup/snappay_homolog/pre-restore_*.sql.gz | head -1)
echo "Revertendo para: $SAFETY_BACKUP"

# ... (repetir passo 4.2, 4.3, 5, 6)
```

### 7.2 Contatar administrador

Se ainda não funcionar:

```bash
# Coletar informações de diagnóstico
cat > /tmp/diagnostico.log <<EOF
Data: $(date)
Backup restaurado: $BACKUP_FILE
Erro: $(tail -100 /var/log/snappay/application/*.log | grep -i error)
Status PM2: $(pm2 status)
Status Nginx: $(sudo systemctl status nginx)
Espaço disco: $(df -h /)
EOF

# Enviar para administrador
echo "Envie /tmp/diagnostico.log para: seu-admin@example.com"
```

---

## 8. Documentar a Restauração

### 8.1 Criar registro

```bash
cat >> /backup/snappay_homolog/logs/restauracoes.log <<EOF
[$(date)] Restauração realizada
Backup: $BACKUP_FILE
Motivo: [descreva o motivo aqui]
Resultado: SUCESSO / FALHA
Tempo: [quanto tempo levou]
Validado por: [seu nome]
EOF
```

### 8.2 Comunicar às partes interessadas

```
Assunto: Restauração do banco — Ambiente Piloto SnapPay

Informamos que o banco de dados foi restaurado com sucesso.

Detalhes:
- Data: [data]
- Backup restaurado: [nome do arquivo]
- Motivo: [motivo da restauração]
- Tempo de indisponibilidade: [tempo]
- Status: ✅ Tudo operacional

O sistema está pronto para uso.
```

---

## ✅ Checklist de Restauração

- [ ] Backup testado e íntegro
- [ ] Backend parado (PM2)
- [ ] Frontend parado (Nginx)
- [ ] Backup de segurança criado
- [ ] Banco antigo droppado
- [ ] Dados restaurados
- [ ] Banco validado
- [ ] Backend reiniciado
- [ ] Frontend reiniciado
- [ ] Testes de acesso OK
- [ ] Logs verificados
- [ ] Restauração documentada
- [ ] Partes interessadas comunicadas

---

## 🚨 Emergência — 1 Minuto de Downtime

Se precisa restaurar e tem pouco tempo:

```bash
#!/bin/bash
set -e

# 1. Parar tudo (5 seg)
pm2 stop snappay-homolog && sudo systemctl stop nginx

# 2. Backup de segurança (10 seg)
pg_dump -h localhost -U snappay_homolog_user -d snappay_homolog --no-password | \
    gzip > /backup/pre-restore-$(date +%s).sql.gz

# 3. Restaurar (120 seg)
gunzip -c /backup/snappay_homolog/daily/snappay_homolog_YYYY-MM-DD_HH-MM-SS.sql.gz | \
    psql -h localhost -U snappay_homolog_user -d snappay_homolog --no-password

# 4. Reiniciar (10 seg)
pm2 start ecosystem.config.js && sudo systemctl start nginx

echo "✅ Restauração rápida concluída!"
```

---

**Próximo:** Voltar para ETAPA 1 checklist e verificar se tudo está funcionando.
