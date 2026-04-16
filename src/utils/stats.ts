export type Period = 'day' | 'month' | 'year';

const PERIOD_DAYS: Record<Period, number> = { day: 1, month: 30.44, year: 365 };

export interface StatsResult {
  totalInstancesUsed: number;
  averageDurationDays: number;
  minDurationDays: number;
  maxDurationDays: number;
  totalExpense: number | null;
  avgEffectivePrice: number | null;
}

export function calculateDurationDays(startedAt: string, endedAt: string): number {
  const diff = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 86400000;
  return Math.max(1, diff);
}

export function calculateStats(
  instances: Array<{ started_at: string; ended_at: string | null; price: number | null }>,
  basePrice: number | null
): StatsResult | null {
  const completed = instances.filter(
    (i): i is typeof i & { ended_at: string } => i.ended_at !== null
  );
  if (completed.length === 0) return null;

  const durations = completed.map((i) => calculateDurationDays(i.started_at, i.ended_at));
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  const effectivePrices = completed
    .map((i) => i.price ?? basePrice)
    .filter((p): p is number => p !== null);

  const totalExpense =
    effectivePrices.length > 0 ? effectivePrices.reduce((a, b) => a + b, 0) : null;

  const avgEffectivePrice =
    effectivePrices.length > 0
      ? effectivePrices.reduce((a, b) => a + b, 0) / effectivePrices.length
      : null;

  return {
    totalInstancesUsed: completed.length,
    averageDurationDays: avgDuration,
    minDurationDays: Math.min(...durations),
    maxDurationDays: Math.max(...durations),
    totalExpense,
    avgEffectivePrice,
  };
}

export function getPerPeriodRate(perDayRate: number, period: Period): number {
  return perDayRate * PERIOD_DAYS[period];
}
