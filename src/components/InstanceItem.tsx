import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ProductInstance } from '../db/schema';

interface Props {
  instance: ProductInstance;
  basePrice: number | null;
  isCompleted: boolean;
  onStop: (id: number) => void;
  onEdit: (id: number, startedAt: string, endedAt: string | null, price: number | null) => void;
}

export function InstanceItem({ instance, basePrice, isCompleted, onStop, onEdit }: Props) {
  const effectivePrice = instance.price ?? basePrice;
  const duration = instance.ended_at
    ? Math.max(1, Math.round(
        (new Date(instance.ended_at).getTime() - new Date(instance.started_at).getTime()) / 86400000
      ))
    : null;

  return (
    <View style={[styles.card, isCompleted && styles.completed]}>
      <Text style={styles.date}>Started: {instance.started_at}</Text>
      {instance.ended_at ? <Text style={styles.date}>Ended: {instance.ended_at}</Text> : null}
      {duration !== null ? <Text style={styles.meta}>{duration} days</Text> : null}
      {effectivePrice != null ? <Text style={styles.meta}>${effectivePrice.toFixed(2)}</Text> : null}
      <View style={styles.actions}>
        {!isCompleted ? (
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={() =>
              Alert.alert('Stop usage?', 'Mark this instance as finished?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Stop', onPress: () => onStop(instance.id) },
              ])
            }
          >
            <Text style={styles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => onEdit(instance.id, instance.started_at, instance.ended_at, instance.price)}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginVertical: 4, elevation: 1 },
  completed: { opacity: 0.65 },
  date: { fontSize: 14, color: '#333' },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  stopBtn: { backgroundColor: '#d32f2f', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  stopBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  editBtn: { backgroundColor: '#1976d2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
