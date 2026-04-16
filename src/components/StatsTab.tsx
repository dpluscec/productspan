import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getCompletedInstances } from '../db/instances';
import { calculateStats, getPerPeriodRate, Period, StatsResult } from '../utils/stats';
import { ProductWithDetails } from '../db/products';

interface Props {
  product: ProductWithDetails;
}

const PERIODS: Period[] = ['day', 'month', 'year'];

export function StatsTab({ product }: Props) {
  const db = useSQLiteContext();
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCompletedInstances(db, product.id).then((instances) => {
      setStats(calculateStats(instances, product.base_price));
      setLoading(false);
    });
  }, [db, product.id, product.base_price]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!stats) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No completed instances yet.</Text>
        <Text style={styles.emptyHint}>Stop an active instance to see stats.</Text>
      </View>
    );
  }

  const hasPackage = product.package_amount != null && product.package_unit_name != null;
  const unitPerDay = hasPackage ? product.package_amount! / stats.averageDurationDays : null;
  const pricePerDay = stats.avgEffectivePrice != null
    ? stats.avgEffectivePrice / stats.averageDurationDays
    : null;
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.periodToggle}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <StatRow label="Total instances used" value={String(stats.totalInstancesUsed)} />
      <StatRow label="Average duration" value={`${stats.averageDurationDays.toFixed(1)} days`} />
      <StatRow label="Min duration" value={`${stats.minDurationDays.toFixed(1)} days`} />
      <StatRow label="Max duration" value={`${stats.maxDurationDays.toFixed(1)} days`} />
      {hasPackage ? (
        <StatRow
          label="Total amount used"
          value={`${(stats.totalInstancesUsed * product.package_amount!).toFixed(0)} ${product.package_unit_name}`}
        />
      ) : null}
      {stats.totalExpense != null ? (
        <StatRow label="Total expense" value={`$${stats.totalExpense.toFixed(2)}`} />
      ) : null}
      {pricePerDay != null ? (
        <StatRow
          label={`Price / ${periodLabel}`}
          value={`$${getPerPeriodRate(pricePerDay, period).toFixed(2)}`}
        />
      ) : null}
      {unitPerDay != null && hasPackage ? (
        <StatRow
          label={`${product.package_unit_name} / ${periodLabel}`}
          value={`${getPerPeriodRate(unitPerDay, period).toFixed(1)} ${product.package_unit_name}`}
        />
      ) : null}
    </ScrollView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#555' },
  emptyHint: { fontSize: 13, color: '#888', marginTop: 4 },
  periodToggle: {
    flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 10,
    padding: 3, marginBottom: 16, alignSelf: 'flex-start',
  },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  periodBtnActive: { backgroundColor: '#1976d2' },
  periodBtnText: { fontSize: 14, color: '#555' },
  periodBtnTextActive: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e0e0e0',
  },
  rowLabel: { fontSize: 14, color: '#444', flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111' },
});
