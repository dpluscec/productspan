import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, BackHandler, ToastAndroid, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { ProductGridScreenProps } from '../navigation/types';
import { deleteProduct, getProducts, ProductWithDetails } from '../db/products';
import { useAppContext } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';

export function ProductGridScreen({ navigation }: ProductGridScreenProps) {
  const db = useSQLiteContext();
  const { productFilterCategoryIds, productFilterActiveKeys } = useAppContext();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    getProducts(db)
      .then((p) => { setProducts(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [db]);

  useFocusEffect(load);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleLongPress = useCallback((id: number) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const handlePress = useCallback((id: number) => {
    if (selectionMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        return next;
      });
    } else {
      navigation.navigate('ProductDetail', { productId: id });
    }
  }, [selectionMode, navigation]);

  const handleDelete = useCallback(() => {
    const count = selectedIds.size;
    Alert.alert(
      `Delete ${count} product${count === 1 ? '' : 's'}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await db.withTransactionAsync(async () => {
                for (const id of selectedIds) await deleteProduct(db, id);
              });
              exitSelectionMode();
              load();
            } catch {
              Alert.alert('Error', 'Failed to delete. Please try again.');
              load();
            }
          },
        },
      ]
    );
  }, [selectedIds, db, exitSelectionMode, load]);

  const filterActive =
    productFilterCategoryIds.length > 0 || productFilterActiveKeys.length > 0;

  useEffect(() => {
    if (selectionMode) {
      navigation.setOptions({
        title: `${selectedIds.size} selected`,
        headerLeft: () => (
          <TouchableOpacity onPress={exitSelectionMode} style={{ marginLeft: 8 }}>
            <Text style={{ color: '#1976d2', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity testID="trash-button" onPress={handleDelete} style={{ marginRight: 8 }} disabled={selectedIds.size === 0}>
            <Ionicons name="trash-outline" size={24} color={selectedIds.size > 0 ? '#d32f2f' : '#ccc'} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        title: 'My Products',
        headerLeft: undefined,
        headerRight: () => (
          <TouchableOpacity style={{ marginRight: 8 }} onPress={() => navigation.navigate('ProductFilter')}>
            <View>
              <Ionicons name="filter-outline" size={24} color={filterActive ? '#1976d2' : '#555'} />
              {filterActive ? <View style={styles.filterDot} /> : null}
            </View>
          </TouchableOpacity>
        ),
      });
    }
  }, [selectionMode, selectedIds, filterActive, navigation, exitSelectionMode, handleDelete]);

  useEffect(() => {
    if (!selectionMode) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      exitSelectionMode();
    });
    return unsubscribe;
  }, [selectionMode, navigation, exitSelectionMode]);

  const lastBackPress = useRef<number>(0);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectionMode) {
        exitSelectionMode();
        return true;
      }
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPress.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });
    return () => handler.remove();
  }, [selectionMode, exitSelectionMode]));

  const visibleProducts = useMemo(() => {
    let filtered = products;
    if (productFilterCategoryIds.length > 0) {
      const idSet = new Set(productFilterCategoryIds);
      const includeUncategorized = idSet.has(-1);
      filtered = filtered.filter((p) =>
        (includeUncategorized && p.category_id === null) ||
        (p.category_id !== null && idSet.has(p.category_id))
      );
    }
    if (productFilterActiveKeys.length > 0) {
      const keySet = new Set(productFilterActiveKeys);
      filtered = filtered.filter((p) =>
        (keySet.has('active') && p.active_instance_count > 0) ||
        (keySet.has('inactive') && p.active_instance_count === 0)
      );
    }
    return filtered;
  }, [products, productFilterCategoryIds, productFilterActiveKeys]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
            onPress={() => handlePress(item.id)}
            onLongPress={() => handleLongPress(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filterActive ? 'No products match the current filter.' : 'No products yet. Tap + to add one.'}
          </Text>
        }
      />
      {!selectionMode ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddEditProduct', {})}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1 },
  list: { padding: 6 },
  empty: { textAlign: 'center', marginTop: 60, color: '#888', fontSize: 15 },
  filterDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#1976d2',
  },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1976d2', alignItems: 'center', justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
});
