# Product Usage Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native + Expo Android app for tracking consumable product usage durations and costs.

**Architecture:** Expo managed workflow with SQLite for local persistence using `SQLiteProvider` and `useSQLiteContext`. Navigation uses React Navigation bottom tabs + native stack. Pure logic (stats, export/import validation) is unit-tested with Jest. UI state for categories and package units lives in React Context backed by the DB.

**Tech Stack:** React Native, TypeScript, Expo SDK 52+, expo-sqlite, expo-image-picker, expo-file-system, expo-sharing, expo-document-picker, @react-navigation/native, @react-navigation/bottom-tabs, @react-navigation/native-stack, @react-native-picker/picker, @react-native-community/datetimepicker, jest-expo

---

## File Map

| File | Responsibility |
|---|---|
| `app.json` | Expo config, Android SDK versions |
| `App.tsx` | Root: SQLiteProvider + AppProvider + AppNavigator |
| `src/db/schema.ts` | TypeScript types + `initDatabase` migration |
| `src/db/categories.ts` | CRUD for categories table |
| `src/db/packageUnits.ts` | CRUD for package_units table |
| `src/db/products.ts` | CRUD for products table |
| `src/db/instances.ts` | CRUD for product_instances table |
| `src/utils/stats.ts` | Pure stats calculation functions |
| `src/utils/exportImport.ts` | JSON serialize/deserialize/validate |
| `src/context/AppContext.tsx` | Categories + package units global state |
| `src/navigation/types.ts` | React Navigation TypeScript param types |
| `src/navigation/AppNavigator.tsx` | Root navigator (tabs + stacks) |
| `src/screens/ProductGridScreen.tsx` | Main screen: product grid + FAB |
| `src/screens/AddEditProductScreen.tsx` | Add/edit product form |
| `src/screens/ProductDetailScreen.tsx` | Product detail with Instances + Stats tabs |
| `src/screens/SettingsScreen.tsx` | Categories, package units, export/import |
| `src/components/ProductCard.tsx` | Grid card for a product |
| `src/components/PhotoPicker.tsx` | Camera/gallery/placeholder selector |
| `src/components/InstanceItem.tsx` | Single instance row with Stop/Edit |
| `src/components/InstancesTab.tsx` | Instances tab with add/stop/show-completed |
| `src/components/StatsTab.tsx` | Stats tab with period toggle |
| `__tests__/stats.test.ts` | Unit tests for stats calculations |
| `__tests__/exportImport.test.ts` | Unit tests for export/import validation |

---

### Task 1: Project Bootstrap

**Files:**
- Create: `app.json`, folder structure, jest config

- [ ] **Step 1: Initialise Expo project**

```bash
cd c:/vso/productspan
npx create-expo-app@latest . --template blank-typescript
```

Expected: TypeScript Expo project created in current directory.

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-sqlite expo-image-picker expo-file-system expo-sharing expo-document-picker
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler
npx expo install @react-native-picker/picker @react-native-community/datetimepicker
npx expo install --dev jest-expo @testing-library/react-native
```

- [ ] **Step 3: Configure Android SDK versions in `app.json`**

Merge into the existing `app.json` under the `"expo"` key:

```json
{
  "expo": {
    "name": "ProductSpan",
    "slug": "productspan",
    "version": "1.0.0",
    "android": {
      "minSdkVersion": 31,
      "targetSdkVersion": 34,
      "package": "com.productspan.app"
    }
  }
}
```

- [ ] **Step 4: Add Jest config to `package.json`**

Add this `"jest"` key inside `package.json`:

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*)"
  ]
}
```

- [ ] **Step 5: Create folder structure**

```bash
mkdir -p src/db src/utils src/context src/navigation src/screens src/components __tests__
```

- [ ] **Step 6: Verify Jest initialises**

```bash
npx jest --listTests
```

