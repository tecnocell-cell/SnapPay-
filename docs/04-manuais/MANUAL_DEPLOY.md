# 📖 MANUAL DE DEPLOY — Ambiente Piloto SnapPay

**Versão:** 1.0  
**Data:** 18 de junho de 2026  
**Tempo estimado:** 30–45 minutos (primeira vez)

---

## 🎯 Objetivo

Fazer deploy do SnapPay em servidor VPS Ubuntu 24.04 com HTTPS, logs centralizados e backup automático.

**Assumindo:** Você tem acesso SSH ao servidor e domínio já configurado.

---

## PASSO 1: Preparar o Servidor

### 1.1 Conectar ao servidor

```bash
ssh -i ~/.ssh/seu-servidor.pem ubuntu@seu-vps-ip
```

### 1.2 Atualizar sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential

# Node.js (versão LTS 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2 (gerenciador de processos)
sudo npm install -g pm2

# Certbot (SSL/TLS)
sudo apt install -y certbot python3-certbot-nginx

# UFW (Firewall)
sudo apt install -y ufw

echo "✅ Sistema preparado"
```

### 1.3 Configurar Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
echo "Firewall ativado"

# Verificar
sudo ufw status
```

---

## PASSO 2: Preparar Banco de Dados

### 2.1 Criar usuário e banco

```bash
sudo -u postgres psql <<EOF
-- Criar usuário
CREATE USER snappay_homolog_user WITH PASSWORD 'COLOQUE_UMA_SENHA_FORTE_AQUI';

-- Criar banco
CREATE DATABASE snappay_homolog OWNER snappay_homolog_user;

-- Permissões
GRANT ALL PRIVILEGES ON DATABASE snappay_homolog TO snappay_homolog_user;

-- Habilitar extensões
\c snappay_homolog
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar
\dt
\du
EOF
```

**Guarde a senha em lugar seguro!** Você vai precisar dela em `.env.homolog`.

### 2.2 Testar conexão

```bash
psql -h localhost -U snappay_homolog_user -d snappay_homolog -c "SELECT NOW();"
```

---

## PASSO 3: Clonar e Preparar Código

### 3.1 Clonar repositório

```bash
cd /var/www
sudo git clone https://github.com/tecnocell-cell/SnapPay-.git snappay-homolog
cd snappay-homolog
sudo chown -R $USER:$USER .

# Entrar na branch principal
git checkout main
```

### 3.2 Criar arquivo `.env.homolog`

```bash
# Backend
cat > backend/.env.homolog <<'EOF'
NODE_ENV=production
PORT=3001

# Banco
DB_HOST=localhost
DB_PORT=5432
DB_NAME=snappay_homolog
DB_USER=snappay_homolog_user
DB_PASSWORD=COLOQUE_A_SENHA_QUE_CRIOU_ACIMA
DB_DIALECT=postgres

# URLs
API_URL=https://homolog.seudominio.com.br
FRONTEND_URL=https://homolog.seudominio.com.br

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/snappay

# Fiscal (deixar MOCK por enquanto)
FISCAL_PROVIDER=MOCK

# CORS
CORS_ORIGIN=https://homolog.seudominio.com.br

# JWT (gerar valores aleatórios fortes)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_EXPIRES_IN=7d
EOF

chmod 600 backend/.env.homolog
echo "✅ .env.homolog criado (adicione ao .gitignore!)"
```

### 3.3 Garantir que `.env.homolog` está em `.gitignore`

```bash
# Verificar
grep ".env" .gitignore

# Se não estiver, adicionar
echo ".env.homolog" >> .gitignore
echo ".env.production" >> .gitignore
```

---

## PASSO 4: Build Frontend

### 4.1 Instalar e buildar

```bash
cd frontend
npm install
npm run build

# Verificar build
ls -la dist/
echo "✅ Frontend buildado"
cd ..
```

### 4.2 Copiar para Nginx

```bash
sudo mkdir -p /var/www/snappay-homolog-static
sudo cp -r frontend/dist/* /var/www/snappay-homolog-static/
sudo chown -R www-data:www-data /var/www/snappay-homolog-static
```

---

## PASSO 5: Instalar Dependências Backend

### 5.1 Npm install

```bash
cd backend
npm install --production
echo "✅ Dependências instaladas"
cd ..
```

### 5.2 Executar migrations

```bash
cd backend
# Testar migração (sem aplicar)
NODE_ENV=production npx sequelize db:migrate:status

# Aplicar
NODE_ENV=production npx sequelize db:migrate

echo "✅ Migrations executadas"
cd ..
```

---

## PASSO 6: Configurar Nginx

### 6.1 Criar arquivo de configuração

```bash
sudo tee /etc/nginx/sites-available/snappay-homolog > /dev/null <<'EOF'
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name homolog.seudominio.com.br;
    
    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name homolog.seudominio.com.br;

    # SSL (será preenchido pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/homolog.seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/homolog.seudominio.com.br/privkey.pem;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Compressão
    gzip on;
    gzip_types application/json text/plain text/css application/javascript;
    gzip_min_length 1000;

    # Frontend estático
    location / {
        root /var/www/snappay-homolog-static;
        try_files $uri $uri/ /index.html;
        expires 1d;
    }

    # Cache assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/snappay-homolog-static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API → Backend Node
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/snappay/nginx/access.log;
    error_log /var/log/snappay/nginx/error.log;
}
EOF

echo "✅ Nginx configurado"
```

### 6.2 Habilitar site

