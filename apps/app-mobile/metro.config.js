// Cấu hình Metro: app không thuộc npm workspaces nên Metro cần được chỉ rõ thư mục mã dùng chung và chỉ tìm gói trong
// node_modules của chính app (không với lên node_modules của thư mục gốc, nơi có React 19.3 của hai web).
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../../packages/dung-chung');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
