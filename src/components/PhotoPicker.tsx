import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  uri: string | null;
  onChange: (uri: string | null) => void;
}

export function PhotoPicker({ uri, onChange }: Props) {
  const pick = async (source: 'camera' | 'gallery') => {
    const fn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) onChange(result.assets[0].uri);
  };

  const showOptions = () => {
    Alert.alert('Product Photo', 'Choose source', [
      { text: 'Camera', onPress: () => pick('camera') },
      { text: 'Gallery', onPress: () => pick('gallery') },
      { text: 'Remove Photo', onPress: () => onChange(null), style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity onPress={showOptions} style={styles.container}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.label}>Add Photo</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', marginVertical: 12 },
  image: { width: 160, height: 160, borderRadius: 12 },
  placeholder: {
    width: 160, height: 160, borderRadius: 12,
    backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 48 },
  label: { color: '#555', marginTop: 4 },
});
