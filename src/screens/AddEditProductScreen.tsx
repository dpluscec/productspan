import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSQLiteContext } from 'expo-sqlite';
import { AddEditProductScreenProps } from '../navigation/types';
import { addProduct, getProduct, updateProduct } from '../db/products';
import { useAppContext } from '../context/AppContext';
import { PhotoPicker } from '../components/PhotoPicker';

export function AddEditProductScreen({ route, navigation }: AddEditProductScreenProps) {
  const db = useSQLiteContext();
  const { categories, packageUnits } = useAppContext();
  const productId = route.params?.productId;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [packageAmount, setPackageAmount] = useState('');
  const [packageUnitId, setPackageUnitId] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [loading, setLoading] = useState(!!productId);

  useEffect(() => {
    if (!productId) return;
    getProduct(db, productId).then((p) => {
      if (p) {
        setName(p.name);
        setCategoryId(p.category_id);
        setPhotoUri(p.photo_uri);
        setPackageAmount(p.package_amount != null ? String(p.package_amount) : '');
        setPackageUnitId(p.package_unit_id);
        setBasePrice(p.base_price != null ? String(p.base_price) : '');
      }
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
    if (productId) {
      await updateProduct(db, productId, product);
    } else {
      await addProduct(db, product);
    }
    navigation.goBack();
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PhotoPicker uri={photoUri} onChange={setPhotoUri} />

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input} value={name} onChangeText={setName}
        placeholder="e.g. Head & Shoulders"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={categoryId} onValueChange={(v) => setCategoryId(v)}>
          <Picker.Item label="— None —" value={null} />
          {categories.map((c) => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Package Size</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          value={packageAmount} onChangeText={setPackageAmount}
          keyboardType="numeric" placeholder="200"
        />
        <View style={[styles.pickerWrapper, { flex: 1 }]}>
          <Picker selectedValue={packageUnitId} onValueChange={(v) => setPackageUnitId(v)}>
            <Picker.Item label="—" value={null} />
            {packageUnits.map((u) => <Picker.Item key={u.id} label={u.name} value={u.id} />)}
          </Picker>
        </View>
      </View>

      <Text style={styles.label}>Base Price</Text>
      <TextInput
        style={styles.input} value={basePrice} onChangeText={setBasePrice}
        keyboardType="numeric" placeholder="0.00"
      />

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveBtnText}>{productId ? 'Save Changes' : 'Add Product'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  saveBtn: {
    backgroundColor: '#1976d2', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
