import { SQLiteDatabase } from 'expo-sqlite';

export async function getSetting(db: SQLiteDatabase, key: string, fallback: string): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}
