import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { ProductFilterScreenProps } from '../navigation/types';

const ACTIVITY_OPTIONS: { key: 'active' | 'inactive'; label: string }[] = [
  { key: 'active', label: 'Has active items' },
  { key: 'inactive', label: 'No active items' },
];

export function ProductFilterScreen({ navigation }: ProductFilterScreenProps) {
  const {
    categories,
    productFilterCategoryIds, setProductFilterCategoryIds,
    productFilterActiveKeys, setProductFilterActiveKeys,
  } = useAppContext();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(productFilterCategoryIds)
  );
  const [selectedActiveKeys, setSelectedActiveKeys] = useState<Set<'active' | 'inactive'>>(
    new Set(productFilterActiveKeys)
  );

  const toggleCategory = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleActiveKey = (key: 'active' | 'inactive') => {
    setSelectedActiveKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const apply = () => {
    setProductFilterCategoryIds([...selectedIds]);
    setProductFilterActiveKeys([...selectedActiveKeys]);
    navigation.goBack();
  };

  const clear = () => {
    setProductFilterCategoryIds([]);
    setProductFilterActiveKeys([]);
    navigation.goBack();
  };

  const activeCount = selectedIds.size + selectedActiveKeys.size;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionHeader}>Activity</Text>
        {ACTIVITY_OPTIONS.map(({ key, label }) => {
          const selected = selectedActiveKeys.has(key);
          return (
            <TouchableOpacity
              key={key}
              style={styles.row}
              onPress={() => toggleActiveKey(key)}
            >
              <Text style={styles.label}>{label}</Text>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionHeader}>Category</Text>
        {[{ id: -1, name: 'Uncategorized' }, ...categories].map((c) => {
          const selected = selectedIds.has(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              onPress={() => toggleCategory(c.id)}
            >
              <Text style={[styles.label, c.id === -1 && styles.labelMuted]}>{c.name}</Text>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {activeCount > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={clear}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.applyBtn} onPress={apply}>
          <Text style={styles.applyBtnText}>
            {activeCount > 0 ? `Apply (${activeCount})` : 'Apply'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { paddingVertical: 8 },
  sectionHeader: {
    fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase',
    letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  label: { fontSize: 16, color: '#111' },
  labelMuted: { color: '#888', fontStyle: 'italic' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footer: {
    flexDirection: 'row', padding: 16, gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee',
  },
  clearBtn: {
    flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  clearBtnText: { fontSize: 16, color: '#555' },
  applyBtn: {
    flex: 2, backgroundColor: '#1976d2', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  applyBtnText: { fontSize: 16, color: '#fff', fontWeight: '600' },
});
