import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

const uploadPhoto = async (file) => {
  // file: { uri, name, type } from expo-image-picker or camera
  const token = await AsyncStorage.getItem('token');

  const uri = Platform.OS === 'ios' ? (file.uri || '').replace('file://', '') : file.uri;

  const form = new FormData();
  form.append('file', {
    uri,
    name: file.name || 'photo.jpg',
    type: file.type || 'image/jpeg',
  });

  const res = await fetch(`${API_URL}/api/uploads`, {
    method: 'POST',
     headers: { Authorization: `Bearer ${token || ''}` },
    body: form,
  });

  const text = await res.text();
  console.log('📤 upload status:', res.status, 'raw:', text.slice(0, 200));
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { throw new Error('Upload did not return JSON'); }
};

export default { uploadPhoto };
