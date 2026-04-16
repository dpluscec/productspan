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
