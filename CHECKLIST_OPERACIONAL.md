# ✅ CHECKLIST OPERACIONAL — Ambiente Piloto SnapPay

**Versão:** 1.0  
**Data:** 18 de junho de 2026

---

## 📅 DIÁRIO (Início do expediente)

Execute **entre 07h–08h** antes de abrir a loja:

```bash
#!/bin/bash

echo "🔍 Verificações matutinas do SnapPay Homolog"

# 1. Sistema operacional
echo "1. Status do servidor:"
uptime
free -h
df -h /

# 2. Serviços críticos
echo -e "\n2. PM2 (Backend):"
pm2 status | grep snappay-homolog

echo -e "\n3. Nginx (Frontend):"
sudo systemctl status nginx | grep Active

echo -e "\n4. PostgreSQL (Banco):"
sudo systemctl status postgresql | grep Active

# 5. Conectividade
echo -e "\n5. Health check:"
curl -s https://homolog.seudominio.com.br/api/health | jq .

# 6. Backup de ontem
echo -e "\n6. Backup de ontem:"
TODAY=$(date +"%Y-%m-%d")
YESTERDAY=$(date -d "1 day ago" +"%Y-%m-%d")
if [ -f "/backup/snappay_homolog/daily/snappay_homolog_${YESTERDAY}"* ]; then
    echo "✅ Backup encontrado"
    ls -lh /backup/snappay_homolog/daily/snappay_homolog_${YESTERDAY}*
else
    echo "❌ ALERTA: Backup não encontrado!"
fi

# 7. Espaço em disco
echo -e "\n7. Espaço em disco:"
DISK_USAGE=$(df /backup | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "❌ CRÍTICO: Disco com $DISK_USAGE% de uso!"
elif [ "$DISK_USAGE" -gt 60 ]; then
    echo "⚠️  AVISO: Disco com $DISK_USAGE% de uso"
else
    echo "✅ Espaço OK ($DISK_USAGE%)"
fi

# 8. Logs de erro
echo -e "\n8. Erros nas últimas 24h:"
ERRORS=$(grep -i "error\|exception" /var/log/snappay/application/*.log | wc -l)
if [ "$ERRORS" -gt 0 ]; then
    echo "⚠️  $ERRORS erros encontrados"
    grep -i "error\|exception" /var/log/snappay/application/*.log | tail -5
else
    echo "✅ Nenhum erro encontrado"
fi

echo -e "\n✅ Verificações concluídas!"
```

**Salvar como:** `scripts/check-morning.sh`

```bash
chmod +x scripts/check-morning.sh
./scripts/check-morning.sh
```

### Se algo estiver RED:

```bash
# Verificar e reiniciar
pm2 restart snappay-homolog
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Aguardar 30 segundos
sleep 30

# Verificar novamente
./scripts/check-morning.sh
```

---

## 🕐 POR HORA (Monitoramento contínuo)

Durante expediente, manter olho em:

| Horário | Verificação | Comando | Limite |
|---------|-------------|---------|--------|
| 08h | Carga do servidor | `uptime` | < 4.0 |
| 11h | Espaço em disco | `df -h /` | < 80% |
| 12h | Conexões BD | `psql ... SELECT COUNT(*) ...` | < 50 |
| 14h | Tempo resposta | `time curl /api/health` | < 500ms |
| 16h | Memória disponível | `free -h` | > 1 GB |
| 17h | Logs de erro | `grep error /var/log/...` | 0 se possível |

### Dashboard rápido

```bash
# Ver tudo em um só lugar
watch -n 10 'echo "=== UPTIME ===" && uptime && echo -e "\n=== DISCO ===" && df -h / && echo -e "\n=== MEMORIA ===" && free -h && echo -e "\n=== PROCESSOS ===" && ps aux | grep snappay | head -3'
```

---

## 📋 SEMANAL (Toda segunda-feira)

Execute **primeira coisa segunda-feira:**

- [ ] **Backup de sexta-feira foi feito?**
  ```bash
  ls -lh /backup/snappay_homolog/daily/ | grep "$(date -d 'friday' +%Y-%m-%d)"
  ```

- [ ] **Testar restauração em BD de teste**
  ```bash
  # Criar BD de teste
  CREATE DATABASE snappay_test;
  
  # Restaurar último backup lá
  gunzip -c /backup/.../snappay_homolog_YYYY-MM-DD.sql.gz | \
      psql -d snappay_test
  
  # Validar
  psql -d snappay_test -c "SELECT COUNT(*) FROM usuarios;"
  
  # Dropar teste
  DROP DATABASE snappay_test;
  ```

