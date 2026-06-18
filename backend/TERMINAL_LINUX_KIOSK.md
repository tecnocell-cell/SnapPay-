# Terminal Linux em Modo Quiosque — Guia Operacional

## Hardware sugerido

- Mini PC (Beelink, Celeron dual-core, 4GB RAM, 128GB SSD)
- Linux Debian 12 ou Ubuntu 22.04 LTS (servidor, sem GUI)
- Touchscreen 7" (USB) ou monitor HDMI
- Impressora térmica (ESC/POS, Ethernet ou USB)
- Gaveta de dinheiro (3 linhas RJ11)
- Leitor de código de barras USB (simulado como teclado)

## Setup mínimo (bash script)

```bash
#!/bin/bash

# 1. Usuário dedicado
sudo useradd -m -s /bin/bash snappay
sudo usermod -aG video snappay  # acesso ao display

# 2. Instalar Chromium + Xvfb (X server without display)
sudo apt-get install -y chromium-browser xvfb

# 3. Criar pasta de dados persistente
sudo mkdir -p /opt/snappay-terminal/data
sudo chown snappay:snappay /opt/snappay-terminal/data

# 4. Auto-login no systemd (sem password)
sudo systemctl set-default multi-user.target
# Configurar getty para auto-login (em /etc/systemd/system/getty@tty1.service.d/override.conf)
# ExecStart=-/sbin/agetty --autologin snappay --noclear %I linux

# 5. Startup script no .bashrc do snappay
echo 'DISPLAY=:99' >> ~/.bashrc
echo 'Xvfb :99 -screen 0 1024x768x24 &' >> ~/.bashrc
echo 'sleep 2' >> ~/.bashrc
echo 'chromium-browser --kiosk --no-sandbox http://localhost:5173 &' >> ~/.bashrc

# 6. Desabilitar screensaver, lock
gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.session idle-delay 0
```

## Modo quiosque

**Chromium flags:**
```bash
chromium-browser \
  --kiosk \
  --no-sandbox \
  --disable-background-networking \
  --disable-breakpad \
  --disable-client-side-phishing-detection \
  --disable-default-apps \
  --disable-hang-monitor \
  --disable-popup-blocking \
  --disable-preconnect \
  --disable-sync \
  --enable-automation \
  --no-first-run \
  --password-store=detect \
  --enable-features=NetworkService,NetworkServiceInProcess \
  http://localhost:5173
```

**Bloquear saída:** adicionar no frontend script:
```javascript
// Desabilita Alt+F4, Ctrl+Alt+Del, Win+L
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey && e.altKey) || e.key === 'F12' || e.key === 'F11') {
    e.preventDefault();
  }
});

// Desabilita clique direito
document.addEventListener('contextmenu', (e) => e.preventDefault());
```

## Reinicio automático

**Crontab (snappay user):**
```cron
# Reinicia Chromium se cair
*/5 * * * * pkill -f "chromium-browser" || true
*/5 * * * * pgrep -f "chromium-browser" > /dev/null || DISPLAY=:99 chromium-browser --kiosk ... &

# Reinicia máquina 1x por dia (madrugada)
0 2 * * * sudo shutdown -r now
```

## Persistência de dados

**Particionamento sugerido:**
- `/` (sistema, read-only após boot)
- `/home/snappay/snappay-data/` (SQLite, XMLs, logs, backups)

**Backup local:**
```bash
# Diário, 3x (guarda 3 dias)
0 1 * * * tar -czf /home/snappay/snappay-data/backup_$(date +\%Y\%m\%d).tar.gz \
  /home/snappay/snappay-data/sqlite.db
```

## Monitoramento

**Status do terminal:**
```bash
#!/bin/bash
curl -s http://localhost:3001/api/terminal \
  -H "X-Device-ID: $(cat /opt/snappay-terminal/device_id.txt)"
```

## Troubleshooting

| Problema | Solução |
|---|---|
| Tela em branco | Reiniciar Chromium: `pkill -f chromium; DISPLAY=:99 chromium ...` |
| Sem internet | Offline mode automático; venda fica em fila SQLite |
| Impressora offline | App mostra aviso; operador imprime depois |
| Sistema travado | Reboot automático via cron (2x noite) |
| Evento fiscal pendente | Admin autoriza em `/api/fiscal/eventos/.../autorizar` |
