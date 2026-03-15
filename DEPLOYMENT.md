# SwarmTrade HTTP API - Deployment Guide

## Overview

This guide covers deploying SwarmTrade HTTP API to production environments. The server is lightweight and can run on any Node.js-compatible platform (Railway, Heroku, AWS, DigitalOcean, VPS, etc.).

---

## Prerequisites

- Node.js 18+ or Docker
- Access to SwarmTrade MCP server (local, remote, or private network)
- GitHub repository access (for CI/CD)
- Environment variables configured (see `.env.example`)

---

## 1. Local Development

### Quick Start

```bash
git clone https://github.com/jonathanrmarsh4/swarmtrade-http-api.git
cd swarmtrade-http-api
npm install
cp .env.example .env
```

### Configure .env

```env
NODE_ENV=development
PORT=3000
MCP_ENDPOINT=http://localhost:3001
CORS_ORIGINS=*
```

### Run Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

Server will be available at `http://localhost:3000`

### Test Health Check

```bash
curl http://localhost:3000/health
```

---

## 2. Docker Deployment

### Build Image

```bash
docker build -t swarmtrade-http-api:latest .
```

### Run Container

```bash
docker run -d \
  --name swarmtrade-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MCP_ENDPOINT=http://mcp-server:3001 \
  -e CORS_ORIGINS=https://app.example.com \
  swarmtrade-http-api:latest
```

### View Logs

```bash
docker logs -f swarmtrade-api
```

### Health Check

```bash
docker ps | grep swarmtrade-api
# Should show "healthy" status
```

---

## 3. Railway Deployment (Recommended)

Railway auto-detects Node.js and deploys from GitHub.

### Step 1: Fork/Clone Repo

Your repo should be accessible at `github.com/jonathanrmarsh4/swarmtrade-http-api`

### Step 2: Connect to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "GitHub Repo"
3. Authorize GitHub
4. Select `jonathanrmarsh4/swarmtrade-http-api`
5. Click "Deploy Now"

### Step 3: Configure Environment Variables

Railway will prompt for env vars. Set:

```
NODE_ENV=production
PORT=3000
MCP_ENDPOINT=<your-mcp-endpoint>
CORS_ORIGINS=https://openclaw-web-portal-production.up.railway.app
```

**For MCP_ENDPOINT:**
- If MCP is on same machine: Use Tailscale IP (e.g., `http://100.115.104.37:3001`)
- If MCP is on Railway: Use Railway URL
- If MCP is remote: Use public URL with auth token

### Step 4: Deploy

Railway auto-deploys. Watch build logs:

```bash
railway logs
```

### Step 5: Get Public URL

Railway assigns a domain automatically:
```
https://swarmtrade-http-api-production.up.railway.app
```

Update your web portal CORS settings to include this domain.

---

## 4. Docker Compose (Local Stack)

Run both API and MCP servers locally:

```bash
docker-compose up -d
```

This starts:
- HTTP API on `http://localhost:3000`
- (Optional) MCP server on `http://localhost:3001`

Check status:
```bash
docker-compose ps
```

Stop:
```bash
docker-compose down
```

---

## 5. Heroku Deployment

### Prerequisites

```bash
brew tap heroku/brew && brew install heroku
heroku login
```

### Deploy

```bash
heroku create swarmtrade-http-api
git push heroku main
```

### Set Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set MCP_ENDPOINT=<your-endpoint>
heroku config:set CORS_ORIGINS=https://app.example.com
```

### View Logs

```bash
heroku logs --tail
```

---

## 6. AWS Lambda (Serverless)

**Note:** Lambda has cold-start overhead (~1-2s). Recommended only for low-traffic deployments.

### Using Serverless Framework

```bash
npm install -g serverless
serverless create --template aws-nodejs-ecma-runtime
# ... configure in serverless.yml
serverless deploy
```

---

## 7. DigitalOcean App Platform

1. Go to [digitalocean.com](https://digitalocean.com)
2. Click "Create" → "App"
3. Connect GitHub repo
4. Select branch: `main`
5. DigitalOcean auto-detects Node.js
6. Set environment variables in UI
7. Deploy

---

## 8. Self-Hosted VPS (Ubuntu/Debian)

### Setup Server

```bash
# SSH into VPS
ssh user@your-vps.com

