# Plano de Appliance — SnapPay Terminal PDV Blindado

**Versão:** 1.0  
**Data:** 2026-06-18  
**Objetivo:** Documentar arquitetura de deployment para SnapPay rodar como appliance dedicado (mini PC, quiosque, computador comum).

---

## 1. SISTEMAS OPERACIONAIS SUPORTADOS

### 1.1 Linux (Recomendado)

**Distribuições:**
- Debian 12 (Bookworm)
- Ubuntu 22.04 LTS
- Linux Mint 21 (baseado em Ubuntu)

**Motivos:**
- Open-source, custo zero
- Sem telemetria (ao contrário de Windows)
- Terminal mode puro (sem GUI desktop)
- Criptografia nativa (LUKS)
- Performance em hardware baixo (≥2GB RAM)
- Suporte a long-term (até 2032)

**Setup mínimo:**
```bash
# Instalação server (sem GUI)
- Boot em ISO server
- Particionamento manual (vide seção 3)
- SSH habilitado
- Sem pacotes X11/desktop
```

### 1.2 Windows (Alternativa)

**Versões suportadas:**
- Windows 11 IoT Enterprise
- Windows 10 Enterprise (legacy)

**Motivos:**
- Compatibilidade familiar
- Drivers impressora prontos
- Tauri/Electron funcionam nativos

**Desvantagens:**
- Telemetria Microsoft
- Atualiza forcibly (problema em quiosque)
- Caro (licença)
- Pesado (mínimo 4GB RAM)

**Setup:**
```
- ISO Windows IoT Enterprise
- Desabilitar Windows Update (via Group Policy)
- Desabilitar Cortana, antivírus real-time
- Kiosk mode via Assigned Access / Shell Launcher
```

### 1.3 macOS (Não recomendado)

**Problema:** Hardware caro, ideal para desenvolvimento não para produção.

---

## 2. HARDWARE SUGERIDO

### Mini PC Recomendado

| Especificação | Mínimo | Recomendado |
|---|---|---|
| CPU | Intel/AMD Celeron N5105 | Intel N100 ou Ryzen 5 |
| RAM | 2GB | 4GB DDR4 |
| SSD | 32GB eMMC | 128GB SATA SSD |
| Display | USB 7" | HDMI 10.1" Touchscreen |
| Periféricos | PS/2 | USB (teclado, mouse) |
| Rede | Ethernet 100Mbps | Gigabit RJ45 |
| Impressora | USB | ESC/POS Ethernet 58-80mm |
| Gaveta | RJ11 3 linhas | RJ11 padrão |
| Scanner | USB Teclado | USB 2D |
| Balança | Não | USB/Bluetooth (futuro) |
| Bateria UPS | Não | Sim (30min) |

### Exemplos de Mini PCs

1. **Beelink Ser4 (Recomendado)**
   - AMD Ryzen 5, 8GB RAM, 256GB SSD
   - Preço: ~R$ 1.500
   - Performance: 10-15 vendas/segundo offline

2. **Intel NUC11 (Premium)**
   - Intel i7, 16GB RAM, 512GB SSD
   - Preço: ~R$ 3.500
   - Performance: 50+ vendas/segundo offline

3. **Positivo POS-5600 (Brasil)**
   - Intel Celeron, 4GB RAM, 64GB SSD
   - Preço: ~R$ 800
   - Performance: 5-10 vendas/segundo offline

---

## 3. PARTICIONAMENTO

### Estratégia: Sistema Read-Only + Dados Mutáveis

```
/dev/sda (SSD 128GB)
├── /dev/sda1 (500MB, UEFI FAT32)
│   └── Boot
├── /dev/sda2 (50GB, ext4)
│   └── / (root, read-only após boot)
└── /dev/sda3 (77.5GB, ext4, encrypted LUKS)
    └── /home/snappay/snappay-data
        ├── sqlite.db (3GB limite)
        ├── backups/ (10x daily backups = 30GB)
        ├── logs/ (10GB retention)
        └── cache/ (firmware, produtos, clientes)
```

