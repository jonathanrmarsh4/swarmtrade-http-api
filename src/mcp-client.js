import axios from 'axios';
import { logger } from './logger.js';

/**
 * MCP Client
 * Wraps axios calls to the SwarmTrade MCP server.
 * Handles connection, tool invocation, and error mapping.
 */

const MCP_ENDPOINT = process.env.MCP_ENDPOINT || 'http://localhost:3001';
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || null;

const axiosInstance = axios.create({
  baseURL: MCP_ENDPOINT,
  timeout: 30000, // 30s timeout for MCP calls
  headers: {
    'Content-Type': 'application/json',
    ...(MCP_AUTH_TOKEN && { Authorization: `Bearer ${MCP_AUTH_TOKEN}` }),
  },
});

// Add request/response interceptors for logging
axiosInstance.interceptors.request.use(
  (config) => {
    logger.debug(`[MCP] Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('[MCP] Request error', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    logger.debug(`[MCP] Response: ${response.status} ${response.statusText}`);
    return response;
  },
  (error) => {
    logger.error('[MCP] Response error', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

/**
 * Generic tool invocation wrapper
 * Calls POST /tools/:toolName with params
 */
async function invokeTool(toolName, params = {}) {
  try {
    logger.debug(`[MCP] Invoking tool: ${toolName}`, { params });
    const response = await axiosInstance.post(`/tools/${toolName}`, params);
    return response.data;
  } catch (error) {
    logger.error(`[MCP] Tool invocation failed: ${toolName}`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    throw new MCPError(
      `Tool ${toolName} failed: ${error.response?.data?.error || error.message}`,
      error.response?.status || 500
    );
  }
}

/**
 * Custom error class for MCP failures
 */
export class MCPError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'MCPError';
    this.status = status;
  }
}

/**
 * Health check / ping
 */
export async function ping() {
  try {
    const response = await axiosInstance.get('/health');
    return response.status === 200;
  } catch (error) {
    logger.warn('[MCP] Ping failed', error.message);
    return false;
  }
}

// ============================================================================
// EXPORTED MCP TOOLS
// ============================================================================

export const mcpClient = {
  ping,

  /**
   * swarmtrade_get_portfolio
   * Fetch portfolio overview and all open trades
   */
  async getPortfolio() {
    return invokeTool('swarmtrade_get_portfolio', {});
  },

  /**
   * swarmtrade_get_status
   * Fetch system status
   */
  async getStatus() {
    return invokeTool('swarmtrade_get_status', {});
  },

  /**
   * swarmtrade_get_signals
   * Get recent trading signals
   */
  async getSignals(limit = 20) {
    return invokeTool('swarmtrade_get_signals', { limit });
  },

  /**
   * swarmtrade_get_deliberations
   * Get recent agent deliberations
   */
  async getDeliberations(limit = 10) {
    return invokeTool('swarmtrade_get_deliberations', { limit });
  },

  /**
   * swarmtrade_close_trade
   * Close an open trade by ID
   */
  async closeTrade(tradeId) {
    return invokeTool('swarmtrade_close_trade', { trade_id: tradeId });
  },

  /**
   * swarmtrade_tighten_stop_loss
   * Tighten stop loss for a trade
   */
  async tightenStopLoss(tradeId, newStopLoss) {
    return invokeTool('swarmtrade_tighten_stop_loss', {
      trade_id: tradeId,
      new_stop_loss: newStopLoss,
    });
  },

  /**
   * swarmtrade_pause_trading
   * Pause trading (pause agent deliberation)
   */
  async pauseTrading() {
    return invokeTool('swarmtrade_pause_trading', {});
  },

  /**
   * swarmtrade_resume_trading
   * Resume trading (resume agent deliberation)
   */
  async resumeTrading() {
    return invokeTool('swarmtrade_resume_trading', {});
  },

  /**
   * swarmtrade_request_trade
   * Request a manual trade
   */
  async requestTrade(symbol, side, size = null, reason = null) {
    const params = { symbol, side };
    if (size !== null && size !== undefined) params.size = size;
    if (reason) params.reason = reason;
    return invokeTool('swarmtrade_request_trade', params);
  },
};

export default mcpClient;
