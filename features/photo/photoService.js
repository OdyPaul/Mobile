import axios from 'axios';
const API_URL = process.env.EXPO_PUBLIC_API_URL;
import AsyncStorage from '@react-native-async-storage/async-storage';

const uploadPhoto = async (file) => {
  // file: { uri, name, type } from expo-image-picker or camera
  const token = await AsyncStorage.getItem('token');
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'photo.jpg',
    type: file.type || 'image/jpeg',
  });

  const config = {
    headers: {
      Authorization: `Bearer ${token ? JSON.parse(token) : ''}`,
      'Content-Type': 'multipart/form-data',
    },
  };

  const res = await axios.post(`${API_URL}/api/uploads`, form, config);
  // returns created Image document: { _id, url, publicId, ...}
  return res.data;
};

export default { uploadPhoto };
