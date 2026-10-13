// Tệp CSS nhập để lấy hiệu ứng phụ (bản đồ Leaflet), không có kiểu.
declare module '*.css';

// Ảnh nhận diện được Vite đóng gói và trả về đường dẫn.
declare module '*.png' {
  const src: string;
  export default src;
}
