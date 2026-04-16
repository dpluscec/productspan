import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { ProductInstance } from '../db/schema';
import { getInstances, addInstance, stopInstance, updateInstance } from '../db/instances';
import { InstanceItem } from './InstanceItem';

interface Props {
  productId: number;
  basePrice: number | null;
  onRefreshProduct: () => void;
}

export function InstancesTab({ productId, basePrice, onRefreshProduct }: Props) {
  const db = useSQLiteContext();
  const [instances, setInstances] = useState<ProductInstance[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<ProductInstance | null>(null);
  const [formStartDate, setFormStartDate] = useState(new Date());
  const [formEndDate, setFormEndDate] = useState<Date | null>(null);
  const [formPrice, setFormPrice] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const load = useCallback(async () => {
    setInstances(await getInstances(db, productId, showCompleted));
  }, [db, productId, showCompleted]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingInstance(null);
    setFormStartDate(new Date());
    setFormEndDate(null);
    setFormPrice(basePrice != null ? String(basePrice) : '');
    setShowModal(true);
  };

  const openEdit = (id: number, startedAt: string, endedAt: string | null, price: number | null) => {
    const inst = instances.find((i) => i.id === id);
    if (!inst) return;
    setEditingInstance(inst);
    setFormStartDate(new Date(startedAt));
    setFormEndDate(endedAt ? new Date(endedAt) : null);
    setFormPrice(price != null ? String(price) : basePrice != null ? String(basePrice) : '');
    setShowModal(true);
  };

  const save = async () => {
    const startedAt = formStartDate.toISOString().split('T')[0];
    const endedAt = formEndDate ? formEndDate.toISOString().split('T')[0] : null;
    const price = formPrice ? parseFloat(formPrice) : null;
    try {
      if (editingInstance) {
        await updateInstance(db, editingInstance.id, startedAt, endedAt, price);
      } else {
        await addInstance(db, productId, startedAt, price);
      }
      setShowModal(false);
      await load();
      onRefreshProduct();
    } catch (e) {
      Alert.alert('Error', 'Failed to save instance. Please try again.');
    }
  };

  const handleStop = async (id: number) => {
    try {
      await stopInstance(db, id, new Date().toISOString().split('T')[0]);
      await load();
      onRefreshProduct();
    } catch (e) {
      Alert.alert('Error', 'Failed to stop instance. Please try again.');
    }
  };

  const active = instances.filter((i) => i.ended_at === null);
  const completed = instances.filter((i) => i.ended_at !== null);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {active.map((inst) => (
          <InstanceItem
            key={inst.id} instance={inst} basePrice={basePrice}
            isCompleted={false} onStop={handleStop} onEdit={openEdit}
          />
        ))}
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowCompleted((v) => !v)}>
          <Text style={styles.toggleText}>
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </Text>
        </TouchableOpacity>
        {showCompleted && completed.map((inst) => (
          <InstanceItem
            key={inst.id} instance={inst} basePrice={basePrice}
            isCompleted={true} onStop={handleStop} onEdit={openEdit}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Instance</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingInstance ? 'Edit Instance' : 'Add Instance'}
            </Text>

            <Text style={styles.fieldLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
              <Text>{formStartDate.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={formStartDate} mode="date"
                onChange={(_, d) => { setShowStartPicker(false); if (d) setFormStartDate(d); }}
              />
            )}

            {editingInstance ? (
              <>
                <Text style={styles.fieldLabel}>End Date (optional)</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity style={[styles.dateBtn, { flex: 1 }]} onPress={() => setShowEndPicker(true)}>
                    <Text>{formEndDate ? formEndDate.toISOString().split('T')[0] : '— Not set —'}</Text>
                  </TouchableOpacity>
                  {formEndDate ? (
                    <TouchableOpacity style={styles.clearDateBtn} onPress={() => setFormEndDate(null)}>
                      <Text style={styles.clearDateBtnText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {showEndPicker && (
                  <DateTimePicker
                    value={formEndDate ?? new Date()} mode="date"
                    onChange={(_, d) => { setShowEndPicker(false); if (d) setFormEndDate(d); }}
                  />
                )}
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Price (optional)</Text>
            <TextInput
              style={styles.input} value={formPrice} onChangeText={setFormPrice}
              keyboardType="numeric"
              placeholder={basePrice != null ? `Default: ${basePrice}` : '0.00'}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} style={styles.saveBtn}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 12 },
  toggleBtn: { paddingVertical: 12, alignItems: 'center' },
  toggleText: { color: '#1976d2', fontWeight: '600' },
  addBtn: { margin: 12, backgroundColor: '#1976d2', borderRadius: 10, padding: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  dateBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearDateBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center' },
  clearDateBtnText: { color: '#888', fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
});
