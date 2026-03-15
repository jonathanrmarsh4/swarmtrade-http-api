# SwarmTrade HTTP API Server

**Production-ready HTTP API server** that wraps the SwarmTrade MCP (Model Context Protocol) server and exposes all trading tools as REST endpoints for the OpenClaw web portal.

This is the **bridge** between the web dashboard and the SwarmTrade autonomous trading engine.

## Features

✅ **Complete MCP Wrapper** — All 10 SwarmTrade tools exposed as REST endpoints  
✅ **Production Ready** — Error handling, rate limiting, CORS, comprehensive logging  
✅ **Health Checks** — Monitor server and MCP connectivity  
✅ **Request Validation** — Input validation for all POST endpoints  
✅ **Async/Await** — Modern Node.js patterns throughout  
✅ **Configurable** — Environment-based configuration  

## Quick Start

### Local Development

```bash
# Clone and install
git clone https://github.com/jonathanrmarsh4/swarmtrade-http-api.git
cd swarmtrade-http-api
npm install

# Configure
cp .env.example .env
# Edit .env to set MCP_ENDPOINT (default: http://localhost:3001)

# Run
npm run dev    # With hot reload
npm start      # Production mode
```

### Docker (Recommended for Production)

```bash
# Build
docker build -t swarmtrade-http-api .

# Run
docker run -p 3000:3000 \
  -e MCP_ENDPOINT=http://host.docker.internal:3001 \
  -e NODE_ENV=production \
  swarmtrade-http-api
```

### Railway Deployment

1. **Create a new project** on Railway
2. **Connect GitHub repo** → Auto-deploys on push
3. **Set environment variables** in Railway dashboard:
   - `NODE_ENV`: `production`
   - `MCP_ENDPOINT`: Your MCP server endpoint (via Tailscale or public URL)
   - `PORT`: `3000` (Railway assigns automatically)
   - `CORS_ORIGINS`: `https://openclaw-web-portal-production.up.railway.app`
4. **Deploy** → Railway handles domain assignment

## API Reference

### Health & Status

