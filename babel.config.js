module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // STEM-151: Disable reanimated Babel plugin in Jest — it requires
      // react-native-worklets which is not available in the test environment.
      ...(process.env.NODE_ENV === 'test' ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};