Expected: no errors (no test files yet).

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: bootstrap Expo project with dependencies"
```

---

### Task 2: Database Schema & Initialisation

**Files:**
- Create: `src/db/schema.ts`

- [ ] **Step 1: Create `src/db/schema.ts`**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';

export interface Category {
  id: number;
  name: string;
}

export interface PackageUnit {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number | null;
  photo_uri: string | null;
  package_amount: number | null;
  package_unit_id: number | null;
  base_price: number | null;
}

export interface ProductInstance {
  id: number;
  product_id: number;
  started_at: string;
  ended_at: string | null;
  price: number | null;
}

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS package_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      photo_uri TEXT,
      package_amount REAL,
      package_unit_id INTEGER REFERENCES package_units(id),
      base_price REAL
    );

    CREATE TABLE IF NOT EXISTS product_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      price REAL
    );
  `);

  const catCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if ((catCount?.count ?? 0) === 0) {
    await db.execAsync(`
      INSERT INTO categories (name) VALUES ('Cosmetics');
      INSERT INTO categories (name) VALUES ('Food');
    `);
  }

  const unitCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM package_units'
  );
  if ((unitCount?.count ?? 0) === 0) {
    await db.execAsync(`
      INSERT INTO package_units (name) VALUES ('g');
      INSERT INTO package_units (name) VALUES ('ml');
      INSERT INTO package_units (name) VALUES ('oz');
      INSERT INTO package_units (name) VALUES ('kg');
      INSERT INTO package_units (name) VALUES ('L');
      INSERT INTO package_units (name) VALUES ('pcs');
    `);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add database schema and init function"
```

---

### Task 3: DB Operations — Categories & Package Units

**Files:**
- Create: `src/db/categories.ts`
- Create: `src/db/packageUnits.ts`

- [ ] **Step 1: Create `src/db/categories.ts`**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import { Category } from './schema';

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
}

export async function addCategory(db: SQLiteDatabase, name: string): Promise<number> {
  const result = await db.runAsync('INSERT INTO categories (name) VALUES (?)', [name]);
  return result.lastInsertRowId;
}

export async function updateCategory(db: SQLiteDatabase, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function isCategoryInUse(db: SQLiteDatabase, id: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]
  );
  return (row?.count ?? 0) > 0;
}
```

- [ ] **Step 2: Create `src/db/packageUnits.ts`**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import { PackageUnit } from './schema';

export async function getPackageUnits(db: SQLiteDatabase): Promise<PackageUnit[]> {
  return db.getAllAsync<PackageUnit>('SELECT * FROM package_units ORDER BY name');
}

export async function addPackageUnit(db: SQLiteDatabase, name: string): Promise<number> {
  const result = await db.runAsync('INSERT INTO package_units (name) VALUES (?)', [name]);
  return result.lastInsertRowId;
}

export async function updatePackageUnit(db: SQLiteDatabase, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE package_units SET name = ? WHERE id = ?', [name, id]);
}

export async function deletePackageUnit(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM package_units WHERE id = ?', [id]);
}

export async function isPackageUnitInUse(db: SQLiteDatabase, id: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products WHERE package_unit_id = ?', [id]
  );
  return (row?.count ?? 0) > 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/db/categories.ts src/db/packageUnits.ts
git commit -m "feat: add categories and package units DB operations"
```

---

### Task 4: DB Operations — Products & Instances

**Files:**
- Create: `src/db/products.ts`
- Create: `src/db/instances.ts`

- [ ] **Step 1: Create `src/db/products.ts`**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import { Product } from './schema';

export interface ProductWithDetails extends Product {
  category_name: string | null;
  package_unit_name: string | null;
  active_instance_count: number;
}

const PRODUCT_SELECT = `
  SELECT
    p.*,
    c.name AS category_name,
    u.name AS package_unit_name,
    COUNT(CASE WHEN pi.ended_at IS NULL THEN 1 END) AS active_instance_count
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN package_units u ON p.package_unit_id = u.id
  LEFT JOIN product_instances pi ON pi.product_id = p.id
`;

export async function getProducts(db: SQLiteDatabase): Promise<ProductWithDetails[]> {
  return db.getAllAsync<ProductWithDetails>(
    `${PRODUCT_SELECT} GROUP BY p.id ORDER BY p.name`
  );
}

export async function getProduct(
  db: SQLiteDatabase,
  id: number
): Promise<ProductWithDetails | null> {
  return db.getFirstAsync<ProductWithDetails>(
    `${PRODUCT_SELECT} WHERE p.id = ? GROUP BY p.id`, [id]
  );
}

export async function addProduct(
  db: SQLiteDatabase,
  product: Omit<Product, 'id'>
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO products (name, category_id, photo_uri, package_amount, package_unit_id, base_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [product.name, product.category_id, product.photo_uri,
     product.package_amount, product.package_unit_id, product.base_price]
  );
  return result.lastInsertRowId;
}

export async function updateProduct(
  db: SQLiteDatabase,
  id: number,
  product: Omit<Product, 'id'>
): Promise<void> {
  await db.runAsync(
    `UPDATE products
     SET name=?, category_id=?, photo_uri=?, package_amount=?, package_unit_id=?, base_price=?
     WHERE id=?`,
    [product.name, product.category_id, product.photo_uri,
     product.package_amount, product.package_unit_id, product.base_price, id]
  );
}

export async function deleteProduct(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
}
```

- [ ] **Step 2: Create `src/db/instances.ts`**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import { ProductInstance } from './schema';

export async function getInstances(
  db: SQLiteDatabase,
  productId: number,
  includeCompleted: boolean
): Promise<ProductInstance[]> {
  if (includeCompleted) {
    return db.getAllAsync<ProductInstance>(
      'SELECT * FROM product_instances WHERE product_id = ? ORDER BY started_at DESC',
      [productId]
    );
  }
  return db.getAllAsync<ProductInstance>(
    'SELECT * FROM product_instances WHERE product_id = ? AND ended_at IS NULL ORDER BY started_at DESC',
    [productId]
  );
}

export async function getCompletedInstances(
  db: SQLiteDatabase,
  productId: number
): Promise<(ProductInstance & { ended_at: string })[]> {
  return db.getAllAsync(
    'SELECT * FROM product_instances WHERE product_id = ? AND ended_at IS NOT NULL ORDER BY started_at DESC',
    [productId]
  );
}

export async function addInstance(
  db: SQLiteDatabase,
  productId: number,
  startedAt: string,
  price: number | null
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO product_instances (product_id, started_at, price) VALUES (?, ?, ?)',
    [productId, startedAt, price]
  );
  return result.lastInsertRowId;
}

export async function stopInstance(
  db: SQLiteDatabase,
  id: number,
  endedAt: string
): Promise<void> {
  await db.runAsync(
    'UPDATE product_instances SET ended_at = ? WHERE id = ?', [endedAt, id]
  );
}

