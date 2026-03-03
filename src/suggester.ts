import type { SuggestionResponse } from './types';
import { calculateComplexity, getComplexityMultiplier } from './complexity';
import { calculateMarketRate, findSimilarTasks, getCacheStatus } from './market';

/**
 * Generate a bounty price suggestion for a task description
 */
export async function suggestPrice(description: string): Promise<SuggestionResponse> {
  // Calculate complexity
  const complexity = calculateComplexity(description);
  const complexityMultiplier = getComplexityMultiplier(complexity.score);
  
  // Get market rate from similar tasks
  const { median: marketRate, count: similarCount } = await calculateMarketRate(description);
  
  // Find comparable tasks for reference
  const comparables = await findSimilarTasks(description, 5);
  
  // Calculate suggested prices
  const basePrice = marketRate * complexityMultiplier;
  
  const suggested = {
    low: Math.round(basePrice * 0.7 * 100) / 100,
    mid: Math.round(basePrice * 100) / 100,
    high: Math.round(basePrice * 1.4 * 100) / 100,
    recommended: Math.round(basePrice * 100) / 100,
  };
  
  // Ensure minimum prices
  suggested.low = Math.max(1, suggested.low);
  suggested.mid = Math.max(2, suggested.mid);
  suggested.high = Math.max(5, suggested.high);
  suggested.recommended = Math.max(2, suggested.recommended);
  
  // Calculate confidence based on available data
  let confidence = 0.5; // Base confidence
  
  // More similar tasks = higher confidence
  if (similarCount >= 5) confidence += 0.3;
  else if (similarCount >= 2) confidence += 0.2;
  else if (similarCount >= 1) confidence += 0.1;
  
  // Detected factors increase confidence (we understand the task better)
  if (complexity.factors.length >= 3) confidence += 0.15;
  else if (complexity.factors.length >= 1) confidence += 0.1;
  
  confidence = Math.min(0.95, confidence);
  
  // Generate reasoning
  const reasoning = generateReasoning(complexity, similarCount, marketRate, suggested.recommended);
  
  // Determine freshness
  const cacheStatus = getCacheStatus();
  const freshness = cacheStatus.stats.cached 
    ? `cached (${cacheStatus.stats.age}s ago)`
    : 'live';
  
  return {
    suggested,
    reasoning,
    comparables,
    complexity,
    confidence: Math.round(confidence * 100) / 100,
    freshness,
  };
}

/**
 * Generate human-readable reasoning for the suggestion
 */
function generateReasoning(
  complexity: { score: number; factors: string[] },
  similarCount: number,
  marketRate: number,
  recommended: number
): string {
  const parts: string[] = [];
  
  // Complexity explanation
  if (complexity.score < 30) {
    parts.push('This appears to be a relatively straightforward task.');
  } else if (complexity.score < 60) {
    parts.push('This task has moderate complexity.');
  } else {
    parts.push('This is a complex task requiring significant effort.');
  }
  
  // Factors explanation
  if (complexity.factors.length > 0) {
    parts.push(`Key factors identified: ${complexity.factors.join(', ')}.`);
  }
  
  // Market comparison
  if (similarCount > 0) {
    parts.push(
      `Based on ${similarCount} similar completed task${similarCount > 1 ? 's' : ''}, ` +
      `the market rate is approximately $${marketRate.toFixed(2)}.`
    );
  } else {
    parts.push(
      'No closely similar tasks found in the market. ' +
      'Using overall market median as baseline.'
    );
  }
  
  // Final recommendation
  parts.push(
    `Recommended price: $${recommended.toFixed(2)} USDC. ` +
    'Adjust based on urgency and specific requirements.'
  );
  
  return parts.join(' ');
}
