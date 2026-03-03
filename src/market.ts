import type {
  TaskMarketTask,
  TaskMarketResponse,
  ComparableTask,
  MarketStatsResponse,
} from './types';
import { TaskMarketResponseSchema } from './types';

const TASKMARKET_API_URL =
  process.env.TASKMARKET_API_URL ||
  'https://api-market.daydreams.systems/api/tasks';

// Cache for market data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let tasksCache: CacheEntry<TaskMarketTask[]> | null = null;
let statsCache: CacheEntry<MarketStatsResponse> | null = null;

/**
 * Fetch all tasks from TaskMarket API (with pagination)
 */
export async function fetchAllTasks(): Promise<TaskMarketTask[]> {
  // Check cache
  if (tasksCache && Date.now() - tasksCache.timestamp < CACHE_TTL_MS) {
    return tasksCache.data;
  }

  const allTasks: TaskMarketTask[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const url = cursor
      ? `${TASKMARKET_API_URL}?cursor=${cursor}`
      : TASKMARKET_API_URL;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TaskMarket API error: ${response.status}`);
    }

    const data = (await response.json()) as TaskMarketResponse;
    const parsed = TaskMarketResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.warn('TaskMarket API response validation warning:', parsed.error);
      // Continue with raw data if validation fails
    }

    allTasks.push(...data.tasks);
    cursor = data.nextCursor;
    hasMore = Boolean(data.hasMore && cursor);

    // Safety limit - don't fetch more than 500 tasks
    if (allTasks.length > 500) {
      break;
    }
  }

  // Update cache
  tasksCache = { data: allTasks, timestamp: Date.now() };
  return allTasks;
}

/**
 * Convert reward string (in smallest units) to USDC
 */
export function rewardToUSDC(reward: string): number {
  // Reward is in 6 decimal units (USDC)
  return Number(reward) / 1_000_000;
}

/**
 * Calculate median of an array of numbers
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate similarity between two task descriptions
 */
export function calculateSimilarity(desc1: string, desc2: string): number {
  // Tokenize and normalize
  const tokenize = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  };

  const tokens1 = tokenize(desc1);
  const tokens2 = tokenize(desc2);

  // Calculate Jaccard similarity
  let intersection = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersection++;
    }
  }

  const union = tokens1.size + tokens2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Find similar completed tasks
 */
export async function findSimilarTasks(
  description: string,
  limit: number = 5
): Promise<ComparableTask[]> {
  const tasks = await fetchAllTasks();

  // Score each task by similarity
  const scored = tasks
    .filter((t) => t.status === 'completed' || t.status === 'accepted')
    .map((t) => ({
      task: t,
      similarity: calculateSimilarity(description, t.description),
    }))
    .filter((s) => s.similarity > 0.05)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored.map((s) => ({
    description:
      s.task.description.length > 200
        ? s.task.description.slice(0, 200) + '...'
        : s.task.description,
    reward: rewardToUSDC(s.task.reward),
    status: s.task.status,
  }));
}

/**
 * Calculate median reward of similar tasks
 */
export async function calculateMarketRate(
  description: string
): Promise<{ median: number; count: number }> {
  const tasks = await fetchAllTasks();

  // Find similar completed tasks
  const similarTasks = tasks
    .filter((t) => t.status === 'completed' || t.status === 'accepted')
    .map((t) => ({
      task: t,
      similarity: calculateSimilarity(description, t.description),
    }))
    .filter((s) => s.similarity > 0.05);

  if (similarTasks.length === 0) {
    // Fall back to overall median
    const completedTasks = tasks.filter(
      (t) => t.status === 'completed' || t.status === 'accepted'
    );
    const rewards = completedTasks.map((t) => rewardToUSDC(t.reward));
    return {
      median: calculateMedian(rewards) || 25, // Default to $25 if no data
      count: 0,
    };
  }

  const rewards = similarTasks.map((s) => rewardToUSDC(s.task.reward));
  return {
    median: calculateMedian(rewards),
    count: similarTasks.length,
  };
}

/**
 * Get current market statistics
 */
export async function getMarketStats(): Promise<MarketStatsResponse> {
  // Check cache
  if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL_MS) {
    return statsCache.data;
  }

  const tasks = await fetchAllTasks();
  const rewards = tasks.map((t) => rewardToUSDC(t.reward));

  const openTasks = tasks.filter((t) => t.status === 'open').length;
  const completedTasks = tasks.filter(
    (t) => t.status === 'completed' || t.status === 'accepted'
  ).length;

  const stats: MarketStatsResponse = {
    totalTasks: tasks.length,
    openTasks,
    completedTasks,
    averageReward:
      rewards.length > 0
        ? Math.round((rewards.reduce((a, b) => a + b, 0) / rewards.length) * 100) / 100
        : 0,
    medianReward: Math.round(calculateMedian(rewards) * 100) / 100,
    minReward: rewards.length > 0 ? Math.min(...rewards) : 0,
    maxReward: rewards.length > 0 ? Math.max(...rewards) : 0,
    rewardDistribution: {
      under1: rewards.filter((r) => r < 1).length,
      under10: rewards.filter((r) => r >= 1 && r < 10).length,
      under50: rewards.filter((r) => r >= 10 && r < 50).length,
      under100: rewards.filter((r) => r >= 50 && r < 100).length,
      over100: rewards.filter((r) => r >= 100).length,
    },
    freshness: 'live',
    cachedAt: new Date().toISOString(),
  };

  // Update cache
  statsCache = { data: stats, timestamp: Date.now() };
  return stats;
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus(): {
  tasks: { cached: boolean; age?: number };
  stats: { cached: boolean; age?: number };
} {
  const now = Date.now();
  return {
    tasks: {
      cached: !!tasksCache,
      age: tasksCache ? Math.round((now - tasksCache.timestamp) / 1000) : undefined,
    },
    stats: {
      cached: !!statsCache,
      age: statsCache ? Math.round((now - statsCache.timestamp) / 1000) : undefined,
    },
  };
}

/**
 * Clear caches (for testing)
 */
export function clearCaches(): void {
  tasksCache = null;
  statsCache = null;
}
