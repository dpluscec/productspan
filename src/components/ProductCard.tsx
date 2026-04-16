import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductWithDetails } from '../db/products';

interface Props {
  product: ProductWithDetails;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {product.photo_uri ? (
        <Image source={{ uri: product.photo_uri }} style={styles.photo} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📦</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      {product.category_name ? (
        <Text style={styles.category}>{product.category_name}</Text>
      ) : null}
      {product.active_instance_count > 0 ? (
        <Text style={styles.active}>{product.active_instance_count} active</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, margin: 6, backgroundColor: '#fff',
    borderRadius: 10, padding: 10, elevation: 2,
  },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 8 },
  placeholder: {
    width: '100%', aspectRatio: 1, backgroundColor: '#f0f0f0',
    borderRadius: 8, marginBottom: 8, alignItems: 'center', justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 40 },
  name: { fontSize: 14, fontWeight: '600', color: '#111' },
  category: { fontSize: 12, color: '#666', marginTop: 2 },
  active: { fontSize: 12, color: '#2e7d32', marginTop: 2 },
});