```bash
sudo ln -sf /etc/nginx/sites-available/snappay-homolog \
            /etc/nginx/sites-enabled/snappay-homolog

# Remover site default se necessário
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx
echo "✅ Nginx iniciado"
```

---

## PASSO 7: Configurar SSL/TLS com Let's Encrypt

### 7.1 Obter certificado

```bash
# Certbot vai pedir seu email e aceitar ToS
sudo certbot certonly --nginx -d homolog.seudominio.com.br

# Verificar
ls -la /etc/letsencrypt/live/homolog.seudominio.com.br/
```

### 7.2 Renovação automática

```bash
# Teste dry-run
sudo certbot renew --dry-run

# Ativar timer do systemd (automático)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar status
sudo systemctl status certbot.timer
echo "✅ SSL renovação automática ativada"
```

---

## PASSO 8: Preparar Logs

### 8.1 Criar estrutura de logs

```bash
sudo mkdir -p /var/log/snappay/{application,errors,sync,fiscal,nginx}
sudo chown -R $USER:$USER /var/log/snappay

# Criar arquivo de rotação
sudo tee /etc/logrotate.d/snappay > /dev/null <<'EOF'
/var/log/snappay/*/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
}
EOF

echo "✅ Logs configurados"
```

### 8.2 Testar logs no backend

No arquivo `backend/server.js`, adicionar logger:

```javascript
const fs = require('fs');
const path = require('path');

const logDir = process.env.LOG_DIR || '/var/log/snappay';

// Criar logger simples
const logToFile = (type, message) => {
    const dir = path.join(logDir, type);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const file = path.join(dir, `${type}-${new Date().toISOString().split('T')[0]}.log`);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(file, `[${timestamp}] ${message}\n`);
};

// Usar
logToFile('application', 'Server started on port 3001');
logToFile('errors', 'Some error message');
```

---

## PASSO 9: Iniciar Backend com PM2

### 9.1 Criar arquivo de configuração PM2

```bash
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'snappay-homolog',
    script: 'backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/snappay/pm2-error.log',
    out_file: '/var/log/snappay/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

echo "✅ Arquivo PM2 criado"
```

### 9.2 Iniciar com PM2

```bash
pm2 start ecosystem.config.js
pm2 status
pm2 save
pm2 startup

# Testar acesso
curl http://localhost:3001/health

echo "✅ Backend iniciado com PM2"
```

---

## PASSO 10: Criar Diretório de Backups

### 10.1 Preparar backup

```bash
sudo mkdir -p /backup/snappay_homolog
sudo chown $USER:$USER /backup/snappay_homolog

# Teste de backup manual
./scripts/backup-db.sh

# Verificar
ls -la /backup/snappay_homolog/
```

---

## PASSO 11: Teste Final

### 11.1 Acessar aplicação

```bash
# Abrir no navegador
https://homolog.seudominio.com.br

# Ou testar via curl
curl https://homolog.seudominio.com.br/api/health
```

### 11.2 Verificar tudo

```bash
# 1. Nginx rodando?
sudo systemctl status nginx

# 2. Backend rodando?
pm2 status

# 3. Banco respondendo?
psql -h localhost -U snappay_homolog_user -d snappay_homolog -c "SELECT COUNT(*) FROM usuarios;"

# 4. Logs sendo gerados?
tail -f /var/log/snappay/application/*.log

# 5. SSL válido?
curl -I https://homolog.seudominio.com.br | grep SSL

# 6. Firewall ok?
sudo ufw status
```

### 11.3 Teste de negócio

No navegador, testar:
- [ ] Login com usuário admin
- [ ] Criar venda
- [ ] Criar compra
- [ ] Ver inventário
- [ ] Fazer sincronização offline
- [ ] Visualizar logs

---

## PASSO 12: Documentação e Handoff

### 12.1 Criar checklist operacional

Criar arquivo `CHECKLIST_OPERACIONAL.md` com:
- Rotinas diárias
- Monitoramento de disco/memória
- Testes de backup
- Processo de restart

### 12.2 Documentar acesso

```bash
cat > /var/www/snappay-homolog/ACESSO_HOMOLOG.md <<'EOF'
# 🔑 Acesso ao Ambiente Piloto

## URLs
- Frontend: https://homolog.seudominio.com.br
- API: https://homolog.seudominio.com.br/api

## Acesso SSH
ssh -i ~/.ssh/seu-servidor.pem ubuntu@seu-vps-ip

## Credenciais BD
- Host: localhost
- Banco: snappay_homolog
- Usuário: snappay_homolog_user
- Senha: (veja .env.homolog)

## Comandos úteis
- Status: `pm2 status`
- Logs: `tail -f /var/log/snappay/application/*.log`
- Restart: `pm2 restart snappay-homolog`
- Backup: `./scripts/backup-db.sh`

## Suporte
Contatar: seu-email@example.com
EOF

chmod 644 /var/www/snappay-homolog/ACESSO_HOMOLOG.md
```

---

## ✅ Sucesso!

Se chegou aqui, você tem:
- ✅ Servidor Ubuntu 24.04 preparado
- ✅ PostgreSQL `snappay_homolog` rodando
- ✅ Backend Node.js via PM2
- ✅ Frontend React servido por Nginx
- ✅ HTTPS com Let's Encrypt
- ✅ Logs centralizados
- ✅ Backup automático preparado
- ✅ Firewall ativado

**Próximo:** Ler `MANUAL_BACKUP.md` para finalizar rotinas de backup.
