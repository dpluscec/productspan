# Product Grid Multi-Select & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users long-press a product card to enter selection mode, select multiple products, and delete them via a header trash button.

**Architecture:** Selection state (`selectionMode`, `selectedIds`) lives in `ProductGridScreen`. `ProductCard` receives selection props and renders a visual overlay. The header is swapped dynamically via `navigation.setOptions` when selection mode changes. `deleteProduct` (already in `src/db/products.ts`) is called once per selected id.

**Tech Stack:** React Native, TypeScript, `@testing-library/react-native`, `expo-sqlite`

---

### Task 1: Update `ProductCard` to support selection mode

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Create: `src/components/__tests__/ProductCard.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/components/__tests__/ProductCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { ProductWithDetails } from '../../db/products';

const baseProduct: ProductWithDetails = {
  id: 1,
  name: 'Shampoo',
  category_id: null,
  category_name: null,
  photo_uri: null,
  package_amount: null,
  package_unit_id: null,
  package_unit_name: null,
  base_price: null,
  active_instance_count: 0,
};

describe('ProductCard', () => {
  it('calls onPress when tapped in normal mode', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ProductCard product={baseProduct} onPress={onPress} onLongPress={() => {}} selectionMode={false} selected={false} />
    );
    fireEvent.press(getByText('Shampoo'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not show selection overlay when selectionMode is false', () => {
    const { queryByTestId } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={() => {}} selectionMode={false} selected={false} />
    );
    expect(queryByTestId('selection-overlay')).toBeNull();
  });

  it('shows unselected circle when selectionMode is true and selected is false', () => {
    const { getByTestId } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={() => {}} selectionMode={true} selected={false} />
    );
    expect(getByTestId('selection-overlay')).toBeTruthy();
    expect(getByTestId('selection-check')).toBeFalsy();
  });

  it('shows checkmark when selectionMode is true and selected is true', () => {
    const { getByTestId } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={() => {}} selectionMode={true} selected={true} />
    );
    expect(getByTestId('selection-check')).toBeTruthy();
  });

  it('calls onLongPress when long pressed', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={onLongPress} selectionMode={false} selected={false} />
    );
    fireEvent(getByText('Shampoo'), 'longPress');
    expect(onLongPress).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/components/__tests__/ProductCard.test.tsx --no-coverage
```

Expected: FAIL — `ProductCard` does not accept `selectionMode`, `selected`, or `onLongPress` props yet.

- [ ] **Step 3: Update `ProductCard`**

```tsx
// src/components/ProductCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductWithDetails } from '../db/products';

interface Props {
  product: ProductWithDetails;
  onPress: () => void;
  onLongPress: () => void;
  selectionMode: boolean;
  selected: boolean;
}

export function ProductCard({ product, onPress, onLongPress, selectionMode, selected }: Props) {
  return (
    <TouchableOpacity style={[styles.card, selected && styles.cardSelected]} onPress={onPress} onLongPress={onLongPress}>
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

      {selectionMode ? (
        <View testID="selection-overlay" style={styles.selectionOverlay}>
          <View style={[styles.selectionCircle, selected && styles.selectionCircleSelected]}>
            {selected ? <Text testID="selection-check" style={styles.checkmark}>✓</Text> : null}
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, margin: 6, backgroundColor: '#fff',
    borderRadius: 10, padding: 10, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#1976d2',
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
  selectionOverlay: {
    position: 'absolute', top: 6, right: 6,
  },
  selectionCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#1976d2',
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  selectionCircleSelected: {
    backgroundColor: '#1976d2',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/components/__tests__/ProductCard.test.tsx --no-coverage
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductCard.tsx src/components/__tests__/ProductCard.test.tsx
git commit -m "feat: add selection mode overlay to ProductCard"
```

---

### Task 2: Add selection state and delete logic to `ProductGridScreen`

**Files:**
- Modify: `src/screens/ProductGridScreen.tsx`
- Create: `src/screens/__tests__/ProductGridScreen.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// src/screens/__tests__/ProductGridScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductGridScreen } from '../ProductGridScreen';

// Mock dependencies
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => { cb(); },
}));

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
};

const mockProducts = [
  { id: 1, name: 'Shampoo', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 0 },
  { id: 2, name: 'Soap', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 0 },
];

jest.mock('../../db/products', () => ({
  getProducts: jest.fn().mockResolvedValue(mockProducts),
  deleteProduct: jest.fn().mockResolvedValue(undefined),
}));

import { getProducts, deleteProduct } from '../../db/products';

describe('ProductGridScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders product cards', async () => {
    const { getByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    expect(getByText('Soap')).toBeTruthy();
  });

  it('enters selection mode on long press and selects the card', async () => {
    const { getByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    fireEvent(getByText('Shampoo'), 'longPress');
    // setOptions should be called with "1 selected" title
    expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({
      title: '1 selected',
    }));
  });

  it('deletes selected products on confirmation', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const confirm = buttons?.find((b: any) => b.style !== 'cancel');
      confirm?.onPress?.();
    });

    const { getByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    fireEvent(getByText('Shampoo'), 'longPress');

    // Trigger delete via the header button captured in setOptions
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    lastCall.headerRight?.().props.onPress();

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith({}, 1));
    expect(getProducts).toHaveBeenCalledTimes(2); // initial load + reload after delete
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/screens/__tests__/ProductGridScreen.test.tsx --no-coverage
```

Expected: FAIL — `ProductGridScreen` doesn't have selection logic yet.

- [ ] **Step 3: Update `ProductGridScreen`**

```tsx
// src/screens/ProductGridScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { ProductGridScreenProps } from '../navigation/types';
import { deleteProduct, getProducts, ProductWithDetails } from '../db/products';
import { ProductCard } from '../components/ProductCard';

export function ProductGridScreen({ navigation }: ProductGridScreenProps) {
  const db = useSQLiteContext();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    getProducts(db).then((p) => { setProducts(p); setLoading(false); });
  }, [db]);

  useFocusEffect(load);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleLongPress = useCallback((id: number) => {
    setSelectionMode(true);
    setSelectedIds((prev) => new Set(prev).add(id));
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
            await Promise.all([...selectedIds].map((id) => deleteProduct(db, id)));
            exitSelectionMode();
            load();
          },
        },
      ]
    );
  }, [selectedIds, db, exitSelectionMode, load]);

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
          <TouchableOpacity onPress={handleDelete} style={{ marginRight: 8 }} disabled={selectedIds.size === 0}>
            <Ionicons name="trash-outline" size={24} color={selectedIds.size > 0 ? '#d32f2f' : '#ccc'} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        title: 'My Products',
        headerLeft: undefined,
        headerRight: undefined,
      });
    }
  }, [selectionMode, selectedIds, navigation, exitSelectionMode, handleDelete]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
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
          <Text style={styles.empty}>No products yet. Tap + to add one.</Text>
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
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1976d2', alignItems: 'center', justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/screens/__tests__/ProductGridScreen.test.tsx --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass, including `ProductCard` tests from Task 1.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ProductGridScreen.tsx src/screens/__tests__/ProductGridScreen.test.tsx
git commit -m "feat: add multi-select and delete to product grid"
```
