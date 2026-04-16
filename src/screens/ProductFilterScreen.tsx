import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { ProductFilterScreenProps } from '../navigation/types';

export function ProductFilterScreen({ navigation }: ProductFilterScreenProps) {
  const { categories, productFilterCategoryIds, setProductFilterCategoryIds } = useAppContext();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(productFilterCategoryIds)
  );

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const apply = () => {
    setProductFilterCategoryIds([...selectedIds]);
    navigation.goBack();
  };

  const clear = () => {
    setProductFilterCategoryIds([]);
    navigation.goBack();
  };

  const activeCount = selectedIds.size;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {[{ id: -1, name: 'Uncategorized' }, ...categories].map((c) => {
          const selected = selectedIds.has(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              onPress={() => toggle(c.id)}
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
