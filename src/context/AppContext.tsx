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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [packageUnits, setPackageUnits] = useState<PackageUnit[]>([]);
  const [productFilterCategoryIds, setProductFilterCategoryIds] = useState<number[]>([]);

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
    <AppContext.Provider value={{ categories, packageUnits, refreshCategories, refreshPackageUnits, productFilterCategoryIds, setProductFilterCategoryIds }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