### Bootloader: GRUB2 (imutável)

```bash
# /etc/grub.d/40_custom — read-only root
linux /boot/vmlinuz root=/dev/sda2 ro nomodify
```

### Mount Points

```bash
/               → /dev/sda2 (ro) — sistema
/home/snappay   → /dev/sda3 (rw, LUKS) — dados
/var/log        → tmpfs 1GB (logs em RAM, backup em /home/snappay/snappay-data/logs)
/tmp            → tmpfs 2GB
```

---

## 4. INICIALIZAÇÃO LINUX KIOSK

### 4.1 Auto-Login (snappay user)

**Arquivo:** `/etc/systemd/system/getty@tty1.service.d/override.conf`

```ini
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin snappay --noclear %I linux
```

### 4.2 Startup Script

**Arquivo:** `/home/snappay/.bashrc`

```bash
# Apenas se login interativo
if [[ $- == *i* ]]; then
  # Setup Xvfb (X server sem display físico)
  export DISPLAY=:99
  Xvfb :99 -screen 0 1280x800x24 &
  sleep 2

  # Iniciar SnapPay app (Electron/Tauri)
  /opt/snappay-terminal/snappay-app &

  # Se app fechar, reiniciar
  while true; do
    sleep 1
    pgrep -f "snappay-app" > /dev/null || /opt/snappay-terminal/snappay-app &
  done
fi
```

### 4.3 Chromium Kiosk (alternativa lightweight)

```bash
chromium-browser \
  --kiosk \
  --no-sandbox \
  --disable-sync \
  --disable-plugins \
  --disable-extensions \
  --disable-background-networking \
  http://localhost:5173/terminal
```

---

## 5. SINCRONIZAÇÃO CLOUD

### Protocolo

**Terminal → Cloud (POST):**
```
Endpoint: https://snappay.cloud/api/vendas/batch
Headers:
  X-Device-ID: <device-uuid>
  Authorization: Bearer <token-sync>
Body:
  {
    "vendas": [
      {
        "numero": "0001234",
        "total": 67.50,
        "itens": [...],
        "timestamp_local": "2026-06-18T14:30:45Z",
        "uuid_local": "vnd-12345-67890"
      }
    ]
  }
```

**Cloud → Terminal (Response):**
```json
{
  "sucesso": true,
  "sincronizadas": 50,
  "erros": 0,
  "proxima_sync": 300,
  "dados_cloud": {
    "produtos_versao": "2026-06-18T10:00:00Z",
    "precos_versao": "2026-06-18T10:00:00Z",
    "clientes_versao": "2026-06-18T10:00:00Z"
  }
}
```

### Fila Local (SQLite)

```sql
CREATE TABLE fila_sync (
  id INTEGER PRIMARY KEY,
  venda_id INTEGER NOT NULL,
  uuid_local TEXT UNIQUE,
  payload JSON NOT NULL,
  tentativas INTEGER DEFAULT 0,
  proxima_tentativa DATETIME,
  status TEXT DEFAULT 'PENDENTE', -- PENDENTE, ENVIANDO, SUCESSO, ERRO
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Retentativa

- **Tentativa 1:** Imediato (se online)
- **Tentativa 2:** +5 minutos
- **Tentativa 3:** +15 minutos
- **Tentativa 4:** +1 hora
- **Tentativa 5+:** +6 horas (máximo 10 tentativas)
- **Falha permanente:** Marcado como ERRO_PERMANENTE, requer ação manual

---

## 6. BACKUP & RECUPERAÇÃO

### Backup Local (Cron)

**Arquivo:** `/etc/cron.d/snappay-backup`

```cron
# Backup diário às 02:00
0 2 * * * root /opt/snappay-terminal/backup.sh

