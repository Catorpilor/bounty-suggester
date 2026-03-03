import { config } from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { paymentMiddlewareFromConfig } from '@x402/hono';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';

import { SuggestInputSchema } from './types';
import { suggestPrice } from './suggester';
import { getMarketStats, getCacheStatus } from './market';

config();

const PORT = parseInt(process.env.PORT || '3403');
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS as `0x${string}`;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.payai.network';
const NETWORK = process.env.NETWORK || 'eip155:8453'; // Base Mainnet

if (!PAYMENT_ADDRESS) {
  console.error('❌ PAYMENT_ADDRESS environment variable is required');
  process.exit(1);
}

const app = new Hono();

// CORS for API access
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Payment-Response', 'X-PAYMENT', 'PAYMENT-SIGNATURE'],
  exposeHeaders: ['X-Payment-Response', 'WWW-Authenticate', 'PAYMENT-REQUIRED', 'PAYMENT-RESPONSE'],
}));

// Health check (FREE)
app.get('/health', (c) => {
  const cacheStatus = getCacheStatus();
  return c.json({
    status: 'ok',
    service: 'bounty-suggester',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    cache: cacheStatus,
  });
});

// Agent manifest for xgate.run discovery
app.get('/.well-known/agent.json', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    name: 'Bounty Price Suggester',
    version: '1.0.0',
    description: 'AI-powered pricing suggestions for TaskMarket bounties. Analyzes task complexity and market rates to recommend optimal USDC rewards.',
    url: baseUrl,
    payment: {
      network: NETWORK,
      address: PAYMENT_ADDRESS,
      facilitator: FACILITATOR_URL,
    },
    endpoints: [
      {
        method: 'POST',
        path: '/v1/suggest',
        description: 'Get optimal bounty price suggestions for a task description',
        price: '$0.002',
        input: { description: 'string' },
        output: {
          suggested: { low: 'number', mid: 'number', high: 'number', recommended: 'number' },
          reasoning: 'string',
          comparables: 'array',
          complexity: { score: 'number', factors: 'array' },
          confidence: 'number',
          freshness: 'string',
        },
      },
      {
        method: 'GET',
        path: '/v1/market/stats',
        description: 'Get current TaskMarket pricing statistics',
        price: '$0.001',
        output: {
          totalTasks: 'number',
          completedTasks: 'number',
          averageReward: 'number',
          medianReward: 'number',
          rewardRange: { min: 'number', max: 'number' },
          cachedAt: 'string',
        },
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Health check',
        price: 'free',
      },
    ],
    tags: ['pricing', 'taskmarket', 'bounty', 'ai', 'x402'],
    author: 'Catorpilor',
    repository: 'https://github.com/Catorpilor/bounty-suggester',
  });
});

// Landing page
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html>
<head>
  <title>Bounty Price Suggester</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #e0e0e0; }
    h1 { color: #4ade80; }
    pre { background: #1a1a1a; padding: 15px; border-radius: 8px; overflow-x: auto; }
    code { color: #fbbf24; }
    .endpoint { background: #1a1a2e; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 3px solid #4ade80; }
    .price { color: #60a5fa; font-weight: bold; }
  </style>
</head>
<body>
  <h1>💰 Bounty Price Suggester</h1>
  <p>AI-powered pricing suggestions for TaskMarket bounties using x402 micropayments.</p>
  
  <h2>Endpoints</h2>
  
  <div class="endpoint">
    <h3>POST /v1/suggest</h3>
    <p>Get optimal bounty price suggestions for a task description.</p>
    <p>Price: <span class="price">$0.002 USDC</span> per call</p>
    <pre><code>curl -X POST ${new URL(c.req.url).origin}/v1/suggest \\
  -H "Content-Type: application/json" \\
  -d '{"description": "Build a REST API with TypeScript"}'</code></pre>
  </div>
  
  <div class="endpoint">
    <h3>GET /v1/market/stats</h3>
    <p>Get current market pricing statistics.</p>
    <p>Price: <span class="price">$0.001 USDC</span> per call</p>
    <pre><code>curl ${new URL(c.req.url).origin}/v1/market/stats</code></pre>
  </div>
  
  <div class="endpoint">
    <h3>GET /health</h3>
    <p>Health check endpoint.</p>
    <p>Price: <span class="price">FREE</span></p>
  </div>
  
  <h2>x402 Payment</h2>
  <p>Payments are handled via the x402 protocol on Base mainnet (USDC).</p>
  <p>Payment address: <code>${PAYMENT_ADDRESS}</code></p>
  <p>Network: <code>${NETWORK}</code></p>
  
  <h2>Source</h2>
  <p><a href="https://github.com/Catorpilor/bounty-suggester" style="color: #60a5fa;">GitHub Repository</a></p>
</body>
</html>
  `);
});

// Setup x402 payment middleware
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

const paidRoutes = {
  'POST /v1/suggest': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.002',
        network: NETWORK,
        payTo: PAYMENT_ADDRESS,
      },
    ],
    description: 'Get bounty price suggestions ($0.002 USDC)',
    mimeType: 'application/json',
  },
  'GET /v1/market/stats': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.001',
        network: NETWORK,
        payTo: PAYMENT_ADDRESS,
      },
    ],
    description: 'Get market statistics ($0.001 USDC)',
    mimeType: 'application/json',
  },
};

const evmScheme = new ExactEvmScheme();

// Apply payment middleware
app.use(paymentMiddlewareFromConfig(
  paidRoutes,
  facilitatorClient,
  [{ network: NETWORK, server: evmScheme }]
));

// POST /v1/suggest - Get price suggestion
app.post('/v1/suggest', async (c) => {
  try {
    const body = await c.req.json();
    const result = SuggestInputSchema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        error: 'Invalid input',
        details: result.error.issues,
      }, 400);
    }
    
    const suggestion = await suggestPrice(result.data.description);
    return c.json(suggestion);
  } catch (error) {
    console.error('Error in /v1/suggest:', error);
    return c.json({
      error: 'Failed to generate suggestion',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// GET /v1/market/stats - Get market statistics
app.get('/v1/market/stats', async (c) => {
  try {
    const stats = await getMarketStats();
    return c.json(stats);
  } catch (error) {
    console.error('Error in /v1/market/stats:', error);
    return c.json({
      error: 'Failed to fetch market stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Error handler
app.onError((err, c) => {
  console.error('❌ Unhandled error:', err);
  return c.json({ error: err.message }, 500);
});

console.log(`💰 Bounty Price Suggester running at http://localhost:${PORT}`);
console.log(`💳 Payment address: ${PAYMENT_ADDRESS}`);
console.log(`🔗 Network: ${NETWORK}`);
console.log(`📡 Facilitator: ${FACILITATOR_URL}`);
console.log(`📊 Endpoints:`);
console.log(`   POST /v1/suggest     - $0.002 per call`);
console.log(`   GET  /v1/market/stats - $0.001 per call`);
console.log(`   GET  /health         - free`);

// Export for Bun.serve() auto-start
export default {
  port: PORT,
  fetch: app.fetch,
};
