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
