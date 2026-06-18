# 📋 RELATÓRIO — Ambiente Piloto SnapPay

**Data:** 18 de junho de 2026  
**Objetivo:** Documentar infraestrutura de homologação para operação piloto  
**Status:** 🏗️ Em construção

---

## 1. Infraestrutura Recomendada

### 1.1 Servidor VPS (Recomendado: Linux Ubuntu 24.04 LTS)

| Aspecto | Recomendação | Mínimo | Justificativa |
|---------|--------------|--------|---------------|
| **SO** | Ubuntu 24.04 LTS | Ubuntu 20.04+ | Suporte 5 anos, drivers atualizados |
| **CPU** | 4 vCores | 2 vCores | Node.js + Nginx + DB em paralelo |
| **RAM** | 8 GB | 4 GB | 2GB backend + 1GB DB + 1GB buffer |
| **Disco** | 100 GB SSD | 50 GB | Logs + backups + margem de crescimento |
| **Banda** | 100 Mbps | 10 Mbps | Sincronização offline, backups |
| **Provider** | DigitalOcean, Linode, AWS | — | Gerenciados, backups automáticos |

### 1.2 Arquitetura do Ambiente

```
┌─────────────────────────────────────────────────────────┐
│                    VPS Ubuntu 24.04                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Nginx     │  │  Backend     │  │  PostgreSQL  │  │
│  │  (reverse   │──│  Node.js     │──│ snappay_     │  │
│  │  proxy +    │  │  port 3001   │  │ homolog      │  │
│  │  SSL)       │  │              │  │              │  │
│  │  port 443   │  │  PM2/Docker  │  │ port 5432    │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
│         │                                      │         │
│         └──────────────────────────────────────┘         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Frontend (React Vite) — servido via Nginx          │ │
│  │  Build: /var/www/snappay-homolog/frontend/dist      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Logs (tls, aplicação, erro, sincronização, fiscal) │ │
│  │  /var/log/snappay/ — rotação diária                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Backups automáticos — /backup/snappay_homolog/     │ │
│  │  Diário, retenção 7 dias, criptografia              │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
         │
         └── Internet pública
             (domínio: homolog.seudominio.com.br)
```

---

## 2. Separação Dev ↔ Homolog

### 2.1 Diferenças críticas

| Aspecto | Desenvolvimento | Homologação |
|---------|-----------------|-------------|
| **Banco** | `snappay_dev` (local) | `snappay_homolog` (VPS) |
| **Backend** | `http://localhost:3001` | `https://homolog.seudominio.com.br` |
| **Frontend** | `http://localhost:5173` | `https://homolog.seudominio.com.br` |
| **Log level** | `DEBUG` | `INFO` (erros apenas) |
| **SSL** | Não | Let's Encrypt obrigatório |
| **CORS** | `*` ou localhost | Domínio específico |
| **Deploy** | `npm run dev` | Docker/PM2 + systemd |
| **Backup** | Manual | Automático diário |
| **Acesso** | Local/privado | Restrito por senha |

### 2.2 Variáveis de ambiente isoladas

**Development (`.env.dev`)**
```env
NODE_ENV=development
DB_HOST=localhost
DB_NAME=snappay_dev
DB_USER=snappay_dev
DB_PASSWORD=dev_password
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=DEBUG
FISCAL_PROVIDER=MOCK
```

**Homologação (`.env.homolog`)**
```env
NODE_ENV=production
DB_HOST=db.snappay_homolog.internal
DB_NAME=snappay_homolog
DB_USER=snappay_homolog_user
DB_PASSWORD=<strong_random_password>
API_URL=https://homolog.seudominio.com.br
FRONTEND_URL=https://homolog.seudominio.com.br
LOG_LEVEL=INFO
FISCAL_PROVIDER=FOCUS_NFE
CORS_ORIGIN=https://homolog.seudominio.com.br
```

---

## 3. Componentes do Ambiente

### 3.1 Nginx (Reverse Proxy + SSL)

- **Porta:** 443 (HTTPS) + 80 (redirect)
- **Certificado:** Let's Encrypt (renovação automática via Certbot)
- **Responsabilidades:**
  - Servir frontend (React build)
  - Rotear `/api/` → backend Node.js
  - Comprimir respostas (gzip)
  - Cache de assets estáticos

### 3.2 Backend Node.js + Express

- **Porta:** 3001 (apenas localhost, atrás do Nginx)
- **PM2 ou Docker:** Gerenciamento de processo
- **Migrations:** Executadas automaticamente no startup
- **Health check:** `GET /health` (status do servidor e BD)

### 3.3 Banco de Dados (PostgreSQL)

- **Banco:** `snappay_homolog`
- **Porta:** 5432 (apenas localhost, não exposto)
- **Backup:** Script cron diário (22h)
- **Retenção:** 7 backups diários + 4 backups semanais

