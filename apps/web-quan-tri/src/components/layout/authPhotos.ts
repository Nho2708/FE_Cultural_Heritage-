// Ảnh của khung Đăng nhập và Quên / đặt mật khẩu — cùng ảnh và chú thích với khung Figma đã có.
// Ảnh mẫu từ Wikimedia Commons, giấy phép ghi ngay trên ảnh và trong README; thay bằng ảnh có bản quyền của dự án
// trước khi phát hành.

export interface AuthPhoto {
  src: string;
  alt: string;
  /** Dòng nhỏ viết hoa, viết sẵn chữ hoa để giữ dấu (label-kicker). */
  kicker: string;
  title: string;
  credit: string;
}

export const AUTH_PHOTOS = {
  signIn: {
    src: '/images/auth/chua-cau-hoi-an.jpg',
    alt: 'Chùa Cầu mái ngói cong bắc qua con lạch ở phố cổ Hội An, hai bên là nhà cổ tường vàng',
    kicker: 'PHỐ CỔ HỘI AN · LÊ TRUNG HƯNG',
    title: 'Chùa Cầu – bốn thế kỷ nối đôi bờ phố Hội',
    credit: 'Ảnh: Chùa Cầu, Hội An · Steffen Schmitz, CC BY-SA 4.0',
  },
  setPassword: {
    src: '/images/auth/van-mieu-ha-noi.jpg',
    alt: 'Cổng Văn Miếu – Quốc Tử Giám ở Hà Nội nhìn từ lối đi lát gạch giữa hàng cây',
    kicker: 'VĂN MIẾU – QUỐC TỬ GIÁM · 1070',
    title: 'Nơi khởi đầu của nền khoa cử Đại Việt',
    credit: 'Ảnh: Cổng Văn Miếu, Hà Nội · Jakub Hałun, CC BY 4.0',
  },
  recovery: {
    src: '/images/auth/ngo-mon-hue.jpg',
    alt: 'Ngọ Môn, cổng chính Hoàng thành Huế, với lầu Ngũ Phụng mái vàng xanh phía trên',
    kicker: 'QUẦN THỂ DI TÍCH CỐ ĐÔ HUẾ · NHÀ NGUYỄN',
    title: 'Ngọ Môn – cổng chính Hoàng thành Huế',
    credit: 'Ảnh: Ngọ Môn, Huế · Supanut Arun, CC BY 4.0',
  },
} satisfies Record<string, AuthPhoto>;
