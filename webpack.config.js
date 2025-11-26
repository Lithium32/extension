import path from "path";
import { fileURLToPath } from "url";
import CopyWebpackPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import RemoveEmptyScriptsPlugin from "webpack-remove-empty-scripts";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "production",
  entry: {
    content: "./scripts/content.js",
    background: "./scripts/background.js",
    popup: "./scripts/popup.js",
	bridge: "./scripts/bridge.js",
	style: "./scripts/css/style.css"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true, // 清理输出目录
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, // 负责提取 CSS 到独立文件
          'css-loader'                 // 解析 CSS 文件中的 @import 和 url()
        ]
      },
    ],
  },
  plugins: [
	new RemoveEmptyScriptsPlugin(), // 清理空JS文件
    new CopyWebpackPlugin({
      patterns: [
        { from: "./image", to: "image" },
        {
          from: "manifest.json",
          to: "manifest.json",
        },

        // 如果需要复制其他静态文件，如图标，在这里添加
      ],
    }),
    new HtmlWebpackPlugin({
      filename: "popup.html",
      template: "./scripts/popup.html",
      chunks: ["popup"],
    }),
    new MiniCssExtractPlugin({
      filename: 'style.css' // 定义输出 CSS 文件的名称
    })
  ],
  devtool: "cheap-source-map",
  resolve: {
    extensions: [".js", ".json"],
    alias: {
      "@": path.resolve(__dirname, "script"),
      "@utils": path.resolve(__dirname, "script/utils"),
      "@registry": path.resolve(__dirname, "script/registry"),
      "@handlers": path.resolve(__dirname, "script/handlers"),
    },
  },
};
