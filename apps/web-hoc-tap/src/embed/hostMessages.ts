import { parseEmbedCommand, serializeEmbedMessage, type EmbedCommand, type EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { useEffect } from 'react';

// Nói chuyện với app mobile (hoặc trang cha) từ trang nhúng. App mở trang trong WebView của react-native-webview, nên trang gửi thông điệp
// bằng `ReactNativeWebView.postMessage`; mở trong khung iframe thì gửi cho cửa sổ cha. Không có token nào đi qua đây.

interface NativeBridge {
  postMessage: (data: string) => void;
}

/** Gửi một thông điệp cho nơi đã mở trang nhúng; mở trang trực tiếp trên trình duyệt thì không có ai nhận. */
export function postToHost(message: EmbedMessage): void {
  const payload = serializeEmbedMessage(message);
  const bridge = (window as unknown as { ReactNativeWebView?: NativeBridge }).ReactNativeWebView;
  if (bridge) bridge.postMessage(payload);
  else if (window.parent !== window) window.parent.postMessage(payload, '*');
}

/** Nghe lệnh từ app. Android gửi lên `document`, iOS gửi lên `window`: nghe cả hai. */
export function useHostCommands(onCommand: (command: EmbedCommand) => void): void {
  useEffect(() => {
    const handler = (event: Event) => {
      const command = parseEmbedCommand((event as MessageEvent).data);
      if (command) onCommand(command);
    };
    window.addEventListener('message', handler);
    document.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('message', handler);
    };
  }, [onCommand]);
}
