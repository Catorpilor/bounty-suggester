import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { Hono } from 'hono';
import { SuggestInputSchema, SuggestionResponseSchema, MarketStatsResponseSchema } from '../src/types';

// Mock the market API
const mockTasks = [
  { id: '1', description: 'Build a REST API with TypeScript', reward: '25000000', status: 'completed', tags: [] },
  { id: '2', description: 'Create a React dashboard', reward: '50000000', status: 'completed', tags: [] },
  { id: '3', description: 'Write unit tests for API', reward: '10000000', status: 'completed', tags: [] },
  { id: '4', description: 'Deploy to production', reward: '15000000', status: 'open', tags: [] },
  { id: '5', description: 'Build TypeScript service', reward: '30000000', status: 'accepted', tags: [] },
];

// Create a test app without x402 middleware
const createTestApp = () => {
  const { suggestPrice } = require('../src/suggester');
  const { getMarketStats } = require('../src/market');
  
  const app = new Hono();
  
  app.get('/health', (c) => {
    return c.json({ status: 'ok', service: 'bounty-suggester' });
  });
  
  app.post('/v1/suggest', async (c) => {
    const body = await c.req.json();
    const result = SuggestInputSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.issues }, 400);
    }
    const suggestion = await suggestPrice(result.data.description);
    return c.json(suggestion);
  });
  
  app.get('/v1/market/stats', async (c) => {
    const stats = await getMarketStats();
    return c.json(stats);
  });
  
  return app;
};

describe('API Endpoints', () => {
  let app: Hono;
  
  beforeAll(() => {
    // Mock fetch for TaskMarket API
    global.fetch = mock(async (url: string) => {
      if (url.includes('api-market.daydreams.systems')) {
        return new Response(JSON.stringify({ tasks: mockTasks, hasMore: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;
    
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('returns ok status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('bounty-suggester');
    });
  });

  describe('POST /v1/suggest', () => {
    it('returns suggestion for valid input', async () => {
      const res = await app.request('/v1/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Build a REST API with TypeScript' }),
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      
      // Validate response structure
      const validation = SuggestionResponseSchema.safeParse(data);
      expect(validation.success).toBe(true);
      
      expect(data.suggested).toBeDefined();
      expect(data.suggested.low).toBeGreaterThan(0);
      expect(data.suggested.mid).toBeGreaterThan(0);
      expect(data.suggested.high).toBeGreaterThan(0);
      expect(data.suggested.recommended).toBeGreaterThan(0);
      expect(data.reasoning).toBeDefined();
      expect(data.complexity).toBeDefined();
      expect(data.confidence).toBeGreaterThanOrEqual(0);
      expect(data.confidence).toBeLessThanOrEqual(1);
    });

    it('returns 400 for missing description', async () => {
      const res = await app.request('/v1/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid input');
    });

    it('returns 400 for empty description', async () => {
      const res = await app.request('/v1/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: '' }),
      });
      
      expect(res.status).toBe(400);
    });

    it('handles complex task descriptions', async () => {
      const res = await app.request('/v1/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Build a Lucid Agent with x402 payments.
            Requirements:
            - TDD with 30+ tests
            - Deploy to Railway with Docker
            - PostgreSQL database
            - API integration
            - Full documentation`,
        }),
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data.complexity.score).toBeGreaterThan(30);
      expect(data.complexity.factors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/market/stats', () => {
    it('returns market statistics', async () => {
      const res = await app.request('/v1/market/stats');
      expect(res.status).toBe(200);
      
      const data = await res.json();
      
      // Validate response structure
      const validation = MarketStatsResponseSchema.safeParse(data);
      expect(validation.success).toBe(true);
      
      expect(data.totalTasks).toBeGreaterThanOrEqual(0);
      expect(data.averageReward).toBeGreaterThanOrEqual(0);
      expect(data.medianReward).toBeGreaterThanOrEqual(0);
      expect(data.rewardDistribution).toBeDefined();
    });

    it('includes reward distribution', async () => {
      const res = await app.request('/v1/market/stats');
      const data = await res.json();
      
      expect(data.rewardDistribution).toHaveProperty('under1');
      expect(data.rewardDistribution).toHaveProperty('under10');
      expect(data.rewardDistribution).toHaveProperty('under50');
      expect(data.rewardDistribution).toHaveProperty('under100');
      expect(data.rewardDistribution).toHaveProperty('over100');
    });
  });
});

describe('Input Validation', () => {
  describe('SuggestInputSchema', () => {
    it('accepts valid input', () => {
      const result = SuggestInputSchema.safeParse({ description: 'Build an API' });
      expect(result.success).toBe(true);
    });

    it('rejects missing description', () => {
      const result = SuggestInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty description', () => {
      const result = SuggestInputSchema.safeParse({ description: '' });
      expect(result.success).toBe(false);
    });

    it('rejects non-string description', () => {
      const result = SuggestInputSchema.safeParse({ description: 123 });
      expect(result.success).toBe(false);
    });
  });
});
