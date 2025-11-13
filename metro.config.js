// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...(config.resolver || {}),
  alias: {
    ...(config.resolver?.alias || {}),
    '@mediapipe/face_mesh': path.resolve(__dirname, 'shims/mediapipe-face_mesh.js'),
    '@mediapipe/face_detection': path.resolve(__dirname, 'shims/mediapipe-face_detection.js'),
    'react-native-fs': path.resolve(__dirname, 'shims/react-native-fs.js'),
  },
  // keep for broader Expo SDK compatibility
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    '@mediapipe/face_mesh': path.resolve(__dirname, 'shims/mediapipe-face_mesh.js'),
    '@mediapipe/face_detection': path.resolve(__dirname, 'shims/mediapipe-face_detection.js'),
    'react-native-fs': path.resolve(__dirname, 'shims/react-native-fs.js'),
  },
};

module.exports = config;
