import { serializeData, validateImportData, ExportData } from '../src/utils/exportImport';

const validData: ExportData = {
  version: 1,
  exported_at: '2024-01-01T00:00:00.000Z',
  categories: [{ id: 1, name: 'Cosmetics' }],
  package_units: [{ id: 1, name: 'ml' }],
  products: [{
    id: 1, name: 'Shampoo', category_id: 1,
    photo_uri: null, package_amount: 200, package_unit_id: 1, base_price: 5.99,
  }],
  product_instances: [{
    id: 1, product_id: 1, started_at: '2024-01-01', ended_at: null, price: null,
  }],
};

describe('serializeData', () => {
  it('produces valid JSON with version 1', () => {
    const parsed = JSON.parse(
      serializeData(validData.categories, validData.package_units, validData.products, validData.product_instances)
    );
    expect(parsed.version).toBe(1);
    expect(parsed.categories).toHaveLength(1);
  });

  it('includes exported_at timestamp', () => {
    const parsed = JSON.parse(serializeData([], [], [], []));
    expect(parsed.exported_at).toBeTruthy();
  });
});

describe('validateImportData', () => {
  it('returns data for a valid payload', () => {
    const result = validateImportData(JSON.stringify(validData));
    expect(result).not.toBeNull();
    expect(result!.categories).toHaveLength(1);
  });

  it('returns null for invalid JSON', () => {
    expect(validateImportData('not json')).toBeNull();
  });

  it('returns null when version is missing', () => {
    const bad = { ...validData } as any;
    delete bad.version;
    expect(validateImportData(JSON.stringify(bad))).toBeNull();
  });

  it('returns null when version is not 1', () => {
    expect(validateImportData(JSON.stringify({ ...validData, version: 2 }))).toBeNull();
  });

  it('returns null when required arrays are missing', () => {
    expect(validateImportData(JSON.stringify({ version: 1, exported_at: '2024-01-01T00:00:00.000Z' }))).toBeNull();
  });
});
