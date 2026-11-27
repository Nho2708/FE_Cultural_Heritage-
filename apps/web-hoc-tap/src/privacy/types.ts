// Kiểu nội dung của trang Chính sách quyền riêng tư. Mỗi ngôn ngữ một tệp (vi.ts là bản gốc); các bản khác phải có đúng các mục
// và đúng hình dạng thân mục như bản tiếng Việt (kiểm trong test), chỉ khác chữ.

/** Thân một mục: chuỗi là một đoạn văn, mảng chuỗi là một danh sách gạch đầu dòng. */
export type PrivacyBlock = string | readonly string[];

export interface PrivacySection {
  /** Mã neo trong trang (chữ thường không dấu), giống nhau ở mọi ngôn ngữ để liên kết tới một mục dùng được với mọi bản. */
  id: string;
  heading: string;
  body: readonly PrivacyBlock[];
}

export interface PrivacyPolicy {
  title: string;
  /** Mô tả ngắn cho thẻ meta description. */
  description: string;
  updatedLabel: string;
  /** Lời ghi chú về bản dịch; bản tiếng Việt là bản gốc nên không có. */
  translationNote?: string;
  intro: readonly string[];
  contentsLabel: string;
  sections: readonly PrivacySection[];
}
