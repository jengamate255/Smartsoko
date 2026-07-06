const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@rneui/base', '@rneui/themed'],
      },
    },
    argv
  );

  // Customize the config for web support
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
  };

  return config;
};
