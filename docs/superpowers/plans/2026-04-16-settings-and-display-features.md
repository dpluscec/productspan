# Settings and Display Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four user-facing features—image toggle, product list/grid layout switching, category grouping, and quick-start instance creation—all gated by persistent SQLite-backed app settings.

**Architecture:** A new `AppSettingsContext` backed by a `settings` SQLite table provides three boolean settings app-wide. `ProductGridScreen` renders one of four layouts based on `showImages` × `groupByCategory`. `InstancesTab` conditionally skips its modal when `quickStartInstance` is true. `SettingsScreen` gains Switch toggles for all three settings.

**Tech Stack:** expo-sqlite, React context with useMemo, React Native SectionList + FlatList, React Native Switch

---

## File Map

| File | Action |
|---|---|
| `src/db/schema.ts` | Add `settings` table DDL + 3 default inserts |
| `src/db/settings.ts` | Create: `getSetting`, `setSetting` |
| `src/context/AppSettingsContext.tsx` | Create: context, provider, `useAppSettings` hook |
| `App.tsx` | Wrap navigator with `AppSettingsProvider` |
| `src/components/ProductListRow.tsx` | Create: single-column list row component |
| `src/components/__tests__/ProductListRow.test.tsx` | Create: render tests |
| `src/screens/ProductGridScreen.tsx` | Modify: four rendering modes |
| `src/screens/AddEditProductScreen.tsx` | Modify: conditionally hide `PhotoPicker` |
| `src/components/InstancesTab.tsx` | Modify: rename + quick-start logic |
| `src/screens/SettingsScreen.tsx` | Modify: add Display section with Switch rows |

---

