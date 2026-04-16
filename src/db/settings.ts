import { SQLiteDatabase } from 'expo-sqlite';

// getSetting fallback is the safety net for schema upgrades where a seed row
// may not yet exist. The authoritative defaults are the INSERT OR IGNORE seeds
// in initDatabase.
export async function getSetting(db: SQLiteDatabase, key: string, fallback: string): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function getBoolSetting(db: SQLiteDatabase, key: string, fallback: boolean): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value === '1' : fallback;
}

export async function setBoolSetting(db: SQLiteDatabase, key: string, value: boolean): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value ? '1' : '0']);
}
