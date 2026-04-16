import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Modal, FlatList,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSQLiteContext } from 'expo-sqlite';
import { AddEditProductScreenProps } from '../navigation/types';
import { addProduct, getProduct, updateProduct } from '../db/products';
import { useAppContext } from '../context/AppContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { PhotoPicker } from '../components/PhotoPicker';

type SelectOption = { label: string; value: number };

function SelectField({ value, options, onChange, placeholder }: {
  value: number | null;
  options: SelectOption[];
  onChange: (value: number | null) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.selectText : styles.selectPlaceholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.selectChevron}>›</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => { onChange(null); setOpen(false); }}
            >
              <Text style={styles.modalNoneText}>{placeholder}</Text>
            </TouchableOpacity>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.modalItemText, item.value === value && styles.modalItemSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export function AddEditProductScreen({ route, navigation }: AddEditProductScreenProps) {
  const db = useSQLiteContext();
  const { categories, packageUnits } = useAppContext();
  const headerHeight = useHeaderHeight();
  const { showImages } = useAppSettings();
  const productId = route.params?.productId;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [packageAmount, setPackageAmount] = useState('');
  const [packageUnitId, setPackageUnitId] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [loading, setLoading] = useState(!!productId);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    getProduct(db, productId)
      .then((p) => {
        if (p) {
          setName(p.name);
          setCategoryId(p.category_id);
          setPhotoUri(p.photo_uri);
          setPackageAmount(p.package_amount != null ? String(p.package_amount) : '');
          setPackageUnitId(p.package_unit_id);
          setBasePrice(p.base_price != null ? String(p.base_price) : '');
        }
        setLoading(false);
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to load product.');
        setLoading(false);
      });
  }, [productId, db]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Name is required'); return; }
    const product = {
      name: name.trim(),
      category_id: categoryId,
      photo_uri: photoUri,
      package_amount: packageAmount ? parseFloat(packageAmount) : null,
      package_unit_id: packageUnitId,
      base_price: basePrice ? parseFloat(basePrice) : null,
    };
    try {
      if (productId) {
        await updateProduct(db, productId, product);
      } else {
        await addProduct(db, product);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save product. Please try again.');
    }
  };

  const focused = (field: string) => ({
    borderColor: focusedField === field ? '#1976d2' : '#ccc',
    borderWidth: focusedField === field ? 2 : 1,
  });

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {showImages ? <PhotoPicker uri={photoUri} onChange={setPhotoUri} /> : null}

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={[styles.input, focused('name')]}
          value={name} onChangeText={setName}
          placeholder="e.g. Head & Shoulders"
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
        />

        <Text style={styles.label}>Category</Text>
        <SelectField
          value={categoryId}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
          onChange={setCategoryId}
          placeholder="— None —"
        />

        <Text style={styles.label}>Package Size</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }, focused('packageAmount')]}
            value={packageAmount} onChangeText={setPackageAmount}
            keyboardType="numeric" placeholder="200"
            onFocus={() => setFocusedField('packageAmount')}
            onBlur={() => setFocusedField(null)}
          />
          <SelectField
            value={packageUnitId}
            options={packageUnits.map((u) => ({ label: u.name, value: u.id }))}
            onChange={setPackageUnitId}
            placeholder="— Unit —"
          />
        </View>

        <Text style={styles.label}>Base Price</Text>
        <TextInput
          style={[styles.input, focused('basePrice')]}
          value={basePrice} onChangeText={setBasePrice}
          keyboardType="numeric" placeholder="0.00"
          onFocus={() => setFocusedField('basePrice')}
          onBlur={() => setFocusedField(null)}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>{productId ? 'Save Changes' : 'Add Product'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 120 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  saveBtn: {
    backgroundColor: '#1976d2', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // SelectField
  selectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 12,
  },
  selectText: { fontSize: 16, color: '#000' },
  selectPlaceholder: { fontSize: 16, color: '#999' },
  selectChevron: { fontSize: 20, color: '#999', marginLeft: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '60%', paddingBottom: 32,
  },
  modalItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  modalNoneText: { fontSize: 16, color: '#999' },
  modalItemText: { fontSize: 16, color: '#000' },
  modalItemSelected: { color: '#1976d2', fontWeight: '600' },
});