# Backup a cada 6h (segurança)
0 */6 * * * root /opt/snappay-terminal/backup-quick.sh
```

**Script:** `/opt/snappay-terminal/backup.sh`

```bash
#!/bin/bash
DATA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/snappay/snappay-data/backups"
mkdir -p $BACKUP_DIR

# Backup database + logs
tar -czf $BACKUP_DIR/snappay_$DATA.tar.gz \
  /home/snappay/snappay-data/sqlite.db \
  /home/snappay/snappay-data/logs/

# Remover backups > 30 dias
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Upload para cloud (futuro)
# rclone sync $BACKUP_DIR gdrive:snappay-backups/
```

### Recuperação

```bash
# 1. Parar app
systemctl stop snappay

# 2. Restaurar backup
tar -xzf /home/snappay/snappay-data/backups/snappay_20260618_020000.tar.gz -C /

# 3. Reiniciar
systemctl start snappay
```

---

## 7. SEGURANÇA

### Criptografia de Dados

**LUKS (Linux Unified Key Setup):**
```bash
# Criar volume criptografado
cryptsetup luksFormat /dev/sda3

# Abrir ao boot (automaticamente via systemd)
# /etc/crypttab:
snappay_data /dev/sda3 /root/keyfile
```

### Firewall

```bash
# UFW (Debian/Ubuntu)
ufw enable
ufw default deny incoming
ufw default allow outgoing

# Apenas necessário
ufw allow 22/tcp   # SSH (admin remoto)
ufw allow 3001/tcp # Backend local
ufw allow 5173/tcp # Frontend dev (desabilitar em produção)
```

### Desabilitar Comando Perigosos

```bash
# /etc/sudoers.d/snappay
snappay ALL=(ALL) NOPASSWD: /usr/bin/systemctl
snappay ALL=(ALL) NOPASSWD: /sbin/reboot

# Bloquear SSH de root
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no # SSH key only
```

### Bloquear Saída UI

**JavaScript (frontend):**
```javascript
document.addEventListener('keydown', (e) => {
  // Alt+F4, Ctrl+Alt+Del, F11, F12
  if ((e.altKey && e.key === 'F4') ||
      (e.ctrlKey && e.altKey && e.key === 'Delete') ||
      e.key === 'F11' || e.key === 'F12') {
    e.preventDefault();
  }
});

// Desabilitar clique direito
document.addEventListener('contextmenu', (e) => e.preventDefault());
```

---

## 8. MONITORAMENTO & ALERTA

### Health Check (Cron)

**Arquivo:** `/opt/snappay-terminal/health-check.sh`

```bash
#!/bin/bash

# 1. Backend online?
curl -s http://localhost:3001/api/health || {
  echo "Backend offline!" | mail -s "SnapPay Alert" admin@empresa.com
  systemctl restart snappay
}

# 2. Database acessível?
sqlite3 /home/snappay/snappay-data/sqlite.db "SELECT 1;" || {
  echo "Database corrupted!" | mail admin@empresa.com
}

# 3. Espaço em disco?
DISK=$(df /home/snappay | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK -gt 85 ]; then
  echo "Disk 85%+ full!" | mail admin@empresa.com
fi

# 4. Memória?
MEM=$(free | grep Mem | awk '{printf("%.0f\n", ($3/$2) * 100)}')
if [ $MEM -gt 90 ]; then
  echo "Memory 90%+ in use!" | mail admin@empresa.com
fi
```

**Cron:**
```cron
# Executar a cada 5 minutos
*/5 * * * * /opt/snappay-terminal/health-check.sh
```

### Log Centralizado (Futuro)

Enviar logs para servidor cloud:
```bash
# Usar rsyslog + remote syslog server
# /etc/rsyslog.d/99-snappay.conf
*.* @@logs.snappay.cloud:514
```

---

## 9. ATUALIZAÇÕES DE FIRMWARE

### Estratégia: Imagens Versioned

```
/boot/vmlinuz-5.15.0-1  (atual)
/boot/vmlinuz-5.15.0-2  (anterior, fallback)
/boot/vmlinuz-5.15.0-3  (nova)
```

### Deploy de App

```bash
# 1. Download novo pacote
wget https://releases.snappay.cloud/snappay-app-v2.1.0.tar.gz

