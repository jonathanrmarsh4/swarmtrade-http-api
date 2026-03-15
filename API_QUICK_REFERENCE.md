# SwarmTrade HTTP API - Quick Reference

## Base URL
- **Development:** `http://localhost:3000`
- **Production:** `https://your-domain.com`

## Endpoints Summary

### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check (includes MCP status) |

### Read Endpoints (Portfolio & Market Data)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/portfolio` | Portfolio overview + all open trades |
| `GET` | `/api/status` | System status (agents, deliberations) |
| `GET` | `/api/trades` | List of open trades |
| `GET` | `/api/signals?limit=20` | Recent trading signals |
| `GET` | `/api/deliberations?limit=10` | Recent deliberations |

### Write Endpoints (Trading Actions)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/close-trade` | Close an open position |
| `POST` | `/api/tighten-stop` | Tighten stop loss |
| `POST` | `/api/pause` | Pause trading |
| `POST` | `/api/resume` | Resume trading |
| `POST` | `/api/request-trade` | Request manual trade |

---

## Response Format

All responses follow this format:

**Success (GET):**
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

**Success (POST):**
```json
{
  "success": true,
  "message": "Action completed",
  "data": { ... },
  "timestamp": "2026-03-15T13:08:00Z"
}
```

**Error:**
```json
{
  "error": "Error message",
  "message": "Details if validation error",
  "timestamp": "2026-03-15T13:08:00Z"
}
```

---

## Common Tasks

### Check if System is Healthy
```bash
curl http://localhost:3000/health
# If "mcp": {"connected": true}, you're good
```

### Get Current Portfolio Value
```bash
curl http://localhost:3000/api/portfolio | jq '.data.account'
```

### See What Signals Were Generated Recently
```bash
curl "http://localhost:3000/api/signals?limit=10"
```

### Close a Losing Trade
```bash
curl -X POST http://localhost:3000/api/close-trade \
  -H "Content-Type: application/json" \
  -d '{"trade_id": "trade-123"}'
```

### Stop Trading (e.g., before a news event)
```bash
curl -X POST http://localhost:3000/api/pause
```

### Restart Trading
```bash
curl -X POST http://localhost:3000/api/resume
```

### Manually Request BTC Long Trade
```bash
curl -X POST http://localhost:3000/api/request-trade \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USDT","side":"long","size":0.5,"reason":"Strong support bounce"}'
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | Request successful |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (auth token invalid) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `500` | Server error |
| `503` | Service unavailable (MCP offline) |

---

## Authentication

If `MCP_AUTH_TOKEN` is set on the server, include it:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/portfolio
```

---

## Rate Limiting

Default: **100 requests per minute per IP**

If rate limited (429), wait 60 seconds and retry.

---

## Timeouts

- **Timeout:** 30 seconds per request
- If MCP server takes >30s, request fails with 500 error
- Check MCP server logs if frequent timeouts occur

---

## Debugging

Enable verbose logging:
```bash
export NODE_ENV=development
npm run dev
```

Then check console output for `[MCP]` and `[API]` debug lines.

---

## Integration with Web Portal

The OpenClaw web portal (`openclaw-web-portal-production.up.railway.app`) connects via:

1. **Health check** every 30s: `GET /health`
2. **Portfolio fetch** every 15s: `GET /api/portfolio`
3. **Signals fetch** every 60s: `GET /api/signals?limit=10`
4. **Manual actions** on demand: `POST /api/*`

Set `CORS_ORIGINS=https://openclaw-web-portal-production.up.railway.app` in production.

---

## Example Postman Collection

See `postman-collection.json` (if included) for pre-configured requests.

Or build your own:
- **URL:** `{{base_url}}/api/portfolio`
- **Auth:** `Bearer {{auth_token}}`
- **Headers:** `Content-Type: application/json`
