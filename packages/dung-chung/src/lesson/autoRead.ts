import { useCallback, useEffect, useState } from 'react';

// Cấp 1 tự đọc to câu chuyện và câu hỏi khi em vào màn (giọng đọc có sẵn của trình duyệt). Em tắt được: lựa chọn nhớ trên máy này, mặc định bật.
// localStorage có thể bị chặn (cửa sổ riêng tư): đọc, ghi đều bọc try/catch, không đọc được thì coi như bật.

const KEY = 'dsvhvn.hoc-tap.tu-doc';

export function readAutoRead(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

function writeAutoRead(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Không lưu được thì lựa chọn chỉ có tác dụng trong lần mở này.
  }
}

/** Cờ "tự đọc to" của máy này và hàm đổi cờ (có ghi lại). */
export function useAutoRead(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(readAutoRead);
  const change = useCallback((next: boolean) => {
    setOn(next);
    writeAutoRead(next);
  }, []);
  return [on, change];
}

/** Đọc to đoạn chữ khi `enabled` và mỗi khi `text` đổi (em sang đoạn hoặc câu khác). Trình duyệt chưa cho tự phát tiếng thì bỏ qua, em bấm loa là nghe. */
export function useAutoSpeak(speak: (text: string) => void, text: string, enabled: boolean) {
  useEffect(() => {
    if (enabled && text.trim() !== '') speak(text);
  }, [speak, enabled, text]);
}
