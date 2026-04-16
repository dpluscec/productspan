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
