import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { ProductDetailScreenProps } from '../navigation/types';
import { getProduct, ProductWithDetails } from '../db/products';
import { InstancesTab } from '../components/InstancesTab';
import { StatsTab } from '../components/StatsTab';

type Tab = 'instances' | 'stats';

export function ProductDetailScreen({ route, navigation }: ProductDetailScreenProps) {
  const db = useSQLiteContext();
  const { productId } = route.params;
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('instances');
  const [loading, setLoading] = useState(true);

  const loadProduct = useCallback(async () => {
    const p = await getProduct(db, productId);
    setProduct(p);
    setLoading(false);
  }, [db, productId]);

  useFocusEffect(useCallback(() => { loadProduct(); }, [loadProduct]));

  React.useLayoutEffect(() => {
    if (!product) return;
    navigation.setOptions({
      title: product.name,
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('AddEditProduct', { productId })}>
          <Text style={{ color: '#1976d2', marginRight: 8 }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [product, navigation, productId]);

  if (loading || !product) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(['instances', 'stats'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'instances' ? (
        <InstancesTab productId={productId} basePrice={product.base_price} onRefreshProduct={loadProduct} />
      ) : (
        <StatsTab product={product} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#1976d2' },
  tabText: { fontSize: 15, color: '#666' },
  tabTextActive: { color: '#1976d2', fontWeight: '600' },
});
