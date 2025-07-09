const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.ts',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 8080,
      hot: true,
      open: true
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        title: 'クリプト忍者咲耶コマンダー'
      }),
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'assets', 
            to: 'assets',
            noErrorOnMissing: true
          }
        ]
      })
    ],
    optimization: {
      minimize: isProduction
    },
    devtool: isProduction ? false : 'source-map'
  };
};