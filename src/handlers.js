import { mcpClient, MCPError } from './mcp-client.js';
import { logger } from './logger.js';

/**
 * Error response helper
 */
function errorResponse(res, message, status = 500, details = null) {
  logger.error(`[API] Error: ${message}`, { status, details });
  res.status(status).json({
    error: message,
    details: details || undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Success response helper
 */
function successResponse(res, data, message = null, status = 200) {
  res.status(status).json({
    success: true,
    message: message || null,
    data,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// READ HANDLERS
// ============================================================================

/**
 * GET /api/portfolio
 */
export async function getPortfolio(req, res) {
  try {
    logger.info('[API] GET /api/portfolio');
    const portfolio = await mcpClient.getPortfolio();
    successResponse(res, portfolio, 'Portfolio retrieved');
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to fetch portfolio', 500, error.message);
    }
  }
}

/**
 * GET /api/status
 */
export async function getStatus(req, res) {
  try {
    logger.info('[API] GET /api/status');
    const status = await mcpClient.getStatus();
    successResponse(res, status, 'Status retrieved');
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to fetch status', 500, error.message);
    }
  }
}

/**
 * GET /api/trades
 * Filters trades from portfolio for easier consumption
 */
export async function getTrades(req, res) {
  try {
    logger.info('[API] GET /api/trades');
    const portfolio = await mcpClient.getPortfolio();

    // Extract trades from portfolio
    const trades = portfolio?.trades || [];

    successResponse(res, {
      total: trades.length,
      trades,
    }, 'Trades retrieved');
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to fetch trades', 500, error.message);
    }
  }
}

/**
 * GET /api/signals
 */
export async function getSignals(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || 20), 100); // Cap at 100
    logger.info(`[API] GET /api/signals (limit: ${limit})`);
    const signals = await mcpClient.getSignals(limit);

    successResponse(res, {
      count: Array.isArray(signals) ? signals.length : 0,
      signals,
    }, 'Signals retrieved');
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to fetch signals', 500, error.message);
    }
  }
}

/**
 * GET /api/deliberations
 */
export async function getDeliberations(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || 10), 100); // Cap at 100
    logger.info(`[API] GET /api/deliberations (limit: ${limit})`);
    const deliberations = await mcpClient.getDeliberations(limit);

    successResponse(res, {
      count: Array.isArray(deliberations) ? deliberations.length : 0,
      deliberations,
    }, 'Deliberations retrieved');
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to fetch deliberations', 500, error.message);
    }
  }
}

// ============================================================================
// WRITE HANDLERS
// ============================================================================

/**
 * POST /api/close-trade
 */
export async function closeTrade(req, res) {
  try {
    const { trade_id } = req.body;
    logger.info(`[API] POST /api/close-trade`, { trade_id });

    const result = await mcpClient.closeTrade(trade_id);
    successResponse(res, result, `Trade ${trade_id} closed`, 200);
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to close trade', 500, error.message);
    }
  }
}

/**
 * POST /api/tighten-stop
 */
export async function tightenStop(req, res) {
  try {
    const { trade_id, new_stop_loss } = req.body;

    // Validate new_stop_loss is a number
    if (typeof new_stop_loss !== 'number' || new_stop_loss <= 0) {
      return errorResponse(res, 'new_stop_loss must be a positive number', 400);
    }

    logger.info(`[API] POST /api/tighten-stop`, { trade_id, new_stop_loss });

    const result = await mcpClient.tightenStopLoss(trade_id, new_stop_loss);
    successResponse(res, result, `Stop loss tightened for trade ${trade_id}`, 200);
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to tighten stop loss', 500, error.message);
    }
  }
}

/**
 * POST /api/pause
 */
export async function pauseTrading(req, res) {
  try {
    logger.info(`[API] POST /api/pause`);

    const result = await mcpClient.pauseTrading();
    successResponse(res, result, 'Trading paused', 200);
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to pause trading', 500, error.message);
    }
  }
}

/**
 * POST /api/resume
 */
export async function resumeTrading(req, res) {
  try {
    logger.info(`[API] POST /api/resume`);

    const result = await mcpClient.resumeTrading();
    successResponse(res, result, 'Trading resumed', 200);
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to resume trading', 500, error.message);
    }
  }
}

/**
 * POST /api/request-trade
 */
export async function requestTrade(req, res) {
  try {
    const { symbol, side, size = null, reason = null } = req.body;

    // Validate side
    if (!['long', 'short'].includes(side)) {
      return errorResponse(res, 'side must be "long" or "short"', 400);
    }

    // Validate size if provided
    if (size !== null && (typeof size !== 'number' || size <= 0)) {
      return errorResponse(res, 'size must be a positive number if provided', 400);
    }

    logger.info(`[API] POST /api/request-trade`, { symbol, side, size, reason });

    const result = await mcpClient.requestTrade(symbol, side, size, reason);
    successResponse(res, result, `Trade request submitted for ${symbol}`, 200);
  } catch (error) {
    if (error instanceof MCPError) {
      errorResponse(res, error.message, error.status);
    } else {
      errorResponse(res, 'Failed to request trade', 500, error.message);
    }
  }
}
