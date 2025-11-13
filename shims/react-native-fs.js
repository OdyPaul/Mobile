// shims/react-native-fs.js
// Minimal shim so Metro can resolve `react-native-fs` in Expo managed apps.
// We don't actually use bundleResourceIO, so these should never be called.

const notSupported = (name) => () => {
  throw new Error(`react-native-fs.${name} is not available in Expo managed workflow`);
};

const RNFS = {
  readFile: notSupported('readFile'),
  readFileAssets: notSupported('readFileAssets'),
  exists: async () => false,
  stat: notSupported('stat'),
  readDir: notSupported('readDir'),
  // Some libs probe these constants:
  DocumentDirectoryPath: '',
  MainBundlePath: '',
  CachesDirectoryPath: '',
  TemporaryDirectoryPath: '',
};

module.exports = RNFS;
