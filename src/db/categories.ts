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
