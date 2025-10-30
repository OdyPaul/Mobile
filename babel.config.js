module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true, // ✅ fixes the import.meta issue for Hermes
        },
      ],
    ],
    plugins: [
      'react-native-worklets-core/plugin',
      'react-native-reanimated/plugin' // MUST be last
    ],
  };
};
