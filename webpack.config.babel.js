import webpack from 'webpack';
import webpackRxjsExternals from 'webpack-rxjs-externals';
import CompressionPlugin from 'compression-webpack-plugin';

const env = process.env.NODE_ENV;

const config = {
  module: {
    loaders: [
      { test: /\.js$/, loaders: ['babel-loader'], exclude: /node_modules/ }
    ]
  },
  output: {
    library: 'ReduxAjaxable',
    libraryTarget: 'umd'
  },
  externals: [
    webpackRxjsExternals(), {
    redux: {
      root: 'Redux',
      commonjs2: 'redux',
      commonjs: 'redux',
      amd: 'redux'
    }
  }],
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env)
    })
  ]
};

if (env === 'production') {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false
      }
    }),
    new CompressionPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: /\.js$|\.map$/,
      threshold: 10240,
      minRatio: 0.8
    })
  );
}

export default config;
