import { calculateDurationDays, calculateStats, getPerPeriodRate } from '../src/utils/stats';

describe('calculateDurationDays', () => {
  it('returns 1 for a 24-hour span', () => {
    expect(calculateDurationDays('2024-01-01', '2024-01-02')).toBeCloseTo(1, 5);
  });

  it('returns 30 for a 30-day span', () => {
    expect(calculateDurationDays('2024-01-01', '2024-01-31')).toBeCloseTo(30, 5);
  });

  it('returns 1 for same-day usage (start === end)', () => {
    expect(calculateDurationDays('2024-01-01', '2024-01-01')).toBe(1);
  });
});

describe('calculateStats', () => {
  const instances = [
    { started_at: '2024-01-01', ended_at: '2024-02-01', price: 10 },
    { started_at: '2024-03-01', ended_at: '2024-04-01', price: 12 },
  ];

  it('returns null when no completed instances', () => {
    expect(calculateStats([], null)).toBeNull();
  });

  it('calculates total instances used', () => {
    expect(calculateStats(instances, null)!.totalInstancesUsed).toBe(2);
  });

  it('calculates average duration', () => {
    expect(calculateStats(instances, null)!.averageDurationDays).toBeCloseTo(31, 1);
  });

  it('calculates min and max duration', () => {
    const mixed = [
      { started_at: '2024-01-01', ended_at: '2024-01-11', price: null },
      { started_at: '2024-02-01', ended_at: '2024-03-03', price: null },
    ];
    const result = calculateStats(mixed, null)!;
    expect(result.minDurationDays).toBeCloseTo(10, 1);
    expect(result.maxDurationDays).toBeCloseTo(31, 1);
  });

  it('calculates total expense from instance price', () => {
    expect(calculateStats(instances, null)!.totalExpense).toBeCloseTo(22, 5);
  });

  it('uses base price as fallback', () => {
    const noPrice = [{ started_at: '2024-01-01', ended_at: '2024-02-01', price: null }];
    expect(calculateStats(noPrice, 15)!.totalExpense).toBeCloseTo(15, 5);
  });

  it('returns null totalExpense when no price data', () => {
    const noPrice = [{ started_at: '2024-01-01', ended_at: '2024-02-01', price: null }];
    expect(calculateStats(noPrice, null)!.totalExpense).toBeNull();
  });
});

describe('getPerPeriodRate', () => {
  it('returns daily rate for day', () => {
    expect(getPerPeriodRate(2, 'day')).toBeCloseTo(2, 5);
  });

  it('scales to monthly rate', () => {
    expect(getPerPeriodRate(2, 'month')).toBeCloseTo(60.88, 1);
  });

  it('scales to yearly rate', () => {
    expect(getPerPeriodRate(2, 'year')).toBeCloseTo(730, 5);
  });
});
