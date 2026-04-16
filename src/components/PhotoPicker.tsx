import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  uri: string | null;
  onChange: (uri: string | null) => void;
}

function showPermissionDeniedAlert(type: 'camera' | 'photos') {
  const label = type === 'camera' ? 'camera' : 'photo library';
  Alert.alert(
    'Permission Required',
    `ProductSpan needs access to your ${label} to add product photos. Please enable it in your device settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
}

export function PhotoPicker({ uri, onChange }: Props) {
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const pick = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const permission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();
      if (!permission.granted) {
        showPermissionDeniedAlert('camera');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled) onChange(result.assets[0].uri);
    } else {
      const permission = libraryPermission?.granted
        ? libraryPermission
        : await requestLibraryPermission();
      if (!permission.granted) {
        showPermissionDeniedAlert('photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled) onChange(result.assets[0].uri);
    }
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
