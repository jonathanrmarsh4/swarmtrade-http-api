# Contributing to SwarmTrade HTTP API

## Getting Started

1. **Fork the repo** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/swarmtrade-http-api.git
   cd swarmtrade-http-api
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

```bash
npm install
cp .env.example .env
# Update .env with your MCP endpoint
npm run dev
```

## Code Style

- **Language:** ES6+ (modern JavaScript)
- **Async:** Use `async/await`, not callbacks or `.then()`
- **Formatting:** 2-space indentation
- **Comments:** Add comments to complex logic, not obvious code
- **Variables:** Use descriptive names (`tradeId`, not `tid`)

### Example

```javascript
// ✅ Good
export async function closeTrade(req, res) {
  try {
    const { trade_id } = req.body;
    logger.info(`Closing trade: ${trade_id}`);
    
    // MCP call with clear naming
    const result = await mcpClient.closeTrade(trade_id);
    successResponse(res, result, 'Trade closed');
  } catch (error) {
    errorResponse(res, 'Failed to close trade', 500, error.message);
  }
}

// ❌ Avoid
function close(r, s) {
  mcpClient.ct(r.b.tid).then(res => {
    s.json({ok:true, d:res});
  }).catch(e => {
    s.json({e:e.message});
  });
}
```

## Error Handling

Always use the error helpers:

```javascript
// Success
successResponse(res, data, 'Optional message', 200);

// Error
errorResponse(res, 'User-friendly message', statusCode, 'Optional details');
```

## Logging

Use structured logging with the logger:

```javascript
import { logger } from './logger.js';

logger.info('[API] Portfolio fetched', { trades: 5 });
logger.error('[ERROR] MCP failed', error);
logger.debug('[MCP] Invoking tool', { toolName: 'swarmtrade_get_portfolio' });
```

**Log prefixes:**
- `[API]` — HTTP API operations
- `[MCP]` — MCP server interactions
- `[ERROR]` — Errors
- `[WARN]` — Warnings

## File Structure

```
src/
  ├── index.js           # Main Express server, route definitions
  ├── handlers.js        # Route handlers for all endpoints
  ├── mcp-client.js      # MCP server communication
  ├── logger.js          # Winston logger setup
  └── middleware.js      # Express middleware (validation, etc.)
```

**Guidelines:**
- **index.js:** Routes, middleware, server lifecycle only
- **handlers.js:** Business logic, all endpoint handlers
- **mcp-client.js:** MCP communication wrapper
- **middleware.js:** Reusable middleware functions
- **logger.js:** Logging configuration

## Adding a New Endpoint

1. **Add MCP tool** in `mcp-client.js`:
   ```javascript
   async function newTool() {
     return invokeTool('swarmtrade_new_tool', {});
   }
   ```

2. **Add handler** in `handlers.js`:
   ```javascript
   export async function getNewData(req, res) {
     try {
       const result = await mcpClient.newTool();
       successResponse(res, result, 'Data retrieved');
     } catch (error) {
       errorResponse(res, 'Failed to fetch data', 500, error.message);
     }
   }
   ```

3. **Add route** in `index.js`:
   ```javascript
   app.get('/api/new-endpoint', handlers.getNewData);
   ```

4. **Update documentation:**
   - Add to README.md
   - Add curl example to API_QUICK_REFERENCE.md
   - Update postman collection (if exists)

## Testing

### Manual Testing

```bash
# Start server
npm run dev

# In another terminal
curl http://localhost:3000/health
curl http://localhost:3000/api/portfolio
```

### Testing POST Endpoints

```bash
curl -X POST http://localhost:3000/api/close-trade \
  -H "Content-Type: application/json" \
  -d '{"trade_id": "test-123"}'
```

## Commits

Use clear, descriptive commit messages:

```
✅ Good:
- Add /api/signals endpoint for trading signals
- Fix rate limiting not working in production
- Improve error logging with request context

❌ Avoid:
- Update files
- Fix bug
- WIP
```

Format: `[Type] Brief description`
- `[Feature]` — New endpoint or tool
- `[Fix]` — Bug fix
- `[Docs]` — Documentation changes
- `[Refactor]` — Code restructuring
- `[Test]` — Test additions

## Pull Requests

1. **Create branch** from `main`
2. **Make changes** and test locally
3. **Push to your fork**
4. **Open PR** with clear description
5. **Link issues** if applicable: "Fixes #123"

### PR Checklist

- [ ] Code follows style guide
- [ ] Tests pass (if applicable)
- [ ] Endpoints tested with curl
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Commit messages are clear

## Reporting Issues

Use GitHub Issues with:
- **Clear title:** "Health check fails with degraded status"
- **Description:** What you expected vs. what happened
- **Steps to reproduce:**
  ```
  1. Start server with NODE_ENV=production
  2. Stop MCP server
  3. Call GET /health
  ```
- **Environment:** OS, Node version, etc.
- **Logs:** Include relevant error logs

## Review Process

A maintainer will:
1. Review code style and logic
2. Check for error handling
3. Verify documentation is updated
4. Test the changes
5. Approve and merge, or request changes

## Questions?

- Check existing issues and discussions
- Open a new GitHub Issue with `[Question]` prefix
- Ask in PRs if anything is unclear

---

Thank you for contributing! 🙏
