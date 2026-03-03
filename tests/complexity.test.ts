import { describe, it, expect } from 'bun:test';
import { calculateComplexity, detectFactors, getComplexityMultiplier } from '../src/complexity';

describe('Complexity Scoring', () => {
  describe('detectFactors', () => {
    it('detects TDD requirement', () => {
      const factors = detectFactors('Build a service with TDD and unit tests');
      expect(factors).toContain('tdd_required');
    });

    it('detects deployment requirement', () => {
      const factors = detectFactors('Deploy to Railway with Docker');
      expect(factors).toContain('deployment_required');
    });

    it('detects API integration', () => {
      const factors = detectFactors('Integrate with external REST API');
      expect(factors).toContain('api_integration');
    });

    it('detects design requirement', () => {
      const factors = detectFactors('Build a responsive dashboard UI');
      expect(factors).toContain('design_required');
    });

    it('detects database requirement', () => {
      const factors = detectFactors('Store data in PostgreSQL database');
      expect(factors).toContain('database_required');
    });

    it('detects blockchain integration', () => {
      const factors = detectFactors('Build x402 payment integration with smart contracts');
      expect(factors).toContain('blockchain_integration');
    });

    it('detects extensive testing requirement', () => {
      const factors = detectFactors('Write 30+ integration tests with full coverage');
      expect(factors).toContain('testing_extensive');
    });

    it('detects multiple factors', () => {
      const description = 'Build a TDD service with PostgreSQL, deploy to Docker, integrate REST API';
      const factors = detectFactors(description);
      expect(factors.length).toBeGreaterThanOrEqual(3);
      expect(factors).toContain('tdd_required');
      expect(factors).toContain('deployment_required');
      expect(factors).toContain('database_required');
    });

    it('returns empty for simple description', () => {
      const factors = detectFactors('Fix a typo in the code');
      expect(factors.length).toBe(0);
    });
  });

  describe('calculateComplexity', () => {
    it('returns low score for simple tasks', () => {
      const result = calculateComplexity('Fix typo');
      expect(result.score).toBeLessThan(30);
      expect(result.factors).toHaveLength(0);
    });

    it('returns medium score for moderate tasks', () => {
      const result = calculateComplexity(
        'Build a simple HTTP API endpoint that returns JSON data. Include error handling and validation. Add proper logging and configuration management. Implement retry logic and circuit breakers.'
      );
      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.score).toBeLessThan(60);
    });

    it('returns high score for complex tasks', () => {
      const result = calculateComplexity(
        'Build a Lucid Agent with x402 payments. Requirements:\n' +
        '- TDD with 30+ tests\n' +
        '- Deploy to Railway with Docker\n' +
        '- PostgreSQL database\n' +
        '- API integration\n' +
        '- Full documentation\n' +
        '- CI/CD pipeline'
      );
      expect(result.score).toBeGreaterThan(50);
      expect(result.factors.length).toBeGreaterThan(3);
    });

    it('includes detected factor names in result', () => {
      const result = calculateComplexity('Build with TDD and deploy to production');
      expect(result.factors).toContain('TDD/Testing Required');
      expect(result.factors).toContain('Deployment Required');
    });

    it('caps score at 100', () => {
      const description = `
        Build a complex blockchain-integrated system with:
        - TDD with 50+ tests
        - Deploy to multiple environments
        - PostgreSQL + Redis databases
        - Multiple API integrations
        - OAuth authentication
        - Full security audit
        - CI/CD with GitHub Actions
        - Complete documentation
        - Responsive dashboard UI
      `;
      const result = calculateComplexity(description);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('getComplexityMultiplier', () => {
    it('returns 0.8 for very low complexity', () => {
      expect(getComplexityMultiplier(10)).toBe(0.8);
    });

    it('returns 1.0 for low complexity', () => {
      expect(getComplexityMultiplier(30)).toBe(1.0);
    });

    it('returns 1.3 for medium complexity', () => {
      expect(getComplexityMultiplier(50)).toBe(1.3);
    });

    it('returns 1.6 for high complexity', () => {
      expect(getComplexityMultiplier(70)).toBe(1.6);
    });

    it('returns 2.0 for very high complexity', () => {
      expect(getComplexityMultiplier(90)).toBe(2.0);
    });
  });
});