#### `GET /health`
Simple health check. Verifies server is running and optionally pings MCP.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-15T13:08:00Z",
  "version": "1.0.0",
  "mcp": {
    "connected": true,
    "endpoint": "http://localhost:3001"
  },
  "environment": "production"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "mcp": {
    "connected": false
  }
}
```

---

### Portfolio & Trades

#### `GET /api/portfolio`
Fetch portfolio overview and all open trades.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "account": {
      "balance": 10000,
      "equity": 10500,
      "margin_available": 5000,
      "margin_used": 5000,
      "drawdown_percent": 2.1
    },
    "trades": [
      {
        "id": "trade-001",
        "symbol": "BTC/USDT",
        "side": "long",
        "entry_price": 42100,
        "current_price": 42500,
        "quantity": 0.25,
        "pnl": 100,
        "pnl_percent": 2.4,
        "stop_loss": 41000,
        "take_profit": 43000,
        "created_at": "2026-03-15T12:00:00Z"
      }
    ],
    "open_positions": 5,
    "total_pnl": 1200,
    "win_rate": 0.62
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

#### `GET /api/trades`
Fetch list of open trades (filtered view of portfolio).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "trades": [...]
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

#### `GET /api/status`
Fetch system status (agent states, deliberation activity, etc.).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "trading_active": true,
    "agents": {
      "bull": { "status": "active", "last_analysis": "2026-03-15T13:07:00Z" },
      "bear": { "status": "active", "last_analysis": "2026-03-15T13:07:00Z" },
      "quant": { "status": "active", "last_analysis": "2026-03-15T13:07:00Z" },
      "macro": { "status": "active", "last_analysis": "2026-03-15T13:07:00Z" }
    },
    "last_deliberation": "2026-03-15T13:07:00Z",
    "deliberations_today": 142,
    "signals_generated": 7824
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

### Signals & Deliberations

#### `GET /api/signals?limit=20`
Fetch recent trading signals from all agents.

**Query Parameters:**
- `limit` (optional, default: 20, max: 100) — Number of signals to fetch

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 20,
    "signals": [
      {
        "id": "signal-001",
        "agent": "bull",
        "symbol": "ETH/USDT",
        "side": "long",
        "confidence": 0.85,
        "reason": "Bullish breakout above resistance",
        "created_at": "2026-03-15T13:05:00Z"
      }
    ]
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

#### `GET /api/deliberations?limit=10`
Fetch recent agent deliberations and synthesis decisions.

**Query Parameters:**
- `limit` (optional, default: 10, max: 100) — Number of deliberations to fetch

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 10,
    "deliberations": [
      {
        "id": "deliberation-001",
        "timestamp": "2026-03-15T13:07:00Z",
        "round": 3,
        "symbol": "BTC/USDT",
        "agents_voting": ["bull", "quant", "macro"],
        "decision": "LONG",
        "confidence": 0.78,
        "trade_placed": true,
        "trade_id": "trade-042"
      }
    ]
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

### Trading Actions

#### `POST /api/close-trade`
Close an open position by trade ID.

**Request Body:**
```json
{
  "trade_id": "trade-001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Trade trade-001 closed",
  "data": {
    "trade_id": "trade-001",
    "closed_at": "2026-03-15T13:08:00Z",
    "exit_price": 42500,
    "pnl": 100,
    "pnl_percent": 2.4
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "message": "Missing required fields: trade_id"
}
```

---

#### `POST /api/tighten-stop`
Tighten stop loss for a trade (can only move stop loss higher, not lower).

**Request Body:**
```json
{
  "trade_id": "trade-001",
  "new_stop_loss": 41500
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Stop loss tightened for trade trade-001",
  "data": {
    "trade_id": "trade-001",
    "old_stop_loss": 41000,
    "new_stop_loss": 41500,
    "updated_at": "2026-03-15T13:08:00Z"
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

#### `POST /api/pause`
Pause trading (agents stop deliberating and placing new trades).

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Trading paused",
  "data": {
    "status": "paused",
    "paused_at": "2026-03-15T13:08:00Z"
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

#### `POST /api/resume`
Resume trading after pause.

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Trading resumed",
  "data": {
    "status": "active",
    "resumed_at": "2026-03-15T13:08:00Z"
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

#### `POST /api/request-trade`
Request a manual trade from the swarm (one-off override).

**Request Body:**
```json
{
  "symbol": "BTC/USDT",
  "side": "long",
  "size": 0.5,
  "reason": "Manual entry - strong confluence"
}
```

**Parameters:**
- `symbol` (required) — Trading pair (e.g., "BTC/USDT")
- `side` (required) — "long" or "short"
- `size` (optional) — Position size override
- `reason` (optional) — Reason for manual trade request

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Trade request submitted for BTC/USDT",
  "data": {
    "request_id": "manual-trade-001",
    "symbol": "BTC/USDT",
    "side": "long",
    "status": "pending_execution",
    "created_at": "2026-03-15T13:08:00Z"
  },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

## Error Handling

All endpoints return standard error responses:

**400 Bad Request** — Validation failed
```json
{
  "error": "Validation failed",
  "message": "Missing required fields: trade_id",
  "received": { ... }
}
```

**500 Internal Server Error** — MCP or server error
```json
{
  "error": "Failed to fetch portfolio",
  "details": "Connection timeout"
}
```

**503 Service Unavailable** — MCP server unreachable
```json
{
  "status": "degraded",
  "mcp": {
    "connected": false
  }
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Execution mode: development, production |
| `PORT` | `3000` | HTTP server port |
| `MCP_ENDPOINT` | `http://localhost:3001` | SwarmTrade MCP server endpoint |
| `MCP_AUTH_TOKEN` | (none) | Optional auth token for MCP server |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Logging level |

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set appropriate `CORS_ORIGINS` (e.g., `https://app.example.com`)
- [ ] Configure `MCP_ENDPOINT` to production MCP server
- [ ] Add `MCP_AUTH_TOKEN` if required
- [ ] Use strong secrets management (1Password, AWS Secrets Manager, etc.)
- [ ] Enable HTTPS for all endpoints (use reverse proxy like nginx)
- [ ] Monitor logs and set up alerting

---

## curl Examples

### Health Check
```bash
curl http://localhost:3000/health
```

### Get Portfolio
```bash
curl http://localhost:3000/api/portfolio | jq
```

### Get Recent Signals (limit 5)
```bash
curl "http://localhost:3000/api/signals?limit=5" | jq
```

### Get Deliberations
```bash
curl "http://localhost:3000/api/deliberations?limit=3" | jq
```

### Close a Trade
```bash
curl -X POST http://localhost:3000/api/close-trade \
  -H "Content-Type: application/json" \
  -d '{"trade_id": "trade-001"}'
```

### Tighten Stop Loss
```bash
curl -X POST http://localhost:3000/api/tighten-stop \
  -H "Content-Type: application/json" \
  -d '{"trade_id": "trade-001", "new_stop_loss": 41500}'
```

### Pause Trading
```bash
curl -X POST http://localhost:3000/api/pause
```

### Resume Trading
```bash
curl -X POST http://localhost:3000/api/resume
```

### Request a Manual Trade
```bash
curl -X POST http://localhost:3000/api/request-trade \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "side": "long",
    "size": 0.5,
    "reason": "Strong confluence"
  }'
```

---

## Logging

The server logs all requests and errors with structured logging:

```
2026-03-15 13:08:00 [INFO] [API] GET /api/portfolio - 200 (145ms)
2026-03-15 13:08:01 [DEBUG] [MCP] Invoking tool: swarmtrade_get_portfolio
2026-03-15 13:08:02 [INFO] [MCP] Connected to SwarmTrade MCP server
```

**Log Levels:**
- `debug` — Detailed tracing (MCP calls, request details)
- `info` — Normal operations (API requests, startup)
- `warn` — Warnings (slow requests, degraded status)
- `error` — Errors (MCP failures, exceptions)

In production, logs are written to:
- `logs/error.log` — Errors only
- `logs/combined.log` — All logs

---

## Troubleshooting

### "Cannot connect to MCP server"
1. Check `MCP_ENDPOINT` is correct
2. Verify MCP server is running: `curl http://localhost:3001/health`
3. If behind firewall, check network routing (Tailscale, VPN, etc.)
4. Check logs: `npm run dev` and look for connection errors

### "Rate limit exceeded"
- Default: 100 req/min per IP
- Adjust in `.env` or request limit raised for trusted IPs
- In development, rate limiting is disabled

### "CORS error in browser"
1. Check `CORS_ORIGINS` environment variable
2. Must include full domain (e.g., `https://app.example.com`)
3. Cannot use `*` if credentials are required
4. Restart server after changing CORS settings

### "Health check shows degraded"
- MCP server is unreachable
- Check MCP server logs and network connectivity
- API is still functional but data endpoints will fail

---

## Deployment Guides

### Local (Development)
```bash
cp .env.example .env
npm install
npm run dev
# Access: http://localhost:3000
```

### Docker
```bash
docker build -t swarmtrade-api:latest .
docker run -d \
  --name swarmtrade-api \
  -p 3000:3000 \
  -e MCP_ENDPOINT=http://mcp-server:3001 \
  -e NODE_ENV=production \
  swarmtrade-api:latest
```

### Railway (Auto-Deploy from GitHub)
1. Fork or clone repo
2. Create new project on Railway
3. Connect GitHub account
4. Select `jonathanrmarsh4/swarmtrade-http-api` repo
5. Railway auto-detects `package.json` and Node.js
6. Set environment variables in Railway dashboard
7. On each push to main, auto-deploys

### ngrok (Local Tunneling)
For testing web portal connectivity to local MCP:
```bash
npm start &
ngrok http 3000
# Share ngrok URL with web portal
# Example: https://abc123.ngrok.io
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│   OpenClaw Web Portal                   │
│   (React Dashboard @ Railway)           │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP REST
                 ▼
┌─────────────────────────────────────────┐
│   SwarmTrade HTTP API Server (This)     │
│   - Express.js                          │
│   - Rate limiting, CORS, validation     │
│   - Structured logging                  │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP/STDIO
                 ▼
┌─────────────────────────────────────────┐
│   SwarmTrade MCP Server                 │
│   - 11 autonomous trading agents        │
│   - 10 tools (portfolio, trades, etc.)  │
│   - 3-round deliberation engine         │
└─────────────────────────────────────────┘
```

---

## Contributing

Contributions welcome! Please:
1. Follow the code style (ES6, async/await)
2. Add comments to complex logic
3. Test locally before pushing
4. Update README for new endpoints

---

## License

MIT — See LICENSE file

---

## Support

Built for [SwarmTrade](https://github.com/jonathanrmarsh4/swarmtrade) by Jonathan Marsh.

For issues, questions, or feature requests → [GitHub Issues](https://github.com/jonathanrmarsh4/swarmtrade-http-api/issues)
