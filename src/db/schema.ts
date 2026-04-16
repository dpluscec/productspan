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
