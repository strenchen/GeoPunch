const config = {
  projectName: 'GeoPunch',
  date: '2026-05-07',
  framework: 'vue3',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [
    ['@tarojs/plugin-framework-vue3'],
    ['@tarojs/plugin-platform-weapp']
  ],
  defineConstants: {
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: { }
      }
    }
  },
  weapp: {
    compile: {
      compressStyle: true
    }
  }
};

module.exports = config;