# Install Node.js
curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Clone repo
git clone https://github.com/jonathanrmarsh4/swarmtrade-http-api.git
cd swarmtrade-http-api
npm install
```

### Configure Environment

```bash
cp .env.example .env
nano .env
# Set NODE_ENV=production, MCP_ENDPOINT, CORS_ORIGINS
```

### Use PM2 for Process Management

```bash
npm install -g pm2
pm2 start src/index.js --name "swarmtrade-api" --instances 2
pm2 save
pm2 startup
```

### Reverse Proxy with nginx

```bash
sudo apt-get install -y nginx
```

Create `/etc/nginx/sites-available/swarmtrade`:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/swarmtrade /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

---

## 9. Production Checklist

- [ ] **Environment Variables:**
  - [ ] `NODE_ENV=production`
  - [ ] `MCP_ENDPOINT` points to production MCP
  - [ ] `CORS_ORIGINS` restricted to web portal domain(s)
  - [ ] `MCP_AUTH_TOKEN` set if required

- [ ] **Networking:**
  - [ ] MCP server is reachable from API server
  - [ ] Firewall allows inbound on port 3000 (or proxy port)
  - [ ] HTTPS enabled (via reverse proxy or platform TLS)

- [ ] **Monitoring:**
  - [ ] Health check endpoint working: `GET /health`
  - [ ] Logs are persisted (file or external service)
  - [ ] CPU/memory usage reasonable (expect <100MB at rest)
  - [ ] Response times <1s for most requests

- [ ] **Security:**
  - [ ] CORS configured correctly (not `*`)
  - [ ] Rate limiting enabled
  - [ ] No sensitive data in logs
  - [ ] MCP auth token in secure vault (1Password, AWS Secrets, etc.)

- [ ] **Reliability:**
  - [ ] Auto-restart on failure (PM2, systemd, Docker restart policy)
  - [ ] Graceful shutdown handling (SIGTERM/SIGINT)
  - [ ] Database backups scheduled (if applicable)

---

## 10. Scaling

### Single Instance

Sufficient for **<100 requests/second**. Current bottleneck is MCP server, not API.

### Multiple Instances (Load Balanced)

If needed, run multiple API instances behind a load balancer:

```
[nginx/HAProxy]
    ↓
[API Instance 1]
[API Instance 2]
[API Instance 3]
    ↓
[MCP Server]
```

All instances connect to same MCP endpoint.

---

## 11. Monitoring & Alerts

### Logs

- **Development:** Console output via Winston
- **Production:** Logs to `logs/combined.log` and `logs/error.log`

### Health Endpoint

Poll regularly:
```bash
while true; do
  curl -s http://localhost:3000/health | jq .status
  sleep 30
done
```

### External Monitoring (e.g., UptimeRobot)

```
GET https://api.example.com/health
Expected: {"status":"healthy",...}
Check every 5 minutes
Alert if down >5 minutes
```

---

## 12. Troubleshooting

### "Cannot connect to MCP server"

```bash
# From API server, test MCP connectivity
curl $MCP_ENDPOINT/health

# Check MCP server logs
# Verify firewall rules
# Verify environment variable is correct
```

### "Port already in use"

```bash
# Find process using port 3000
lsof -i :3000
kill -9 <PID>

# Or change port
PORT=3001 npm start
```

### "CORS error in web portal"

- Check `CORS_ORIGINS` env variable
- Must match exact domain of web portal
- Restart API after changing
- Check browser console for specific error

### "High memory usage"

- Check for memory leaks in MCP client
- Restart API server
- Monitor with `top` or `htop`
- Consider load balancer with multiple instances

### "Slow requests"

- Check MCP server performance
- Check network latency to MCP
- Review request logs for patterns
- Consider caching if appropriate

---

## 13. Rollback

If deployment goes wrong:

### GitHub

```bash
git revert <commit-hash>
git push
# Platform auto-redeploys
```

### Railway

Go to Railway dashboard → "Deployments" → Select previous version → "Redeploy"

### Docker

```bash
docker pull swarmtrade-http-api:v1.0.0
docker run -d swarmtrade-http-api:v1.0.0
```

---

## 14. Continuous Integration

The repo is ready for CI/CD. GitHub Actions example:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Support

For deployment issues:
1. Check server logs
2. Verify MCP connectivity
3. Review `.env` configuration
4. Check GitHub Issues: https://github.com/jonathanrmarsh4/swarmtrade-http-api/issues

---

**Ready to deploy!** 🚀
