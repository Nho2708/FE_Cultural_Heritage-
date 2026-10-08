import { Alert, Platform } from 'react-native';

/** Hộp xác nhận một việc không hoàn tác được: hộp thoại hệ thống trên điện thoại, `window.confirm` khi chạy trong trình duyệt (bản web để thử build, nơi `Alert` không hiện gì). */
export function confirmAction(title: string, message: string | undefined, yes: string, no: string, onYes: () => void): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm([title, message].filter(Boolean).join('\n\n'))) onYes();
    return;
  }
  // Hộp thoại Android cắt tiêu đề sau hai dòng (câu hỏi "Đồng ý không?" ở cuối bị mất): câu dài không kèm lời nhắn thì đưa vào phần nội dung, để tiêu đề trống.
  Alert.alert(message === undefined ? '' : title, message ?? title, [
    { text: no, style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}