### 3.4 Logging

**Estrutura de diretórios:**
```
/var/log/snappay/
├── application/
│   ├── app-2026-06-18.log
│   ├── app-2026-06-19.log
│   └── ...
├── errors/
│   ├── error-2026-06-18.log
│   └── ...
├── sync/
│   └── sync-2026-06-18.log
└── fiscal/
    └── fiscal-2026-06-18.log
```

**Rotação:** Diária à meia-noite (logrotate)

### 3.5 Monitoramento

- **Health check:** Endpoint `/health` respondendo a cada 60 segundos
- **Disco:** Alerta se > 80% cheio
- **Memória:** Alerta se > 85% usada
- **CPU:** Alerta se > 90% média dos últimos 5 min
- **Conectividade DB:** Teste de conexão no health check

---

## 4. Segurança

### 4.1 Firewall (UFW no Linux)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

### 4.2 Variáveis sensíveis

- **Nunca em git:** `.env.homolog` está em `.gitignore`
- **Armazenamento:** `/etc/snappay/.env.homolog` (permissões 600)
- **Credenciais de BD:** Senhas fortes (mínimo 16 chars alphanuméricas)
- **Tokens de API:** Rotacionados a cada 90 dias

### 4.3 HTTPS/TLS

- **Certificado:** Let's Encrypt (renovação automática)
- **Criptografia:** TLS 1.3 obrigatório
- **Chave privada:** Protegida por permissions (600)
- **Teste:** `certbot renew --dry-run` (verificar renovação)

### 4.4 Acesso SSH

- **Chave privada SSH:** Na máquina do operador
- **Sem password login:** Apenas chaves
- **Fail2ban:** Proteger contra força bruta

---

## 5. Processo de Deploy

### 5.1 Pré-requisitos

- [ ] VPS Ubuntu 24.04 LTS alocado
- [ ] Domínio registrado (homolog.seudominio.com.br)
- [ ] Acesso SSH com chave privada
- [ ] PostgreSQL instalado e rodando
- [ ] Node.js 20.x instalado
- [ ] Nginx instalado
- [ ] PM2 global: `npm i -g pm2`

### 5.2 Deploy automatizado

Executar script: `./scripts/deploy-homolog.sh`

```bash
#!/bin/bash
set -e

# 1. Clone/update código
git clone https://github.com/tecnocell-cell/SnapPay-.git /var/www/snappay-homolog
cd /var/www/snappay-homolog

# 2. Build frontend
cd frontend
npm install
npm run build
cd ..

# 3. Instalar backend
cd backend
npm install
NODE_ENV=production npx sequelize db:migrate
cd ..

# 4. Iniciar com PM2
pm2 start backend/server.js --name "snappay-homolog" --env production

# 5. Salvar configuração PM2
pm2 save
pm2 startup

echo "✅ Deploy concluído. Nginx aguarda restart manual."
```

### 5.3 Cronograma

- **Primeira vez:** ~30 minutos (setup de tudo)
- **Updates:** ~5 minutos (pull + rebuild + restart)
- **Backup:** Automático diário às 22h

---

## 6. Entregáveis

| Documento | Responsabilidade |
|-----------|-----------------|
| **RELATORIO_AMBIENTE_PILOTO.md** | Este arquivo (infraestrutura e specs) |
| **MANUAL_DEPLOY.md** | Passo-a-passo de deploy inicial |
| **MANUAL_BACKUP.md** | Backup automático + restauração |
| **MANUAL_RESTAURACAO.md** | Como restaurar do backup |
| **CHECKLIST_OPERACIONAL.md** | Rotinas diárias/semanais/mensais |
| **docker-compose.yml** | Orquestração (alternativa a VPS manual) |
| **scripts/deploy-homolog.sh** | Automatização de deploy |

---

## 7. Timeline de implementação

| Semana | Etapa | Data |
|--------|-------|------|
| 1 | 1.1–1.3 (infra, DB, SSL) | 18–22/06 |
| 2 | 1.4–1.5 (deploy, logs) | 23–29/06 |
| 3 | 1.6–1.7 (monitoramento, seg.) | 30/06–05/07 |
| 4 | 1.8–1.9 (testes, manuais) | 06–12/07 |

---

## 8. Sucesso = ?

Quando o ambiente piloto está **pronto**, você consegue:

- ✅ Acessar `https://homolog.seudominio.com.br` com SSL válido
- ✅ Fazer login, venda, compra, offline + sincronização
- ✅ Ver todos os logs em `/var/log/snappay/`
- ✅ Restaurar backup de antes de ontem em < 5 min
- ✅ Health check respondendo 200 OK
- ✅ Disco/memória/CPU dentro dos limites
- ✅ Documentação completa para operador piloto

---

**Próximo:** Ler `MANUAL_DEPLOY.md` para começar a setup.
