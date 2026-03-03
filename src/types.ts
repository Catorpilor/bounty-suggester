import { z } from 'zod';

// Input schema for /v1/suggest
export const SuggestInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
});

export type SuggestInput = z.infer<typeof SuggestInputSchema>;

// Complexity factors that can affect pricing
export const ComplexityFactorSchema = z.enum([
  'tdd_required',
  'deployment_required',
  'api_integration',
  'design_required',
  'database_required',
  'blockchain_integration',
  'testing_extensive',
  'documentation_required',
  'ci_cd_required',
  'security_review',
]);

export type ComplexityFactor = z.infer<typeof ComplexityFactorSchema>;

// Complexity analysis result
export const ComplexityResultSchema = z.object({
  score: z.number().min(0).max(100),
  factors: z.array(z.string()),
});

export type ComplexityResult = z.infer<typeof ComplexityResultSchema>;

// Comparable task from market
export const ComparableTaskSchema = z.object({
  description: z.string(),
  reward: z.number(),
  status: z.string(),
});

export type ComparableTask = z.infer<typeof ComparableTaskSchema>;

// Suggested prices
export const SuggestedPricesSchema = z.object({
  low: z.number(),
  mid: z.number(),
  high: z.number(),
  recommended: z.number(),
});

export type SuggestedPrices = z.infer<typeof SuggestedPricesSchema>;

// Full suggestion response
export const SuggestionResponseSchema = z.object({
  suggested: SuggestedPricesSchema,
  reasoning: z.string(),
  comparables: z.array(ComparableTaskSchema),
  complexity: ComplexityResultSchema,
  confidence: z.number().min(0).max(1),
  freshness: z.string(),
});

export type SuggestionResponse = z.infer<typeof SuggestionResponseSchema>;

// Market stats response
export const MarketStatsResponseSchema = z.object({
  totalTasks: z.number(),
  openTasks: z.number(),
  completedTasks: z.number(),
  averageReward: z.number(),
  medianReward: z.number(),
  minReward: z.number(),
  maxReward: z.number(),
  rewardDistribution: z.object({
    under1: z.number(),
    under10: z.number(),
    under50: z.number(),
    under100: z.number(),
    over100: z.number(),
  }),
  freshness: z.string(),
  cachedAt: z.string(),
});

export type MarketStatsResponse = z.infer<typeof MarketStatsResponseSchema>;

// Raw task from TaskMarket API
export const TaskMarketTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  reward: z.string(),
  status: z.string(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  expiryTime: z.string().optional(),
});

export type TaskMarketTask = z.infer<typeof TaskMarketTaskSchema>;

export const TaskMarketResponseSchema = z.object({
  tasks: z.array(TaskMarketTaskSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean().optional(),
});

export type TaskMarketResponse = z.infer<typeof TaskMarketResponseSchema>;
