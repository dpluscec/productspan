import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppContext } from '../context/AppContext';
import { Category, PackageUnit } from '../db/schema';
import {
  addCategory, updateCategory, deleteCategory, isCategoryInUse,
} from '../db/categories';
import {
  addPackageUnit, updatePackageUnit, deletePackageUnit, isPackageUnitInUse,
} from '../db/packageUnits';
import { getCategories } from '../db/categories';
import { getPackageUnits } from '../db/packageUnits';
import { getProducts } from '../db/products';
import { getInstances } from '../db/instances';
import { serializeData, validateImportData } from '../utils/exportImport';

type EditModal = { type: 'category' | 'unit'; item: Category | PackageUnit | null } | null;

export function SettingsScreen() {
  const db = useSQLiteContext();
  const { categories, packageUnits, refreshCategories, refreshPackageUnits } = useAppContext();
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [editName, setEditName] = useState('');

  const openAdd = (type: 'category' | 'unit') => {
    setEditModal({ type, item: null });
    setEditName('');
  };

  const openEdit = (type: 'category' | 'unit', item: Category | PackageUnit) => {
    setEditModal({ type, item });
    setEditName(item.name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editModal) return;
    if (editModal.type === 'category') {
      editModal.item
        ? await updateCategory(db, editModal.item.id, editName.trim())
        : await addCategory(db, editName.trim());
      await refreshCategories();
    } else {
      editModal.item
        ? await updatePackageUnit(db, editModal.item.id, editName.trim())
        : await addPackageUnit(db, editName.trim());
      await refreshPackageUnits();
    }
    setEditModal(null);
  };

  const handleDelete = async (type: 'category' | 'unit', item: Category | PackageUnit) => {
    const inUse = type === 'category'
      ? await isCategoryInUse(db, item.id)
      : await isPackageUnitInUse(db, item.id);

    if (inUse) {
      Alert.alert('Cannot Delete', `"${item.name}" is used by one or more products. Reassign those products first.`);
      return;
    }
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (type === 'category') {
            await deleteCategory(db, item.id);
            await refreshCategories();
          } else {
            await deletePackageUnit(db, item.id);
            await refreshPackageUnits();
          }
        },
      },
    ]);
  };

  const handleExport = async () => {
    const [cats, units, prods] = await Promise.all([
      getCategories(db), getPackageUnits(db), getProducts(db),
    ]);
    const allInstances = (
      await Promise.all(prods.map((p) => getInstances(db, p.id, true)))
    ).flat();
    const json = serializeData(cats, units, prods, allInstances);
    const path = FileSystem.cacheDirectory + 'productspan-export.json';
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export ProductSpan data' });
  };

  const handleImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return;
    const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const data = validateImportData(content);
    if (!data) {
      Alert.alert('Import Failed', 'The file is not a valid ProductSpan export.');
      return;
    }
    Alert.alert('Import Data', 'How would you like to import?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Merge',
        onPress: async () => {
          for (const c of data.categories) await addCategory(db, c.name);
          for (const u of data.package_units) await addPackageUnit(db, u.name);
          for (const p of data.products) {
            await db.runAsync(
              'INSERT INTO products (name, category_id, photo_uri, package_amount, package_unit_id, base_price) VALUES (?,?,?,?,?,?)',
              [p.name, p.category_id, p.photo_uri, p.package_amount, p.package_unit_id, p.base_price]
            );
          }
          await refreshCategories();
          await refreshPackageUnits();
          Alert.alert('Done', 'Data merged successfully.');
        },
      },
      {
        text: 'Replace', style: 'destructive',
        onPress: async () => {
          await db.execAsync(
            'DELETE FROM product_instances; DELETE FROM products; DELETE FROM categories; DELETE FROM package_units;'
          );
          for (const c of data.categories)
            await db.runAsync('INSERT INTO categories (id, name) VALUES (?,?)', [c.id, c.name]);
          for (const u of data.package_units)
            await db.runAsync('INSERT INTO package_units (id, name) VALUES (?,?)', [u.id, u.name]);
          for (const p of data.products)
            await db.runAsync(
              'INSERT INTO products (id, name, category_id, photo_uri, package_amount, package_unit_id, base_price) VALUES (?,?,?,?,?,?,?)',
              [p.id, p.name, p.category_id, p.photo_uri, p.package_amount, p.package_unit_id, p.base_price]
            );
          for (const i of data.product_instances)
            await db.runAsync(
              'INSERT INTO product_instances (id, product_id, started_at, ended_at, price) VALUES (?,?,?,?,?)',
              [i.id, i.product_id, i.started_at, i.ended_at, i.price]
            );
          await refreshCategories();
          await refreshPackageUnits();
          Alert.alert('Done', 'Data replaced successfully.');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Categories" onAdd={() => openAdd('category')} />
      {categories.map((c) => (
        <ItemRow key={c.id} name={c.name}
          onEdit={() => openEdit('category', c)}
          onDelete={() => handleDelete('category', c)}
        />
      ))}

      <SectionHeader title="Package Units" onAdd={() => openAdd('unit')} />
      {packageUnits.map((u) => (
        <ItemRow key={u.id} name={u.name}
          onEdit={() => openEdit('unit', u)}
          onDelete={() => handleDelete('unit', u)}
        />
      ))}

      <SectionHeader title="Data" />
      <TouchableOpacity style={styles.dataBtn} onPress={handleExport}>
        <Text style={styles.dataBtnText}>Export Data (JSON)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dataBtn} onPress={handleImport}>
        <Text style={styles.dataBtnText}>Import Data (JSON)</Text>
      </TouchableOpacity>

      <Modal visible={!!editModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {editModal?.item
                ? `Edit ${editModal.type === 'category' ? 'Category' : 'Unit'}`
                : `Add ${editModal?.type === 'category' ? 'Category' : 'Unit'}`}
            </Text>
            <TextInput
              style={styles.dialogInput} value={editName}
              onChangeText={setEditName} autoFocus placeholder="Name"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setEditModal(null)} style={styles.cancelBtn}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onAdd ? (
        <TouchableOpacity onPress={onAdd}>
          <Text style={styles.addLink}>+ Add</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ItemRow({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.itemName}>{name}</Text>
      <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
        <Text style={styles.actionEdit}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
        <Text style={styles.actionDelete}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 24, marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  addLink: { color: '#1976d2', fontWeight: '600' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, padding: 12, marginBottom: 4, elevation: 1,
  },
  itemName: { flex: 1, fontSize: 15 },
  actionBtn: { paddingHorizontal: 10 },
  actionEdit: { color: '#1976d2' },
  actionDelete: { color: '#d32f2f' },
  dataBtn: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, elevation: 1 },
  dataBtnText: { fontSize: 15, color: '#1976d2', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dialog: { backgroundColor: '#fff', borderRadius: 14, padding: 20, width: '80%' },
  dialogTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  dialogInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 12 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
});