## Task 1: Settings DB module and schema table

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/settings.ts`

- [ ] **Step 1: Add the `settings` table to `initDatabase` in `src/db/schema.ts`**

Add the following DDL block immediately after the existing `CREATE TABLE IF NOT EXISTS product_instances` block (before the seed `execAsync` calls). Also add the three `INSERT OR IGNORE` seed rows in the existing seed block.

The full updated `initDatabase` function body (replace entire function):

```ts
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS package_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      photo_uri TEXT,
      package_amount REAL,
      package_unit_id INTEGER REFERENCES package_units(id) ON DELETE SET NULL,
      base_price REAL
    );

    CREATE TABLE IF NOT EXISTS product_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      price REAL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO categories (name) VALUES ('Cosmetics');
    INSERT OR IGNORE INTO categories (name) VALUES ('Food');
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO package_units (name) VALUES ('g');
    INSERT OR IGNORE INTO package_units (name) VALUES ('ml');
    INSERT OR IGNORE INTO package_units (name) VALUES ('oz');
    INSERT OR IGNORE INTO package_units (name) VALUES ('kg');
    INSERT OR IGNORE INTO package_units (name) VALUES ('L');
    INSERT OR IGNORE INTO package_units (name) VALUES ('pcs');
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('show_images', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('group_by_category', '1');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('quick_start_instance', '1');
  `);
}
```

- [ ] **Step 2: Create `src/db/settings.ts`**

```ts
import { SQLiteDatabase } from 'expo-sqlite';

export async function getSetting(db: SQLiteDatabase, key: string, fallback: string): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts src/db/settings.ts
git commit -m "feat: add settings table and db module"
```

---

## Task 2: AppSettingsContext

**Files:**
- Create: `src/context/AppSettingsContext.tsx`

- [ ] **Step 1: Create `src/context/AppSettingsContext.tsx`**

```tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getSetting, setSetting } from '../db/settings';

interface AppSettingsValue {
  showImages: boolean;
  groupByCategory: boolean;
  quickStartInstance: boolean;
  setShowImages: (v: boolean) => Promise<void>;
  setGroupByCategory: (v: boolean) => Promise<void>;
  setQuickStartInstance: (v: boolean) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [showImages, setShowImagesState] = useState(false);
  const [groupByCategory, setGroupByCategoryState] = useState(true);
  const [quickStartInstance, setQuickStartInstanceState] = useState(true);

  useEffect(() => {
    Promise.all([
      getSetting(db, 'show_images', '0'),
      getSetting(db, 'group_by_category', '1'),
      getSetting(db, 'quick_start_instance', '1'),
    ]).then(([img, grp, qs]) => {
      setShowImagesState(img === '1');
      setGroupByCategoryState(grp === '1');
      setQuickStartInstanceState(qs === '1');
    }).catch(() => {});
  }, [db]);

  const setShowImages = useCallback(async (v: boolean) => {
    await setSetting(db, 'show_images', v ? '1' : '0');
    setShowImagesState(v);
  }, [db]);

  const setGroupByCategory = useCallback(async (v: boolean) => {
    await setSetting(db, 'group_by_category', v ? '1' : '0');
    setGroupByCategoryState(v);
  }, [db]);

  const setQuickStartInstance = useCallback(async (v: boolean) => {
    await setSetting(db, 'quick_start_instance', v ? '1' : '0');
    setQuickStartInstanceState(v);
  }, [db]);

  const value = useMemo(() => ({
    showImages, groupByCategory, quickStartInstance,
    setShowImages, setGroupByCategory, setQuickStartInstance,
  }), [showImages, groupByCategory, quickStartInstance, setShowImages, setGroupByCategory, setQuickStartInstance]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/AppSettingsContext.tsx
git commit -m "feat: add AppSettingsContext"
```

---

## Task 3: Wire AppSettingsProvider into App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Update `App.tsx`**

Replace the entire file content:

```tsx
import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/db/schema';
import { AppProvider } from './src/context/AppContext';
import { AppSettingsProvider } from './src/context/AppSettingsContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="productspan.db" onInit={initDatabase}>
        <AppProvider>
          <AppSettingsProvider>
            <AppNavigator />
          </AppSettingsProvider>
        </AppProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Verify the app launches without errors**

Run: `npx expo start`
Expected: App starts, no runtime errors in console.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: wire AppSettingsProvider into app root"
```

---

## Task 4: ProductListRow component

**Files:**
- Create: `src/components/ProductListRow.tsx`
- Create: `src/components/__tests__/ProductListRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/ProductListRow.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductListRow } from '../ProductListRow';

const mockProduct = {
  id: 1,
  name: 'Shampoo',
  category_id: 1,
  category_name: 'Hair',
  photo_uri: null,
  package_amount: null,
  package_unit_id: null,
  package_unit_name: null,
  base_price: null,
  active_instance_count: 2,
};

const noCategory = { ...mockProduct, category_id: null, category_name: null };

describe('ProductListRow', () => {
  it('renders product name', () => {
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('Shampoo')).toBeTruthy();
  });

  it('renders category name when present', () => {
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('Hair')).toBeTruthy();
  });

  it('does not render category when null', () => {
    const { queryByText } = render(<ProductListRow product={noCategory} onPress={jest.fn()} />);
    expect(queryByText('Hair')).toBeNull();
  });

  it('shows active count when > 0', () => {
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('2 active')).toBeTruthy();
  });

  it('hides active count when 0', () => {
    const { queryByText } = render(<ProductListRow product={{ ...mockProduct, active_instance_count: 0 }} onPress={jest.fn()} />);
    expect(queryByText(/active/)).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={onPress} />);
    fireEvent.press(getByText('Shampoo'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows checkmark when selected in selection mode', () => {
    const { getByTestId } = render(
      <ProductListRow product={mockProduct} onPress={jest.fn()} selectionMode selected />
    );
    expect(getByTestId('list-selection-check')).toBeTruthy();
  });

  it('shows circle but no checkmark when not selected in selection mode', () => {
    const { queryByTestId } = render(
      <ProductListRow product={mockProduct} onPress={jest.fn()} selectionMode={true} selected={false} />
    );
    expect(queryByTestId('list-selection-check')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/components/__tests__/ProductListRow.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../ProductListRow'"

- [ ] **Step 3: Create `src/components/ProductListRow.tsx`**

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/components/__tests__/ProductListRow.test.tsx --no-coverage
```

Expected: PASS — 8 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductListRow.tsx src/components/__tests__/ProductListRow.test.tsx
git commit -m "feat: add ProductListRow component"
```

---

## Task 5: ProductGridScreen — four rendering modes

**Files:**
- Modify: `src/screens/ProductGridScreen.tsx`

The current file uses a single `FlatList` with `numColumns={2}` and `ProductCard`. Replace with a layout that switches between four modes based on `showImages` and `groupByCategory`.

- [ ] **Step 1: Replace `src/screens/ProductGridScreen.tsx` with the full implementation**

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, FlatList, SectionList, TouchableOpacity, Text,
  StyleSheet, Alert, ActivityIndicator, BackHandler, ToastAndroid, Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { ProductGridScreenProps } from '../navigation/types';
import { deleteProduct, getProducts, ProductWithDetails } from '../db/products';
import { useAppContext } from '../context/AppContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { ProductCard } from '../components/ProductCard';
import { ProductListRow } from '../components/ProductListRow';

type GridRow = [ProductWithDetails, ProductWithDetails | null];
type GridSection = { title: string; data: GridRow[] };
type ListSection = { title: string; data: ProductWithDetails[] };

function chunkPairs(arr: ProductWithDetails[]): GridRow[] {
  const result: GridRow[] = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push([arr[i], arr[i + 1] ?? null]);
  }
  return result;
}

export function ProductGridScreen({ navigation }: ProductGridScreenProps) {
  const db = useSQLiteContext();
  const { productFilterCategoryIds } = useAppContext();
  const { showImages, groupByCategory } = useAppSettings();
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

  const filterActive = productFilterCategoryIds.length > 0;

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
    if (!filterActive) return products;
    const idSet = new Set(productFilterCategoryIds);
    const includeUncategorized = idSet.has(-1);
    return products.filter((p) =>
      (includeUncategorized && p.category_id === null) ||
      (p.category_id !== null && idSet.has(p.category_id))
    );
  }, [products, productFilterCategoryIds, filterActive]);

  const gridSections = useMemo<GridSection[]>(() => {
    if (!groupByCategory || showImages === false) return [];
    const map = new Map<number | null, { title: string; products: ProductWithDetails[] }>();
    for (const p of visibleProducts) {
      const key = p.category_id;
      if (!map.has(key)) map.set(key, { title: p.category_name ?? 'Uncategorized', products: [] });
      map.get(key)!.products.push(p);
    }
    const named = [...map.entries()]
      .filter(([k]) => k !== null)
      .sort(([, a], [, b]) => a.title.localeCompare(b.title))
      .map(([, g]) => g);
    const uncategorized = map.get(null);
    return [...named, ...(uncategorized ? [uncategorized] : [])]
      .map((g) => ({ title: g.title, data: chunkPairs(g.products) }));
  }, [visibleProducts, groupByCategory, showImages]);

  const listSections = useMemo<ListSection[]>(() => {
    if (!groupByCategory || showImages === true) return [];
    const map = new Map<number | null, { title: string; products: ProductWithDetails[] }>();
    for (const p of visibleProducts) {
      const key = p.category_id;
      if (!map.has(key)) map.set(key, { title: p.category_name ?? 'Uncategorized', products: [] });
      map.get(key)!.products.push(p);
    }
    const named = [...map.entries()]
      .filter(([k]) => k !== null)
      .sort(([, a], [, b]) => a.title.localeCompare(b.title))
      .map(([, g]) => g);
    const uncategorized = map.get(null);
    return [...named, ...(uncategorized ? [uncategorized] : [])]
      .map((g) => ({ title: g.title, data: g.products }));
  }, [visibleProducts, groupByCategory, showImages]);

  const emptyMsg = filterActive
    ? 'No products match the current filter.'
    : 'No products yet. Tap + to add one.';

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  ), []);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <View style={styles.container}>
      {showImages && !groupByCategory && (
        <FlatList
          key="grid"
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
          ListEmptyComponent={<Text style={styles.empty}>{emptyMsg}</Text>}
        />
      )}
      {showImages && groupByCategory && (
        <SectionList<GridRow, GridSection>
          sections={gridSections}
          keyExtractor={(item) => String(item[0].id)}
          renderSectionHeader={renderSectionHeader}
          renderItem={({ item }) => (
            <View style={styles.gridRow}>
              <ProductCard
                product={item[0]}
                selectionMode={selectionMode}
                selected={selectedIds.has(item[0].id)}
                onPress={() => handlePress(item[0].id)}
                onLongPress={() => handleLongPress(item[0].id)}
              />
              {item[1] ? (
                <ProductCard
                  product={item[1]}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item[1].id)}
                  onPress={() => handlePress(item[1].id)}
                  onLongPress={() => handleLongPress(item[1].id)}
                />
              ) : (
                <View style={styles.gridPlaceholder} />
              )}
            </View>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{emptyMsg}</Text>}
        />
      )}
      {!showImages && !groupByCategory && (
        <FlatList
          key="list"
          data={visibleProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductListRow
              product={item}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onPress={() => handlePress(item.id)}
              onLongPress={() => handleLongPress(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{emptyMsg}</Text>}
        />
      )}
      {!showImages && groupByCategory && (
        <SectionList<ProductWithDetails, ListSection>
          sections={listSections}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={renderSectionHeader}
          renderItem={({ item }) => (
            <ProductListRow
              product={item}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onPress={() => handlePress(item.id)}
              onLongPress={() => handleLongPress(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{emptyMsg}</Text>}
        />
      )}

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
  sectionHeader: {
    backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', color: '#555' },
  gridRow: { flexDirection: 'row' },
  gridPlaceholder: { flex: 1, margin: 6 },
});
```

- [ ] **Step 2: Update the existing ProductGridScreen test mock for AppContext to also mock AppSettingsContext**

Open `src/screens/__tests__/ProductGridScreen.test.tsx` and add this mock before the existing `jest.mock('../../context/AppContext', ...)` line:

```tsx
jest.mock('../../context/AppSettingsContext', () => ({
  useAppSettings: () => ({
    showImages: true,
    groupByCategory: false,
    quickStartInstance: true,
    setShowImages: jest.fn(),
    setGroupByCategory: jest.fn(),
    setQuickStartInstance: jest.fn(),
  }),
}));
```

- [ ] **Step 3: Run existing tests to verify they still pass**

```bash
npx jest src/screens/__tests__/ProductGridScreen.test.tsx --no-coverage
```

Expected: PASS — 3 tests passing

- [ ] **Step 4: Commit**

```bash
git add src/screens/ProductGridScreen.tsx src/screens/__tests__/ProductGridScreen.test.tsx
git commit -m "feat: ProductGridScreen four rendering modes"
```

---

## Task 6: AddEditProductScreen — conditionally hide PhotoPicker

**Files:**
- Modify: `src/screens/AddEditProductScreen.tsx`

- [ ] **Step 1: Import `useAppSettings` and conditionally render `PhotoPicker`**

Add the import at the top of the file (after the existing `useAppContext` import):

```tsx
import { useAppSettings } from '../context/AppSettingsContext';
```

Inside `AddEditProductScreen`, add after the existing hooks:

```tsx
const { showImages } = useAppSettings();
```

Find this line in the JSX (inside `ScrollView`):

```tsx
        <PhotoPicker uri={photoUri} onChange={setPhotoUri} />
```

Replace it with:

```tsx
        {showImages ? <PhotoPicker uri={photoUri} onChange={setPhotoUri} /> : null}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/AddEditProductScreen.tsx
git commit -m "feat: hide PhotoPicker when show_images is off"
```

---

## Task 7: InstancesTab — rename and quick-start

**Files:**
- Modify: `src/components/InstancesTab.tsx`

- [ ] **Step 1: Import `useAppSettings` and `addInstance` is already imported — add quick-start logic**

Add the import at the top (after the existing imports):

```tsx
import { useAppSettings } from '../context/AppSettingsContext';
```

Inside `InstancesTab`, add after the existing `const db = useSQLiteContext();` line:

```tsx
  const { quickStartInstance } = useAppSettings();
```

Replace the entire `openAdd` function:

```tsx
  const openAdd = () => {
    if (quickStartInstance) {
      const today = new Date().toISOString().split('T')[0];
      addInstance(db, productId, today, basePrice)
        .then(() => { load(); onRefreshProduct(); })
        .catch(() => Alert.alert('Error', 'Failed to start instance. Please try again.'));
      return;
    }
    setEditingInstance(null);
    setFormStartDate(new Date());
    setFormEndDate(null);
    setFormPrice(basePrice != null ? String(basePrice) : '');
    setShowModal(true);
  };
```

Find this button in the JSX:

```tsx
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Instance</Text>
      </TouchableOpacity>
```

Replace with:

```tsx
      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Start using</Text>
      </TouchableOpacity>
```

Find the modal title line:

```tsx
            <Text style={styles.sheetTitle}>
              {editingInstance ? 'Edit Instance' : 'Add Instance'}
            </Text>
```

Replace with:

```tsx
            <Text style={styles.sheetTitle}>
              {editingInstance ? 'Edit Instance' : 'Start using'}
            </Text>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InstancesTab.tsx
git commit -m "feat: rename Add Instance to Start using + quick-start mode"
```

---

## Task 8: SettingsScreen — Display toggles

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Add Switch import and AppSettingsContext import**

In `src/screens/SettingsScreen.tsx`, update the React Native import to include `Switch`:

```tsx
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, Switch,
} from 'react-native';
```

Add after the existing `useAppContext` import:

```tsx
import { useAppSettings } from '../context/AppSettingsContext';
```

- [ ] **Step 2: Add `useAppSettings` call inside `SettingsScreen`**

Inside `SettingsScreen`, add after the existing `const { categories, ... } = useAppContext();` line:

```tsx
  const { showImages, groupByCategory, quickStartInstance, setShowImages, setGroupByCategory, setQuickStartInstance } = useAppSettings();
```

- [ ] **Step 3: Add Display section to the JSX**

In the `ScrollView` JSX, add this block as the very first child (before `<SectionHeader title="Categories" />`):

```tsx
      <SectionHeader title="Display" />
      <SettingRow
        label="Show product images"
        value={showImages}
        onValueChange={(v) => setShowImages(v)}
      />
      <SettingRow
        label="Group products by category"
        value={groupByCategory}
        onValueChange={(v) => setGroupByCategory(v)}
      />
      <SettingRow
        label='Quick-start "Start using"'
        value={quickStartInstance}
        onValueChange={(v) => setQuickStartInstance(v)}
      />
```

- [ ] **Step 4: Add `SettingRow` local component**

Add this function after the `ItemRow` function definition (before the `const styles` line):

```tsx
function SettingRow({ label, value, onValueChange }: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ccc', true: '#1976d2' }}
        thumbColor="#fff"
      />
    </View>
  );
}
```

- [ ] **Step 5: Add `settingRow` and `settingLabel` styles**

In the `StyleSheet.create` block, add after the existing `addLink` style:

```ts
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 4, elevation: 1,
  },
  settingLabel: { fontSize: 15, color: '#111', flex: 1, marginRight: 12 },
```

- [ ] **Step 6: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: add Display settings toggles to SettingsScreen"
```
