module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated HARUS paling terakhir
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@store': './src/store',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@database': './src/database',
            '@constants': './src/constants',
            '@types': './src/types',
            '@utils': './src/utils',
            '@assets': './assets',
            '@responsive': './src/responsive/index.ts',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