export async function updateInstance(
  db: SQLiteDatabase,
  id: number,
  startedAt: string,
  endedAt: string | null,
  price: number | null
): Promise<void> {
  await db.runAsync(
    'UPDATE product_instances SET started_at=?, ended_at=?, price=? WHERE id=?',
    [startedAt, endedAt, price, id]
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/db/products.ts src/db/instances.ts
git commit -m "feat: add products and instances DB operations"
```

---

### Task 5: Stats Utilities (TDD)

**Files:**
- Create: `src/utils/stats.ts`
- Create: `__tests__/stats.test.ts`

- [ ] **Step 1: Write failing tests in `__tests__/stats.test.ts`**

```typescript
import { calculateDurationDays, calculateStats, getPerPeriodRate } from '../src/utils/stats';

describe('calculateDurationDays', () => {
  it('returns 1 for a 24-hour span', () => {
    expect(calculateDurationDays('2024-01-01', '2024-01-02')).toBeCloseTo(1, 5);
  });

  it('returns 30 for a 30-day span', () => {
    expect(calculateDurationDays('2024-01-01', '2024-01-31')).toBeCloseTo(30, 5);
  });
});

describe('calculateStats', () => {
  const instances = [
    { started_at: '2024-01-01', ended_at: '2024-02-01', price: 10 },
    { started_at: '2024-03-01', ended_at: '2024-04-01', price: 12 },
  ];

  it('returns null when no completed instances', () => {
    expect(calculateStats([], null)).toBeNull();
  });

  it('calculates total instances used', () => {
    expect(calculateStats(instances, null)!.totalInstancesUsed).toBe(2);
  });

  it('calculates average duration', () => {
    expect(calculateStats(instances, null)!.averageDurationDays).toBeCloseTo(31, 1);
  });

  it('calculates min and max duration', () => {
    const mixed = [
      { started_at: '2024-01-01', ended_at: '2024-01-11', price: null },
      { started_at: '2024-02-01', ended_at: '2024-03-03', price: null },
    ];
    const result = calculateStats(mixed, null)!;
    expect(result.minDurationDays).toBeCloseTo(10, 1);
    expect(result.maxDurationDays).toBeCloseTo(31, 1);
  });

  it('calculates total expense from instance price', () => {
    expect(calculateStats(instances, null)!.totalExpense).toBeCloseTo(22, 5);
  });

  it('uses base price as fallback', () => {
    const noPrice = [{ started_at: '2024-01-01', ended_at: '2024-02-01', price: null }];
    expect(calculateStats(noPrice, 15)!.totalExpense).toBeCloseTo(15, 5);
  });

  it('returns null totalExpense when no price data', () => {
    const noPrice = [{ started_at: '2024-01-01', ended_at: '2024-02-01', price: null }];
    expect(calculateStats(noPrice, null)!.totalExpense).toBeNull();
  });
});

describe('getPerPeriodRate', () => {
  it('returns daily rate for day', () => {
    expect(getPerPeriodRate(2, 'day')).toBeCloseTo(2, 5);
  });

  it('scales to monthly rate', () => {
    expect(getPerPeriodRate(2, 'month')).toBeCloseTo(60.88, 1);
  });

  it('scales to yearly rate', () => {
    expect(getPerPeriodRate(2, 'year')).toBeCloseTo(730, 5);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/stats.test.ts
```

Expected: FAIL — `Cannot find module '../src/utils/stats'`

- [ ] **Step 3: Create `src/utils/stats.ts`**

```typescript
export type Period = 'day' | 'month' | 'year';

const PERIOD_DAYS: Record<Period, number> = { day: 1, month: 30.44, year: 365 };

export interface StatsResult {
  totalInstancesUsed: number;
  averageDurationDays: number;
  minDurationDays: number;
  maxDurationDays: number;
  totalExpense: number | null;
  avgEffectivePrice: number | null;
}

export function calculateDurationDays(startedAt: string, endedAt: string): number {
  return (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 86400000;
}

export function calculateStats(
  instances: Array<{ started_at: string; ended_at: string | null; price: number | null }>,
  basePrice: number | null
): StatsResult | null {
  const completed = instances.filter(
    (i): i is typeof i & { ended_at: string } => i.ended_at !== null
  );
  if (completed.length === 0) return null;

  const durations = completed.map((i) => calculateDurationDays(i.started_at, i.ended_at));
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  const effectivePrices = completed
    .map((i) => i.price ?? basePrice)
    .filter((p): p is number => p !== null);

  const totalExpense = effectivePrices.length > 0
    ? effectivePrices.reduce((a, b) => a + b, 0)
    : null;

  const avgEffectivePrice = effectivePrices.length > 0
    ? effectivePrices.reduce((a, b) => a + b, 0) / effectivePrices.length
    : null;

  return {
    totalInstancesUsed: completed.length,
    averageDurationDays: avgDuration,
    minDurationDays: Math.min(...durations),
    maxDurationDays: Math.max(...durations),
    totalExpense,
    avgEffectivePrice,
  };
}

export function getPerPeriodRate(perDayRate: number, period: Period): number {
  return perDayRate * PERIOD_DAYS[period];
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/stats.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/stats.ts __tests__/stats.test.ts
git commit -m "feat: add stats calculation utilities with tests"
```

---

### Task 6: Export / Import Utilities (TDD)

**Files:**
- Create: `src/utils/exportImport.ts`
- Create: `__tests__/exportImport.test.ts`

- [ ] **Step 1: Write failing tests in `__tests__/exportImport.test.ts`**

```typescript
import { serializeData, validateImportData, ExportData } from '../src/utils/exportImport';

const validData: ExportData = {
  version: 1,
  exported_at: '2024-01-01T00:00:00.000Z',
  categories: [{ id: 1, name: 'Cosmetics' }],
  package_units: [{ id: 1, name: 'ml' }],
  products: [{
    id: 1, name: 'Shampoo', category_id: 1,
    photo_uri: null, package_amount: 200, package_unit_id: 1, base_price: 5.99,
  }],
  product_instances: [{
    id: 1, product_id: 1, started_at: '2024-01-01', ended_at: null, price: null,
  }],
};

describe('serializeData', () => {
  it('produces valid JSON with version 1', () => {
    const parsed = JSON.parse(
      serializeData(validData.categories, validData.package_units, validData.products, validData.product_instances)
    );
    expect(parsed.version).toBe(1);
    expect(parsed.categories).toHaveLength(1);
  });

  it('includes exported_at timestamp', () => {
    const parsed = JSON.parse(serializeData([], [], [], []));
    expect(parsed.exported_at).toBeTruthy();
  });
});

describe('validateImportData', () => {
  it('returns data for a valid payload', () => {
    const result = validateImportData(JSON.stringify(validData));
    expect(result).not.toBeNull();
    expect(result!.categories).toHaveLength(1);
  });

  it('returns null for invalid JSON', () => {
    expect(validateImportData('not json')).toBeNull();
  });

  it('returns null when version is missing', () => {
    const bad = { ...validData } as any;
    delete bad.version;
    expect(validateImportData(JSON.stringify(bad))).toBeNull();
  });

  it('returns null when version is not 1', () => {
    expect(validateImportData(JSON.stringify({ ...validData, version: 2 }))).toBeNull();
  });

  it('returns null when required arrays are missing', () => {
    expect(validateImportData(JSON.stringify({ version: 1, exported_at: '2024-01-01T00:00:00.000Z' }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest __tests__/exportImport.test.ts
```

Expected: FAIL — `Cannot find module '../src/utils/exportImport'`

- [ ] **Step 3: Create `src/utils/exportImport.ts`**

```typescript
import { Category, PackageUnit, Product, ProductInstance } from '../db/schema';

export interface ExportData {
  version: number;
  exported_at: string;
  categories: Category[];
  package_units: PackageUnit[];
  products: Product[];
  product_instances: ProductInstance[];
}

export function serializeData(
  categories: Category[],
  packageUnits: PackageUnit[],
  products: Product[],
  instances: ProductInstance[]
): string {
  const data: ExportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    categories,
    package_units: packageUnits,
    products,
    product_instances: instances,
  };
  return JSON.stringify(data, null, 2);
}

export function validateImportData(json: string): ExportData | null {
  try {
    const parsed = JSON.parse(json);
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.package_units) ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.product_instances)
    ) {
      return null;
    }
    return parsed as ExportData;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/exportImport.test.ts
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
npx jest
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/exportImport.ts __tests__/exportImport.test.ts
git commit -m "feat: add export/import utilities with tests"
```

---

### Task 7: App Context & Navigation

**Files:**
- Create: `src/context/AppContext.tsx`
- Create: `src/navigation/types.ts`
- Create: `src/navigation/AppNavigator.tsx`
- Create: placeholder screens
- Modify: `App.tsx`

- [ ] **Step 1: Create `src/context/AppContext.tsx`**

```typescript
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [packageUnits, setPackageUnits] = useState<PackageUnit[]>([]);

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
    <AppContext.Provider value={{ categories, packageUnits, refreshCategories, refreshPackageUnits }}>
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

- [ ] **Step 2: Create `src/navigation/types.ts`**

```typescript
import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type HomeStackParamList = {
  ProductGrid: undefined;
  AddEditProduct: { productId?: number };
  ProductDetail: { productId: number };
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Settings: undefined;
};

export type ProductGridScreenProps = NativeStackScreenProps<HomeStackParamList, 'ProductGrid'>;
export type AddEditProductScreenProps = NativeStackScreenProps<HomeStackParamList, 'AddEditProduct'>;
export type ProductDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>;
export type SettingsScreenProps = BottomTabScreenProps<RootTabParamList, 'Settings'>;
```

- [ ] **Step 3: Create placeholder screens**

Create `src/screens/ProductGridScreen.tsx`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { ProductGridScreenProps } from '../navigation/types';
export function ProductGridScreen({}: ProductGridScreenProps) {
  return <View><Text>Product Grid</Text></View>;
}
```

Create `src/screens/AddEditProductScreen.tsx`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { AddEditProductScreenProps } from '../navigation/types';
export function AddEditProductScreen({}: AddEditProductScreenProps) {
  return <View><Text>Add/Edit Product</Text></View>;
}
```

Create `src/screens/ProductDetailScreen.tsx`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { ProductDetailScreenProps } from '../navigation/types';
export function ProductDetailScreen({ route }: ProductDetailScreenProps) {
  return <View><Text>Product Detail {route.params.productId}</Text></View>;
}
```

Create `src/screens/SettingsScreen.tsx`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';
export function SettingsScreen() {
  return <View><Text>Settings</Text></View>;
}
```

- [ ] **Step 4: Create `src/navigation/AppNavigator.tsx`**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList, RootTabParamList } from './types';
import { ProductGridScreen } from '../screens/ProductGridScreen';
import { AddEditProductScreen } from '../screens/AddEditProductScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="ProductGrid" component={ProductGridScreen} options={{ title: 'My Products' }} />
      <HomeStack.Screen
        name="AddEditProduct"
        component={AddEditProductScreen}
        options={({ route }) => ({ title: route.params.productId ? 'Edit Product' : 'Add Product' })}
      />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
    </HomeStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeStackNavigator} options={{ headerShown: false, title: 'Products' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 5: Update `App.tsx`**

```typescript
import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { initDatabase } from './src/db/schema';
import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SQLiteProvider databaseName="productspan.db" onInit={initDatabase}>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SQLiteProvider>
  );
}
```

- [ ] **Step 6: Start app and verify it loads**

```bash
npx expo start --android
```

Expected: App opens with "Products" and "Settings" bottom tabs. Each shows placeholder text. No crashes.

- [ ] **Step 7: Commit**

```bash
git add src/context/ src/navigation/ src/screens/ App.tsx
git commit -m "feat: add context, navigation, and placeholder screens"
```

---

### Task 8: Product Grid Screen & Card

**Files:**
- Create: `src/components/ProductCard.tsx`
- Modify: `src/screens/ProductGridScreen.tsx`

- [ ] **Step 1: Create `src/components/ProductCard.tsx`**

```typescript
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
```

- [ ] **Step 2: Replace `src/screens/ProductGridScreen.tsx`**

```typescript
import React, { useCallback, useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { ProductGridScreenProps } from '../navigation/types';
import { getProducts, ProductWithDetails } from '../db/products';
import { ProductCard } from '../components/ProductCard';

export function ProductGridScreen({ navigation }: ProductGridScreenProps) {
  const db = useSQLiteContext();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getProducts(db).then((p) => { setProducts(p); setLoading(false); });
    }, [db])
  );

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
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No products yet. Tap + to add one.</Text>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditProduct', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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

- [ ] **Step 3: Test on device**

```bash
npx expo start --android
```

Expected: Products tab shows empty state and a blue FAB. Tapping FAB navigates to placeholder Add Product screen.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductCard.tsx src/screens/ProductGridScreen.tsx
git commit -m "feat: implement product grid screen with card component"
```

---

### Task 9: Add / Edit Product Screen

**Files:**
- Create: `src/components/PhotoPicker.tsx`
- Modify: `src/screens/AddEditProductScreen.tsx`

- [ ] **Step 1: Create `src/components/PhotoPicker.tsx`**

```typescript
import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  uri: string | null;
  onChange: (uri: string | null) => void;
}

export function PhotoPicker({ uri, onChange }: Props) {
  const pick = async (source: 'camera' | 'gallery') => {
    const fn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) onChange(result.assets[0].uri);
  };

  const showOptions = () => {
    Alert.alert('Product Photo', 'Choose source', [
      { text: 'Camera', onPress: () => pick('camera') },
      { text: 'Gallery', onPress: () => pick('gallery') },
      { text: 'Remove Photo', onPress: () => onChange(null), style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity onPress={showOptions} style={styles.container}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.label}>Add Photo</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', marginVertical: 12 },
  image: { width: 160, height: 160, borderRadius: 12 },
  placeholder: {
    width: 160, height: 160, borderRadius: 12,
    backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 48 },
  label: { color: '#555', marginTop: 4 },
});
```

- [ ] **Step 2: Replace `src/screens/AddEditProductScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSQLiteContext } from 'expo-sqlite';
import { AddEditProductScreenProps } from '../navigation/types';
import { addProduct, getProduct, updateProduct } from '../db/products';
import { useAppContext } from '../context/AppContext';
import { PhotoPicker } from '../components/PhotoPicker';

export function AddEditProductScreen({ route, navigation }: AddEditProductScreenProps) {
  const db = useSQLiteContext();
  const { categories, packageUnits } = useAppContext();
  const productId = route.params?.productId;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [packageAmount, setPackageAmount] = useState('');
  const [packageUnitId, setPackageUnitId] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [loading, setLoading] = useState(!!productId);

  useEffect(() => {
    if (!productId) return;
    getProduct(db, productId).then((p) => {
      if (p) {
        setName(p.name);
        setCategoryId(p.category_id);
        setPhotoUri(p.photo_uri);
        setPackageAmount(p.package_amount != null ? String(p.package_amount) : '');
        setPackageUnitId(p.package_unit_id);
        setBasePrice(p.base_price != null ? String(p.base_price) : '');
      }
      setLoading(false);
    });
  }, [productId, db]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    const product = {
      name: name.trim(),
      category_id: categoryId,
      photo_uri: photoUri,
      package_amount: packageAmount ? parseFloat(packageAmount) : null,
      package_unit_id: packageUnitId,
      base_price: basePrice ? parseFloat(basePrice) : null,
    };
    if (productId) {
      await updateProduct(db, productId, product);
    } else {
      await addProduct(db, product);
    }
    navigation.goBack();
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PhotoPicker uri={photoUri} onChange={setPhotoUri} />

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input} value={name} onChangeText={setName}
        placeholder="e.g. Head & Shoulders"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={categoryId} onValueChange={(v) => setCategoryId(v)}>
          <Picker.Item label="— None —" value={null} />
          {categories.map((c) => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Package Size</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          value={packageAmount} onChangeText={setPackageAmount}
          keyboardType="numeric" placeholder="200"
        />
        <View style={[styles.pickerWrapper, { flex: 1 }]}>
          <Picker selectedValue={packageUnitId} onValueChange={(v) => setPackageUnitId(v)}>
            <Picker.Item label="—" value={null} />
            {packageUnits.map((u) => <Picker.Item key={u.id} label={u.name} value={u.id} />)}
          </Picker>
        </View>
      </View>

      <Text style={styles.label}>Base Price</Text>
      <TextInput
        style={styles.input} value={basePrice} onChangeText={setBasePrice}
        keyboardType="numeric" placeholder="0.00"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveBtnText}>{productId ? 'Save Changes' : 'Add Product'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  saveBtn: {
    backgroundColor: '#1976d2', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 3: Test on device**

```bash
npx expo start --android
```

Expected: Tapping FAB opens Add Product form. Fill name, pick category, add photo, enter package size + unit + price. Save returns to grid showing new product card.

- [ ] **Step 4: Commit**

```bash
git add src/components/PhotoPicker.tsx src/screens/AddEditProductScreen.tsx
git commit -m "feat: implement add/edit product screen"
```

---

### Task 10: Product Detail — Instances Tab

**Files:**
- Create: `src/components/InstanceItem.tsx`
- Create: `src/components/InstancesTab.tsx`

- [ ] **Step 1: Create `src/components/InstanceItem.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ProductInstance } from '../db/schema';

interface Props {
  instance: ProductInstance;
  basePrice: number | null;
  isCompleted: boolean;
  onStop: (id: number) => void;
  onEdit: (id: number, startedAt: string, endedAt: string | null, price: number | null) => void;
}

export function InstanceItem({ instance, basePrice, isCompleted, onStop, onEdit }: Props) {
  const effectivePrice = instance.price ?? basePrice;
  const duration = instance.ended_at
    ? Math.round(
        (new Date(instance.ended_at).getTime() - new Date(instance.started_at).getTime()) / 86400000
      )
    : null;

  return (
    <View style={[styles.card, isCompleted && styles.completed]}>
      <Text style={styles.date}>Started: {instance.started_at}</Text>
      {instance.ended_at ? <Text style={styles.date}>Ended: {instance.ended_at}</Text> : null}
      {duration !== null ? <Text style={styles.meta}>{duration} days</Text> : null}
      {effectivePrice != null ? <Text style={styles.meta}>${effectivePrice.toFixed(2)}</Text> : null}
      <View style={styles.actions}>
        {!isCompleted ? (
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() =>
              Alert.alert('Stop usage?', 'Mark this instance as finished?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Stop', onPress: () => onStop(instance.id) },
              ])
            }
          >
            <Text style={styles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => onEdit(instance.id, instance.started_at, instance.ended_at, instance.price)}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginVertical: 4, elevation: 1 },
  completed: { opacity: 0.65 },
  date: { fontSize: 14, color: '#333' },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  stopBtn: { backgroundColor: '#d32f2f', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  stopBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  editBtn: { backgroundColor: '#1976d2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
```

- [ ] **Step 2: Create `src/components/InstancesTab.tsx`**

```typescript
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { ProductInstance } from '../db/schema';
import { getInstances, addInstance, stopInstance, updateInstance } from '../db/instances';
import { InstanceItem } from './InstanceItem';

interface Props {
  productId: number;
  basePrice: number | null;
  onRefreshProduct: () => void;
}

export function InstancesTab({ productId, basePrice, onRefreshProduct }: Props) {
  const db = useSQLiteContext();
  const [instances, setInstances] = useState<ProductInstance[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<ProductInstance | null>(null);
  const [formStartDate, setFormStartDate] = useState(new Date());
  const [formEndDate, setFormEndDate] = useState<Date | null>(null);
  const [formPrice, setFormPrice] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const load = useCallback(async () => {
    setInstances(await getInstances(db, productId, showCompleted));
  }, [db, productId, showCompleted]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingInstance(null);
    setFormStartDate(new Date());
    setFormEndDate(null);
    setFormPrice(basePrice != null ? String(basePrice) : '');
    setShowModal(true);
  };

  const openEdit = (id: number, startedAt: string, endedAt: string | null, price: number | null) => {
    const inst = instances.find((i) => i.id === id);
    if (!inst) return;
    setEditingInstance(inst);
    setFormStartDate(new Date(startedAt));
    setFormEndDate(endedAt ? new Date(endedAt) : null);
    setFormPrice(price != null ? String(price) : basePrice != null ? String(basePrice) : '');
    setShowModal(true);
  };

  const save = async () => {
    const startedAt = formStartDate.toISOString().split('T')[0];
    const endedAt = formEndDate ? formEndDate.toISOString().split('T')[0] : null;
    const price = formPrice ? parseFloat(formPrice) : null;
    if (editingInstance) {
      await updateInstance(db, editingInstance.id, startedAt, endedAt, price);
    } else {
      await addInstance(db, productId, startedAt, price);
    }
    setShowModal(false);
    await load();
    onRefreshProduct();
  };

  const handleStop = async (id: number) => {
    await stopInstance(db, id, new Date().toISOString().split('T')[0]);
    await load();
    onRefreshProduct();
  };

  const active = instances.filter((i) => i.ended_at === null);
  const completed = instances.filter((i) => i.ended_at !== null);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {active.map((inst) => (
          <InstanceItem
            key={inst.id} instance={inst} basePrice={basePrice}
            isCompleted={false} onStop={handleStop} onEdit={openEdit}
          />
        ))}
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowCompleted((v) => !v)}>
          <Text style={styles.toggleText}>
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </Text>
        </TouchableOpacity>
        {showCompleted && completed.map((inst) => (
          <InstanceItem
            key={inst.id} instance={inst} basePrice={basePrice}
            isCompleted={true} onStop={handleStop} onEdit={openEdit}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Instance</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingInstance ? 'Edit Instance' : 'Add Instance'}
            </Text>

            <Text style={styles.fieldLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
              <Text>{formStartDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={formStartDate} mode="date"
                onChange={(_, d) => { setShowStartPicker(false); if (d) setFormStartDate(d); }}
              />
            )}

            {editingInstance ? (
              <>
                <Text style={styles.fieldLabel}>End Date (optional)</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                  <Text>{formEndDate ? formEndDate.toISOString().split('T')[0] : '— Not set —'}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={formEndDate ?? new Date()} mode="date"
                    onChange={(_, d) => { setShowEndPicker(false); if (d) setFormEndDate(d); }}
                  />
                )}
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Price (optional)</Text>
            <TextInput
              style={styles.input} value={formPrice} onChangeText={setFormPrice}
              keyboardType="numeric"
              placeholder={basePrice != null ? `Default: ${basePrice}` : '0.00'}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} style={styles.saveBtn}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 12 },
  toggleBtn: { paddingVertical: 12, alignItems: 'center' },
  toggleText: { color: '#1976d2', fontWeight: '600' },
  addBtn: { margin: 12, backgroundColor: '#1976d2', borderRadius: 10, padding: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  dateBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/InstanceItem.tsx src/components/InstancesTab.tsx
git commit -m "feat: add instances tab with add/stop/edit/show-completed"
```

---

### Task 11: Product Detail — Stats Tab & Full Detail Screen

**Files:**
- Create: `src/components/StatsTab.tsx`
- Modify: `src/screens/ProductDetailScreen.tsx`

- [ ] **Step 1: Create `src/components/StatsTab.tsx`**

```typescript
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
```

- [ ] **Step 2: Replace `src/screens/ProductDetailScreen.tsx`**

```typescript
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
```

- [ ] **Step 3: Test on device**

```bash
npx expo start --android
```

Expected: Tapping a product card opens Product Detail with Instances and Stats tabs. Instances tab shows active instances with Stop/Edit. Stopping an instance hides it; toggling "Show Completed" reveals it. Stats tab shows empty state until an instance is completed, then shows all metrics with Day/Month/Year toggle.

- [ ] **Step 4: Commit**

```bash
git add src/components/StatsTab.tsx src/screens/ProductDetailScreen.tsx
git commit -m "feat: implement product detail screen with instances and stats tabs"
```

---

### Task 12: Settings Screen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Replace `src/screens/SettingsScreen.tsx`**

```typescript
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppContext } from '../context/AppContext';
import { Category, PackageUnit } from '../db/schema';
import {
  addCategory, updateCategory, deleteCategory, isCategoryInUse,
} from '../db/categories';
import {
  addPackageUnit, updatePackageUnit, deletePackageUnit, isPackageUnitInUse,
} from '../db/packageUnits';
import { getCategories } from '../db/categories';
import { getPackageUnits } from '../db/packageUnits';
import { getProducts } from '../db/products';
import { getInstances } from '../db/instances';
import { serializeData, validateImportData } from '../utils/exportImport';

type EditModal = { type: 'category' | 'unit'; item: Category | PackageUnit | null } | null;

export function SettingsScreen() {
  const db = useSQLiteContext();
  const { categories, packageUnits, refreshCategories, refreshPackageUnits } = useAppContext();
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [editName, setEditName] = useState('');

  const openAdd = (type: 'category' | 'unit') => {
    setEditModal({ type, item: null });
    setEditName('');
  };

  const openEdit = (type: 'category' | 'unit', item: Category | PackageUnit) => {
    setEditModal({ type, item });
    setEditName(item.name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editModal) return;
    if (editModal.type === 'category') {
      editModal.item
        ? await updateCategory(db, editModal.item.id, editName.trim())
        : await addCategory(db, editName.trim());
      await refreshCategories();
    } else {
      editModal.item
        ? await updatePackageUnit(db, editModal.item.id, editName.trim())
        : await addPackageUnit(db, editName.trim());
      await refreshPackageUnits();
    }
    setEditModal(null);
  };

  const handleDelete = async (type: 'category' | 'unit', item: Category | PackageUnit) => {
    const inUse = type === 'category'
      ? await isCategoryInUse(db, item.id)
      : await isPackageUnitInUse(db, item.id);

    if (inUse) {
      Alert.alert('Cannot Delete', `"${item.name}" is used by one or more products. Reassign those products first.`);
      return;
    }
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (type === 'category') {
            await deleteCategory(db, item.id);
            await refreshCategories();
          } else {
            await deletePackageUnit(db, item.id);
            await refreshPackageUnits();
          }
        },
      },
    ]);
  };

  const handleExport = async () => {
    const [cats, units, prods] = await Promise.all([
      getCategories(db), getPackageUnits(db), getProducts(db),
    ]);
    const allInstances = (
      await Promise.all(prods.map((p) => getInstances(db, p.id, true)))
    ).flat();
    const json = serializeData(cats, units, prods, allInstances);
    const path = FileSystem.cacheDirectory + 'productspan-export.json';
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export ProductSpan data' });
  };

  const handleImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return;
    const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const data = validateImportData(content);
    if (!data) {
      Alert.alert('Import Failed', 'The file is not a valid ProductSpan export.');
      return;
    }
    Alert.alert('Import Data', 'How would you like to import?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Merge',
        onPress: async () => {
          for (const c of data.categories) await addCategory(db, c.name);
          for (const u of data.package_units) await addPackageUnit(db, u.name);
          for (const p of data.products) {
            await db.runAsync(
              'INSERT INTO products (name, category_id, photo_uri, package_amount, package_unit_id, base_price) VALUES (?,?,?,?,?,?)',
              [p.name, p.category_id, p.photo_uri, p.package_amount, p.package_unit_id, p.base_price]
            );
          }
          await refreshCategories();
          await refreshPackageUnits();
          Alert.alert('Done', 'Data merged successfully.');
        },
      },
      {
        text: 'Replace', style: 'destructive',
        onPress: async () => {
          await db.execAsync(
            'DELETE FROM product_instances; DELETE FROM products; DELETE FROM categories; DELETE FROM package_units;'
          );
          for (const c of data.categories)
            await db.runAsync('INSERT INTO categories (id, name) VALUES (?,?)', [c.id, c.name]);
          for (const u of data.package_units)
            await db.runAsync('INSERT INTO package_units (id, name) VALUES (?,?)', [u.id, u.name]);
          for (const p of data.products)
            await db.runAsync(
              'INSERT INTO products (id, name, category_id, photo_uri, package_amount, package_unit_id, base_price) VALUES (?,?,?,?,?,?,?)',
              [p.id, p.name, p.category_id, p.photo_uri, p.package_amount, p.package_unit_id, p.base_price]
            );
          for (const i of data.product_instances)
            await db.runAsync(
              'INSERT INTO product_instances (id, product_id, started_at, ended_at, price) VALUES (?,?,?,?,?)',
              [i.id, i.product_id, i.started_at, i.ended_at, i.price]
            );
          await refreshCategories();
          await refreshPackageUnits();
          Alert.alert('Done', 'Data replaced successfully.');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Categories" onAdd={() => openAdd('category')} />
      {categories.map((c) => (
        <ItemRow key={c.id} name={c.name}
          onEdit={() => openEdit('category', c)}
          onDelete={() => handleDelete('category', c)}
        />
      ))}

      <SectionHeader title="Package Units" onAdd={() => openAdd('unit')} />
      {packageUnits.map((u) => (
        <ItemRow key={u.id} name={u.name}
          onEdit={() => openEdit('unit', u)}
          onDelete={() => handleDelete('unit', u)}
        />
      ))}

      <SectionHeader title="Data" />
      <TouchableOpacity style={styles.dataBtn} onPress={handleExport}>
        <Text style={styles.dataBtnText}>Export Data (JSON)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dataBtn} onPress={handleImport}>
        <Text style={styles.dataBtnText}>Import Data (JSON)</Text>
      </TouchableOpacity>

      <Modal visible={!!editModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {editModal?.item
                ? `Edit ${editModal.type === 'category' ? 'Category' : 'Unit'}`
                : `Add ${editModal?.type === 'category' ? 'Category' : 'Unit'}`}
            </Text>
            <TextInput
              style={styles.dialogInput} value={editName}
              onChangeText={setEditName} autoFocus placeholder="Name"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setEditModal(null)} style={styles.cancelBtn}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onAdd ? (
        <TouchableOpacity onPress={onAdd}>
          <Text style={styles.addLink}>+ Add</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ItemRow({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.itemName}>{name}</Text>
      <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
        <Text style={styles.actionEdit}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
        <Text style={styles.actionDelete}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 24, marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  addLink: { color: '#1976d2', fontWeight: '600' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, padding: 12, marginBottom: 4, elevation: 1,
  },
  itemName: { flex: 1, fontSize: 15 },
  actionBtn: { paddingHorizontal: 10 },
  actionEdit: { color: '#1976d2' },
  actionDelete: { color: '#d32f2f' },
  dataBtn: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, elevation: 1 },
  dataBtnText: { fontSize: 15, color: '#1976d2', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dialog: { backgroundColor: '#fff', borderRadius: 14, padding: 20, width: '80%' },
  dialogTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  dialogInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 12 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
});
```

- [ ] **Step 2: Run all tests**

```bash
npx jest
```

Expected: All tests pass.

- [ ] **Step 3: Test on device**

```bash
npx expo start --android
```

Expected: Settings tab shows Categories (Cosmetics, Food), Package Units (g, ml, oz, kg, L, pcs), and Data buttons. Add/edit/delete works with guard on in-use items. Export opens share sheet with JSON. Import picks file and prompts Merge/Replace.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: implement settings screen with categories, units, export/import"
```

---

## Spec Coverage Check

| Requirement | Task |
|---|---|
| Add product (name, photo, category) | Task 9 |
| Settings: manage categories | Task 12 |
| Settings: manage package units | Task 12 |
| Product grid layout | Task 8 |
| Product instances: start, stop, editable date | Task 10 |
| Completed instances hidden, toggle to reveal | Task 10 |
| Product detail: tabbed Instances + Stats | Task 11 |
| Stats: total used, avg/min/max duration | Task 11 |
| Stats: total expense, total amount used | Task 11 |
| Stats: price/unit per day/month/year toggle | Task 11 |
| Package size (amount + unit) on product | Task 9 |
| Base price + per-instance price override | Tasks 9, 10 |
| Export JSON + share | Task 12 |
| Import JSON (merge / replace) | Task 12 |
| Android 12–14 (API 31–34) | Task 1 |