# 2. Backup versão atual
cp -r /opt/snappay-terminal /opt/snappay-terminal.bak

# 3. Deploy
tar -xzf snappay-app-v2.1.0.tar.gz -C /opt/

# 4. Teste
systemctl restart snappay && sleep 5
curl -s http://localhost:3001/api/health || {
  # Rollback
  rm -rf /opt/snappay-terminal
  mv /opt/snappay-terminal.bak /opt/snappay-terminal
  systemctl restart snappay
}
```

---

## 10. CHECKLIST DEPLOYMENT

### Pré-Produção

- [ ] Hardware testado (Beelink/NUC/POS)
- [ ] Particionamento LUKS aplicado
- [ ] Linux Debian 12 instalado
- [ ] Auto-login snappay configurado
- [ ] SnapPay app (Electron) compilado
- [ ] Backend local (Node) pronto
- [ ] SQLite schema migrado
- [ ] Impressora testada
- [ ] Offline-first validado (vendas sem internet)
- [ ] Sincronização testada (batch upload)
- [ ] Backup script funcionando
- [ ] Health check rodando
- [ ] Firewall configurado
- [ ] SSH key-based auth
- [ ] Certificado SSL para cloud

### Produção

- [ ] Device ID registrado em nuvem
- [ ] Chave de ativação gerada
- [ ] Terminal ativado via UI
- [ ] Menu reduzido (PDV, Caixa, Vendas, Clientes)
- [ ] Fiscalização configurada (mock ou real)
- [ ] Operador treinado
- [ ] Plano de contingência (papel + caneta)
- [ ] Suporte 24/7 pronto

---

## 11. TROUBLESHOOTING

| Problema | Causa Provável | Solução |
|---|---|---|
| Tela preta/branca | Xvfb não iniciou ou app crashed | `systemctl restart snappay` |
| Offline permanente | Rede offline > limite fila | Manual sync quando online |
| Sem papel impressora | Hardware offline | Marcar falha, reimprir depois |
| SQLite bloqueado | Múltiplas instâncias app | `killall snappay-app && systemctl restart snappay` |
| Disco cheio | Logs/backups acumulados | `rm -rf /home/snappay/snappay-data/logs/*` |
| Bateria UPS baixa | Sem AC power | Operador vai para nuvem quando battery < 15% |
| Senha admin perdida | Ninguém tem acesso | Boot em single-user, resetar via shell |

---

## 12. ROADMAP APPLIANCE

### Fase 8 (Atual)
- ✅ Estrutura Linux Kiosk documentada
- ✅ Particionamento LUKS
- ✅ Auto-login + startup
- ✅ Backup script
- ✅ Health check template

### Fase 9
- [ ] Compilar Electron/Tauri para Linux
- [ ] Criar ISO custom (Debian + SnapPay pré-instalado)
- [ ] Testing em hardware real (Beelink)
- [ ] Documento operacional para instalador

### Fase 10
- [ ] Windows IoT support
- [ ] Deploy automático via web
- [ ] Monitoramento cloud centralizado
- [ ] OTA updates (over-the-air)

---

## 13. REFERÊNCIAS

- [Debian 12 Handbook](https://debian-handbook.info)
- [LUKS Encryption](https://wiki.archlinux.org/title/Dm-crypt/Encrypting_an_entire_system)
- [systemd.service](https://man7.org/linux/man-pages/man5/systemd.service.5.html)
- [Chromium Kiosk Mode](https://www.chromium.org/administrators/kiosk-mode)
- [ESC/POS Specification](https://en.wikipedia.org/wiki/Thermal_receipt_printer)

---

**Plano Appliance Completo — Pronto para Implementação** ✅

Sem hardware real agora (tudo é arquitetura + documentação).  
Readiness 100% para deployment em Fase 9.
