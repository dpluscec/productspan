import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductWithDetails } from '../db/products';

interface Props {
  product: ProductWithDetails;
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
}

export function ProductListRow({
  product, onPress, onLongPress,
  selectionMode = false, selected = false,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        {product.category_name ? (
          <Text style={styles.category}>{product.category_name}</Text>
        ) : null}
      </View>
      {product.active_instance_count > 0 ? (
        <Text style={styles.active}>{product.active_instance_count} active</Text>
      ) : null}
      {selectionMode ? (
        <View testID="list-selection-overlay" style={styles.selectionCircleWrap}>
          <View style={[styles.selectionCircle, selected && styles.selectionCircleSelected]}>
            {selected ? <Text testID="list-selection-check" style={styles.checkmark}>✓</Text> : null}
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 8, marginVertical: 3,
    borderRadius: 8, padding: 12, elevation: 1,
    borderWidth: 2, borderColor: 'transparent',
  },
  rowSelected: { borderColor: '#1976d2' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111' },
  category: { fontSize: 12, color: '#666', marginTop: 2 },
  active: { fontSize: 12, color: '#2e7d32', marginRight: 8 },
  selectionCircleWrap: { marginLeft: 8 },
  selectionCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#1976d2',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  selectionCircleSelected: { backgroundColor: '#1976d2' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
