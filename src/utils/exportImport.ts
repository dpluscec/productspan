import { Category, PackageUnit, Product, ProductInstance } from '../db/schema';

export interface ExportData {
  version: number;
  exported_at: string;
  categories: Category[];
  package_units: PackageUnit[];
  products: Product[];
  product_instances: ProductInstance[];
}

export function serializeData(
  categories: Category[],
  packageUnits: PackageUnit[],
  products: Product[],
  instances: ProductInstance[]
): string {
  const data: ExportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    categories,
    package_units: packageUnits,
    products,
    product_instances: instances,
  };
  return JSON.stringify(data, null, 2);
}

export function validateImportData(json: string): ExportData | null {
  try {
    const parsed = JSON.parse(json);
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.package_units) ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.product_instances)
    ) {
      return null;
    }
    return parsed as ExportData;
  } catch {
    return null;
  }
}
