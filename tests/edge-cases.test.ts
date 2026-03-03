import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { calculateComplexity, detectFactors } from '../src/complexity';
import { rewardToUSDC, calculateMedian, calculateSimilarity, clearCaches } from '../src/market';

describe('Edge Cases', () => {
  beforeEach(() => {
    clearCaches();
  });

  describe('Complexity Edge Cases', () => {
    it('handles very long descriptions', () => {
      const longDescription = 'Build API. '.repeat(1000);
      const result = calculateComplexity(longDescription);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('handles description with only special characters', () => {
      const result = calculateComplexity('!@#$%^&*()');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.factors).toHaveLength(0);
    });

    it('handles description with unicode characters', () => {
      const result = calculateComplexity('Build API with 日本語 documentation 🚀');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('handles newlines and tabs correctly', () => {
      const description = 'Build\n\tAPI\n\twith\n\ttesting';
      const result = calculateComplexity(description);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('detects TDD variations', () => {
      expect(detectFactors('test-driven development')).toContain('tdd_required');
      expect(detectFactors('tests first approach')).toContain('tdd_required');
      expect(detectFactors('15+ tests required')).toContain('tdd_required');
    });

    it('handles case sensitivity in factor detection', () => {
      expect(detectFactors('TDD REQUIRED')).toContain('tdd_required');
      expect(detectFactors('Deploy to RAILWAY')).toContain('deployment_required');
    });
  });

  describe('Market Rate Edge Cases', () => {
    it('handles extremely large rewards', () => {
      const largeReward = '999999999999999';
      const usdc = rewardToUSDC(largeReward);
      expect(usdc).toBeGreaterThan(0);
      expect(Number.isFinite(usdc)).toBe(true);
    });

    it('handles string numbers with leading zeros', () => {
      const result = rewardToUSDC('0001000000');
      expect(result).toBe(1);
    });

    it('calculates median with duplicates', () => {
      expect(calculateMedian([5, 5, 5])).toBe(5);
      expect(calculateMedian([1, 5, 5, 5, 10])).toBe(5);
    });

    it('calculates median with negative numbers', () => {
      expect(calculateMedian([-5, 0, 5])).toBe(0);
    });

    it('handles similarity with repeated words', () => {
      const s1 = calculateSimilarity('api api api', 'api');
      expect(s1).toBe(1);
    });

    it('handles very long strings for similarity', () => {
      const long1 = 'word '.repeat(500);
      const long2 = 'word '.repeat(500);
      const similarity = calculateSimilarity(long1, long2);
      expect(similarity).toBe(1);
    });
  });

  describe('Minimum Price Guarantees', () => {
    it('ensures minimum suggested prices', async () => {
      // Mock fetch
      global.fetch = mock(async () => {
        return new Response(JSON.stringify({
          tasks: [
            { id: '1', description: 'tiny fix', reward: '100', status: 'completed', tags: [] },
          ],
          hasMore: false,
        }));
      }) as typeof fetch;

      const { suggestPrice } = require('../src/suggester');
      const result = await suggestPrice('Fix a typo');
      
      expect(result.suggested.low).toBeGreaterThanOrEqual(1);
      expect(result.suggested.mid).toBeGreaterThanOrEqual(2);
      expect(result.suggested.high).toBeGreaterThanOrEqual(5);
      expect(result.suggested.recommended).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Confidence Scoring', () => {
    it('has lower confidence with no similar tasks', async () => {
      global.fetch = mock(async () => {
        return new Response(JSON.stringify({
          tasks: [
            { id: '1', description: 'completely unrelated xyz abc', reward: '10000000', status: 'completed', tags: [] },
          ],
          hasMore: false,
        }));
      }) as typeof fetch;

      const { suggestPrice } = require('../src/suggester');
      const result = await suggestPrice('Build quantum computing simulator');
      
      expect(result.confidence).toBeLessThan(0.9);
    });

    it('has higher confidence with many similar tasks', async () => {
      global.fetch = mock(async () => {
        return new Response(JSON.stringify({
          tasks: Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            description: 'Build REST API with TypeScript',
            reward: '25000000',
            status: 'completed',
            tags: [],
          })),
          hasMore: false,
        }));
      }) as typeof fetch;

      const { suggestPrice } = require('../src/suggester');
      const result = await suggestPrice('Build REST API with TypeScript');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe('Price Ordering', () => {
    it('maintains low < mid < high price ordering', async () => {
      global.fetch = mock(async () => {
        return new Response(JSON.stringify({
          tasks: [
            { id: '1', description: 'test task', reward: '25000000', status: 'completed', tags: [] },
          ],
          hasMore: false,
        }));
      }) as typeof fetch;

      const { suggestPrice } = require('../src/suggester');
      const result = await suggestPrice('Build a service');
      
      expect(result.suggested.low).toBeLessThanOrEqual(result.suggested.mid);
      expect(result.suggested.mid).toBeLessThanOrEqual(result.suggested.high);
    });
  });
});