- [ ] **Revisar logs de erro**
  ```bash
  cat /backup/snappay_homolog/logs/backup_*.log
  grep -i "error\|critical" /var/log/snappay/application/*.log
  ```

- [ ] **Validar cron de backup**
  ```bash
  crontab -l
  tail -f /var/log/syslog | grep cron
  ```

- [ ] **Checar crescimento do banco**
  ```bash
  psql -U snappay_homolog_user -d snappay_homolog -c \
      "SELECT pg_size_pretty(pg_database_size('snappay_homolog'));"
  ```

---

## 🔧 MENSAL (Primeira segunda de cada mês)

Execute por volta de 10h:

- [ ] **Testar restauração completa em servidor de teste**
  - Restaurar último backup em servidor de teste
  - Simular falha e recover
  - Registrar tempo total

- [ ] **Revisar crescimento**
  - Verificar se banco cresceu mais que 50% no mês
  - Otimizar índices se necessário
  - Arquivar dados antigos

- [ ] **Validar logs centralizados**
  - Verificar se all os 4 tipos (app, error, sync, fiscal) estão sendo registrados
  - Testar rotação de logs
  - Limpar logs muito antigos

- [ ] **Atualizar documentação**
  - Revisar manuais se algo mudou
  - Atualizar IPs/portas/domínios se necessário
  - Adicionar novas procedures

- [ ] **Reunião de segurança**
  - Revisar acessos SSH (quem tem chave?)
  - Validar firewall rules
  - Checar se .env está protegido
  - Renovar certificado SSL (Let's Encrypt automático, mas verificar)

---

## 🆘 RESOLUÇÃO RÁPIDA

### Problema: Backend não responde

```bash
# 1. Verificar status
pm2 status

# 2. Ver logs
pm2 logs snappay-homolog --lines 50

# 3. Reiniciar
pm2 restart snappay-homolog

# 4. Verificar novamente
curl https://homolog.seudominio.com.br/api/health
```

### Problema: Disco cheio

```bash
# 1. Ver onde está o problema
du -sh /var/log/snappay/*

# 2. Limpar logs antigos
find /var/log/snappay -name "*.log" -mtime +30 -delete

# 3. Limpar backups antigos
find /backup/snappay_homolog/daily -mtime +7 -delete
```

### Problema: Banco lento

```bash
# 1. Ver tamanho
psql -U snappay_homolog_user -d snappay_homolog -c \
    "SELECT pg_size_pretty(pg_database_size('snappay_homolog'));"

# 2. Ver conexões
psql -U snappay_homolog_user -d snappay_homolog -c \
    "SELECT COUNT(*) FROM pg_stat_activity;"

# 3. Reconectar backend (vai desconectar conexões antigas)
pm2 restart snappay-homolog
```

### Problema: Site offline

```bash
# 1. Verificar Nginx
sudo systemctl status nginx

# 2. Verificar DNS
nslookup homolog.seudominio.com.br

# 3. Verificar SSL
openssl s_client -connect homolog.seudominio.com.br:443

# 4. Reiniciar tudo
pm2 restart snappay-homolog
sudo systemctl restart nginx
```

---

## 📞 CONTATOS

| Responsabilidade | Contato | Horário |
|-----------------|---------|---------|
| **Problemas técnicos** | seu-admin@example.com | 24/7 |
| **Fiscal/emissão NFC-e** | fiscal@example.com | 08–18h |
| **Empresa piloto** | piloto@example.com | 08–18h |
| **Infraestrutura/VPS** | ops@example.com | 24/7 |

---

## 📊 Formulário de Incidente

Quando algo der errado, preencha:

```
Data/Hora: [data e hora exata]
Problema: [descreva o que viu]
Causa suspeita: [o que você acha que causou]
Impacto: [operação parou? lentidão? erro?]
Ações tomadas: [o que você fez]
Resultado: [funcionou? precisa escalar?]
Próximos passos: [o que fazer agora]
```

---

## ✅ Resumo

Execute:
- **Diário:** `./scripts/check-morning.sh`
- **Semanal:** Checklist acima
- **Mensal:** Checklist acima
- **Se problema:** Resolução rápida acima

**Objetivo:** Sistema robusto e operador confiante.
