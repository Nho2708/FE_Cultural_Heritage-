// Cấu hình Metro: app không thuộc npm workspaces nên Metro cần được chỉ rõ thư mục mã dùng chung và ưu tiên tìm gói trong
// node_modules của chính app. Mã dùng chung được app nạp chỉ gồm TypeScript thuần (không import React), nên không bao giờ với tới
// React 19.3 của hai web ở node_modules thư mục gốc.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../../packages/dung-chung');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
