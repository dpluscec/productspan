# Active Items Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Has active items" / "No active items" checkboxes to the filter screen so the product grid can be narrowed to products currently in use or not in use.

**Architecture:** `productFilterActiveKeys` state (an array of `'active' | 'inactive'` strings) is added to `AppContext` alongside the existing category filter. `ProductFilterScreen` renders a new Activity section with two checkboxes. `ProductGridScreen` applies the active-key filter inside its `visibleProducts` memo and updates `filterActive` to account for both filter types.

**Tech Stack:** React Native, Expo, TypeScript, Jest + @testing-library/react-native

---

### Task 1: Extend AppContext with active filter state

**Files:**
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1: Add `productFilterActiveKeys` to the context interface and provider**

Replace the interface and provider in `src/context/AppContext.tsx` with the following:

```tsx
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Category, PackageUnit } from '../db/schema';
import { getCategories } from '../db/categories';
import { getPackageUnits } from '../db/packageUnits';

interface AppContextValue {
  categories: Category[];
  packageUnits: PackageUnit[];
  refreshCategories: () => Promise<void>;
  refreshPackageUnits: () => Promise<void>;
  productFilterCategoryIds: number[];
  setProductFilterCategoryIds: (ids: number[]) => void;
  productFilterActiveKeys: ('active' | 'inactive')[];
  setProductFilterActiveKeys: (keys: ('active' | 'inactive')[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [packageUnits, setPackageUnits] = useState<PackageUnit[]>([]);
  const [productFilterCategoryIds, setProductFilterCategoryIds] = useState<number[]>([]);
  const [productFilterActiveKeys, setProductFilterActiveKeys] = useState<('active' | 'inactive')[]>([]);

  const refreshCategories = useCallback(async () => {
    setCategories(await getCategories(db));
  }, [db]);

  const refreshPackageUnits = useCallback(async () => {
    setPackageUnits(await getPackageUnits(db));
  }, [db]);

  useEffect(() => {
    refreshCategories();
    refreshPackageUnits();
  }, [refreshCategories, refreshPackageUnits]);

  return (
    <AppContext.Provider value={{
      categories, packageUnits, refreshCategories, refreshPackageUnits,
      productFilterCategoryIds, setProductFilterCategoryIds,
      productFilterActiveKeys, setProductFilterActiveKeys,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: add productFilterActiveKeys to AppContext"
```

---

### Task 2: Add Activity section to ProductFilterScreen

**Files:**
- Modify: `src/screens/ProductFilterScreen.tsx`

- [ ] **Step 1: Replace ProductFilterScreen with the version that includes the Activity section**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/ProductFilterScreen.tsx
git commit -m "feat: add activity filter section to ProductFilterScreen"
```

---

### Task 3: Apply active-key filter in ProductGridScreen

**Files:**
- Modify: `src/screens/ProductGridScreen.tsx`
- Modify: `src/screens/__tests__/ProductGridScreen.test.tsx`

- [ ] **Step 1: Write failing tests for the active filter**

Add two tests to `src/screens/__tests__/ProductGridScreen.test.tsx`.

First, update the `useAppContext` mock at the top of the file to include the new field (replace the existing mock):

```tsx
jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    productFilterCategoryIds: [],
    setProductFilterCategoryIds: jest.fn(),
    productFilterActiveKeys: [],
    setProductFilterActiveKeys: jest.fn(),
  }),
}));
```

Then add the following two tests inside the `describe('ProductGridScreen', ...)` block, after the existing tests. These require products with different `active_instance_count` values, so also update `mockProducts` at the top of the file:

```tsx
const mockProducts = [
  { id: 1, name: 'Shampoo', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 1 },
  { id: 2, name: 'Soap', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 0 },
];
```

Add these tests:

```tsx
it('shows only active products when productFilterActiveKeys is ["active"]', async () => {
  const { useAppContext } = require('../../context/AppContext');
  useAppContext.mockReturnValue({
    productFilterCategoryIds: [],
    setProductFilterCategoryIds: jest.fn(),
    productFilterActiveKeys: ['active'],
    setProductFilterActiveKeys: jest.fn(),
  });

  const { getByText, queryByText } = render(
    <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
  );
  await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
  expect(queryByText('Soap')).toBeNull();
});

it('shows only inactive products when productFilterActiveKeys is ["inactive"]', async () => {
  const { useAppContext } = require('../../context/AppContext');
  useAppContext.mockReturnValue({
    productFilterCategoryIds: [],
    setProductFilterCategoryIds: jest.fn(),
    productFilterActiveKeys: ['inactive'],
    setProductFilterActiveKeys: jest.fn(),
  });

  const { getByText, queryByText } = render(
    <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
  );
  await waitFor(() => expect(getByText('Soap')).toBeTruthy());
  expect(queryByText('Shampoo')).toBeNull();
});
```

Also update the `useAppContext` mock factory to use `jest.fn()` so `mockReturnValue` works:

```tsx
jest.mock('../../context/AppContext', () => ({
  useAppContext: jest.fn(() => ({
    productFilterCategoryIds: [],
    setProductFilterCategoryIds: jest.fn(),
    productFilterActiveKeys: [],
    setProductFilterActiveKeys: jest.fn(),
  })),
}));
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/screens/__tests__/ProductGridScreen.test.tsx --no-coverage
```

Expected: the two new tests fail because `productFilterActiveKeys` is not yet consumed in `ProductGridScreen`.

- [ ] **Step 3: Update ProductGridScreen to consume `productFilterActiveKeys`**

In `src/screens/ProductGridScreen.tsx`, make two changes:

**3a.** Update the destructure on line 13 to include the new value:

```tsx
const { productFilterCategoryIds, productFilterActiveKeys } = useAppContext();
```

**3b.** Replace the single `filterActive` line (the line that reads `const filterActive = productFilterCategoryIds.length > 0;`) with:

```tsx
const filterActive =
  productFilterCategoryIds.length > 0 || productFilterActiveKeys.length > 0;
```

**3c.** Replace the entire `visibleProducts` useMemo block (the one that currently filters only by `productFilterCategoryIds`) with:

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/screens/__tests__/ProductGridScreen.test.tsx --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProductGridScreen.tsx src/screens/__tests__/ProductGridScreen.test.tsx
git commit -m "feat: apply active items filter in product grid"
```
