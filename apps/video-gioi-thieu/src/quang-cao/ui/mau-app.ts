// Màu giao diện của app (lấy từ packages/dung-chung/src/styles/tokens.css) cho phần giao diện dựng lại trong video.
// Khác màu thương hiệu (brand.ts): thương hiệu dùng cho nền và chữ của video, màu app chỉ dùng bên trong giao diện.
export const MAU_APP = {
  nen: '#FAF7F3', // wood-50
  be: '#FFFFFF',
  vien: '#E5DCD0', // wood-200
  vienDam: '#D4C6B4', // wood-300
  chuPhu: '#7C6857', // wood-600
  chu: '#2A231C', // wood-900
  son: '#A4231F', // lacquer-600
  sonNhat: '#FCEDEC', // lacquer-50
  vangNhat: '#FAE9BC', // imperial-100
  vang: '#B87F17', // imperial-600
} as const;
