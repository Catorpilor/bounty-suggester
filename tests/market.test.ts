import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import {
  rewardToUSDC,
  calculateMedian,
  calculateSimilarity,
  clearCaches,
  getCacheStatus,
} from '../src/market';

describe('Market Service', () => {
  beforeEach(() => {
    clearCaches();
  });

  describe('rewardToUSDC', () => {
    it('converts reward string to USDC', () => {
      expect(rewardToUSDC('1000000')).toBe(1);
      expect(rewardToUSDC('500000')).toBe(0.5);
      expect(rewardToUSDC('25000000')).toBe(25);
    });

    it('handles large rewards', () => {
      expect(rewardToUSDC('100000000')).toBe(100);
      expect(rewardToUSDC('1000000000')).toBe(1000);
    });

    it('handles zero', () => {
      expect(rewardToUSDC('0')).toBe(0);
    });

    it('handles decimal precision', () => {
      expect(rewardToUSDC('123456')).toBeCloseTo(0.123456, 5);
    });
  });

  describe('calculateMedian', () => {
    it('calculates median of odd-length array', () => {
      expect(calculateMedian([1, 2, 3])).toBe(2);
      expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3);
    });

    it('calculates median of even-length array', () => {
      expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
      expect(calculateMedian([1, 2])).toBe(1.5);
    });

    it('handles single element', () => {
      expect(calculateMedian([5])).toBe(5);
    });

    it('handles empty array', () => {
      expect(calculateMedian([])).toBe(0);
    });

    it('sorts values correctly', () => {
      expect(calculateMedian([5, 1, 3])).toBe(3);
      expect(calculateMedian([100, 1, 50, 25])).toBe(37.5);
    });
  });

  describe('calculateSimilarity', () => {
    it('returns 1 for identical strings', () => {
      const similarity = calculateSimilarity('build api', 'build api');
      expect(similarity).toBe(1);
    });

    it('returns 0 for completely different strings', () => {
      const similarity = calculateSimilarity('abc xyz', 'def uvw');
      expect(similarity).toBe(0);
    });

    it('returns partial similarity for overlapping words', () => {
      const similarity = calculateSimilarity(
        'build rest api with typescript',
        'create rest api using javascript'
      );
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('is case insensitive', () => {
      const s1 = calculateSimilarity('Build API', 'build api');
      expect(s1).toBe(1);
    });

    it('ignores punctuation', () => {
      const s1 = calculateSimilarity('Build an API!', 'Build an API');
      expect(s1).toBe(1);
    });

    it('ignores short words (<=2 chars)', () => {
      const s1 = calculateSimilarity('a the an', 'build api');
      expect(s1).toBe(0);
    });

    it('handles empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(0);
      expect(calculateSimilarity('test', '')).toBe(0);
    });
  });

  describe('getCacheStatus', () => {
    it('reports no cache initially', () => {
      const status = getCacheStatus();
      expect(status.tasks.cached).toBe(false);
      expect(status.stats.cached).toBe(false);
      expect(status.tasks.age).toBeUndefined();
      expect(status.stats.age).toBeUndefined();
    });
  });

  describe('clearCaches', () => {
    it('clears cache status', () => {
      // After clearing, cache should report as empty
      clearCaches();
      const status = getCacheStatus();
      expect(status.tasks.cached).toBe(false);
      expect(status.stats.cached).toBe(false);
    });
  });
});
