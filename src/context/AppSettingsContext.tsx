import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getBoolSetting, setBoolSetting } from '../db/settings';

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
      getBoolSetting(db, 'show_images', false),
      getBoolSetting(db, 'group_by_category', true),
      getBoolSetting(db, 'quick_start_instance', true),
    ]).then(([img, grp, qs]) => {
      setShowImagesState(img);
      setGroupByCategoryState(grp);
      setQuickStartInstanceState(qs);
    }).catch((e) => { if (__DEV__) console.warn('AppSettings load failed', e); });
  }, [db]);

  const setShowImages = useCallback(async (v: boolean) => {
    await setBoolSetting(db, 'show_images', v);
    setShowImagesState(v);
  }, [db]);

  const setGroupByCategory = useCallback(async (v: boolean) => {
    await setBoolSetting(db, 'group_by_category', v);
    setGroupByCategoryState(v);
  }, [db]);

  const setQuickStartInstance = useCallback(async (v: boolean) => {
    await setBoolSetting(db, 'quick_start_instance', v);
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
