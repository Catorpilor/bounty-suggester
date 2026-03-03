import type { ComplexityResult, ComplexityFactor } from './types';

// Keyword patterns for complexity factors
const FACTOR_PATTERNS: Record<ComplexityFactor, RegExp[]> = {
  tdd_required: [
    /\btdd\b/i,
    /\btest[- ]?driven\b/i,
    /\btests?\s+first\b/i,
    /\bunit\s+tests?\b/i,
    /\btest\s+coverage\b/i,
    /\b\d+\+?\s*tests\b/i,
  ],
  deployment_required: [
    /\bdeploy/i,
    /\brailway\b/i,
    /\bvercel\b/i,
    /\bdocker/i,
    /\bci[/-]?cd\b/i,
    /\bproduction\b/i,
    /\bhosting\b/i,
  ],
  api_integration: [
    /\bapi\s+integration\b/i,
    /\brest\s*api\b/i,
    /\bwebhook/i,
    /\bexternal\s+api\b/i,
    /\bthird[- ]?party\b/i,
    /\boauth\b/i,
  ],
  design_required: [
    /\bdesign\b/i,
    /\bui\b/i,
    /\bux\b/i,
    /\bfrontend\b/i,
    /\bresponsive\b/i,
    /\bmobile\b/i,
    /\bdashboard\b/i,
  ],
  database_required: [
    /\bdatabase\b/i,
    /\bsqlite\b/i,
    /\bpostgres/i,
    /\bmongodb\b/i,
    /\bmysql\b/i,
    /\borm\b/i,
    /\bprisma\b/i,
  ],
  blockchain_integration: [
    /\bblockchain\b/i,
    /\bweb3\b/i,
    /\betherevm\b/i,
    /\bsolana\b/i,
    /\bsmart\s*contract\b/i,
    /\bnft\b/i,
    /\bx402\b/i,
    /\berc[-]?\d+\b/i,
  ],
  testing_extensive: [
    /\b\d{2,}\+?\s*tests\b/i,
    /\bintegration\s+tests?\b/i,
    /\be2e\b/i,
    /\bend[- ]?to[- ]?end\b/i,
    /\bfull\s+coverage\b/i,
  ],
  documentation_required: [
    /\bdocumentation\b/i,
    /\breadme\b/i,
    /\bapi\s+docs\b/i,
    /\btutorial\b/i,
    /\bexamples?\b/i,
  ],
  ci_cd_required: [
    /\bci[/-]?cd\b/i,
    /\bgithub\s+actions\b/i,
    /\bpipeline\b/i,
    /\bworkflow\b/i,
    /\bautomated\s+deploy/i,
  ],
  security_review: [
    /\bsecurity\b/i,
    /\baudit\b/i,
    /\bpentests?\b/i,
    /\bvulnerability/i,
    /\bauthentication\b/i,
    /\bauthorization\b/i,
  ],
};

// Multipliers for each factor
const FACTOR_MULTIPLIERS: Record<ComplexityFactor, number> = {
  tdd_required: 1.3,
  deployment_required: 1.25,
  api_integration: 1.2,
  design_required: 1.2,
  database_required: 1.15,
  blockchain_integration: 1.4,
  testing_extensive: 1.35,
  documentation_required: 1.1,
  ci_cd_required: 1.15,
  security_review: 1.25,
};

// Human-readable factor names
const FACTOR_NAMES: Record<ComplexityFactor, string> = {
  tdd_required: 'TDD/Testing Required',
  deployment_required: 'Deployment Required',
  api_integration: 'API Integration',
  design_required: 'UI/Design Required',
  database_required: 'Database Required',
  blockchain_integration: 'Blockchain/Web3 Integration',
  testing_extensive: 'Extensive Testing (15+)',
  documentation_required: 'Documentation Required',
  ci_cd_required: 'CI/CD Pipeline',
  security_review: 'Security Considerations',
};

/**
 * Calculate base complexity score from description length and structure
 */
function calculateBaseScore(description: string): number {
  const wordCount = description.split(/\s+/).length;
  const lineCount = description.split('\n').filter(l => l.trim()).length;
  
  // Base score from word count (more words = more complex)
  let score = Math.min(30, wordCount / 10);
  
  // Add points for multi-line structured descriptions
  score += Math.min(20, lineCount * 2);
  
  // Add points for bullet points (indicates multiple requirements)
  const bulletCount = (description.match(/^[-*•]\s/gm) || []).length;
  score += Math.min(15, bulletCount * 3);
  
  // Add points for code blocks (technical complexity)
  const codeBlocks = (description.match(/```/g) || []).length / 2;
  score += Math.min(10, codeBlocks * 5);
  
  return Math.min(50, score); // Base score caps at 50
}

/**
 * Detect complexity factors from description
 */
export function detectFactors(description: string): ComplexityFactor[] {
  const detected: ComplexityFactor[] = [];
  
  for (const [factor, patterns] of Object.entries(FACTOR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        detected.push(factor as ComplexityFactor);
        break;
      }
    }
  }
  
  return detected;
}

/**
 * Calculate complexity score for a task description
 */
export function calculateComplexity(description: string): ComplexityResult {
  const baseScore = calculateBaseScore(description);
  const factors = detectFactors(description);
  
  // Calculate multiplier from factors
  let multiplier = 1.0;
  for (const factor of factors) {
    multiplier *= FACTOR_MULTIPLIERS[factor];
  }
  
  // Apply multiplier to base score
  const finalScore = Math.min(100, Math.round(baseScore * multiplier));
  
  // Convert factors to human-readable names
  const factorNames = factors.map(f => FACTOR_NAMES[f]);
  
  return {
    score: finalScore,
    factors: factorNames,
  };
}

/**
 * Get the multiplier for a complexity score (for price calculation)
 */
export function getComplexityMultiplier(score: number): number {
  if (score < 20) return 0.8;
  if (score < 40) return 1.0;
  if (score < 60) return 1.3;
  if (score < 80) return 1.6;
  return 2.0;
}
