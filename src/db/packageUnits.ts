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
