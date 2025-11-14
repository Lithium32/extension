import path from "path";
import { fileURLToPath } from "url";
import CopyWebpackPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "production",
  entry: {
    content: "./scripts/content.js",
    background: "./scripts/background.js",
    popup: "./scripts/popup.js",
	bridge: "./scripts/bridge.js",
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
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
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
