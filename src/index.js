import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './logger.js';
import { mcpClient } from './mcp-client.js';
import { validatePostBody } from './middleware.js';
import * as handlers from './handlers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Body parsing
app.use(express.json());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true,
}));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[API] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

// Rate limiting (10 req/s per IP, burst to 100/minute)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ENV === 'development', // Skip in dev
});
app.use(limiter);

// ============================================================================
// HEALTH & STATUS
// ============================================================================

/**
 * GET /health
 * Simple health check. Returns 200 if server is running.
 */
app.get('/health', async (req, res) => {
  try {
    const isConnected = await mcpClient.ping();
    const status = isConnected ? 'healthy' : 'degraded';
    const statusCode = isConnected ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mcp: {
        connected: isConnected,
        endpoint: process.env.MCP_ENDPOINT || 'default',
      },
      environment: ENV,
    });
  } catch (error) {
    logger.error('[ERROR] Health check failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

// ============================================================================
// API ENDPOINTS - READ (GET)
// ============================================================================

/**
 * GET /api/portfolio
 * Fetch portfolio overview and all open trades
 */
app.get('/api/portfolio', handlers.getPortfolio);

/**
 * GET /api/status
 * Fetch system status (agent states, deliberation count, etc.)
 */
app.get('/api/status', handlers.getStatus);

/**
 * GET /api/trades
 * Fetch list of all trades (filtered view of portfolio)
 */
app.get('/api/trades', handlers.getTrades);

/**
 * GET /api/signals
 * Fetch recent trading signals from all agents
 */
app.get('/api/signals', handlers.getSignals);

/**
 * GET /api/deliberations
 * Fetch recent agent deliberations and synthesis decisions
 */
app.get('/api/deliberations', handlers.getDeliberations);

// ============================================================================
// API ENDPOINTS - WRITE (POST)
// ============================================================================

/**
 * POST /api/close-trade
 * Close an open position by trade ID
 * Body: { trade_id: string }
 */
app.post('/api/close-trade', validatePostBody(['trade_id']), handlers.closeTrade);

/**
 * POST /api/tighten-stop
 * Tighten stop loss for a trade
 * Body: { trade_id: string, new_stop_loss: number }
 */
app.post('/api/tighten-stop', validatePostBody(['trade_id', 'new_stop_loss']), handlers.tightenStop);

/**
 * POST /api/pause
 * Pause trading (agents stop deliberating and placing new trades)
 * Body: {} (no params required)
 */
app.post('/api/pause', handlers.pauseTrading);

/**
 * POST /api/resume
 * Resume trading after pause
 * Body: {} (no params required)
 */
app.post('/api/resume', handlers.resumeTrading);

/**
 * POST /api/request-trade
 * Request a manual trade from the swarm
 * Body: { symbol: string, side: "long"|"short", size?: number, reason?: string }
 */
app.post('/api/request-trade', validatePostBody(['symbol', 'side']), handlers.requestTrade);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404
app.use((req, res) => {
  logger.warn(`[API] 404 - ${req.method} ${req.path}`, { method: req.method, path: req.path });
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('[ERROR] Unhandled error', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: ENV === 'development' ? err.stack : undefined,
  });
});

// ============================================================================
// STARTUP & GRACEFUL SHUTDOWN
// ============================================================================

const server = app.listen(PORT, async () => {
  logger.info(`[API] Server running on port ${PORT}`, { port: PORT, environment: ENV });

  // Test MCP connectivity on startup
  try {
    const connected = await mcpClient.ping();
    if (connected) {
      logger.info('[MCP] Connected to SwarmTrade MCP server');
    } else {
      logger.warn('[MCP] Could not verify MCP server connection');
    }
  } catch (error) {
    logger.error('[MCP] Error testing connection', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('[API] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('[API] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('[API] SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('[API] Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('[ERROR] Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[ERROR] Unhandled rejection', { reason, promise });
  process.exit(1);
});
