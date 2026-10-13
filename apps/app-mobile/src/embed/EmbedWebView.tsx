import { originOf, parseEmbedMessage, serializeEmbedMessage, type EmbedCommand, type EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../theme/ThemeProvider';

// Trang nhúng của web học tập (bản đồ, trình xem 3D) mở trong WebView. Chỉ cho đúng origin của web học tập, không đưa token nào vào trang, bỏ qua
// thông điệp lạ hoặc sai phiên bản. Tải lỗi (mạng, mã lỗi HTTP) thì báo lên để màn hình quay về danh sách hoặc bộ ảnh.

/** Cho màn hình cha gửi lệnh vào trang nhúng (đổi bộ lọc, làm nổi ghim, vị trí của khách) mà không phải tải lại trang. */
export interface EmbedWebViewHandle {
  send: (command: EmbedCommand) => void;
}

export interface EmbedWebViewProps {
  url: string;
  onMessage?: (message: EmbedMessage) => void;
  onFail: () => void;
  /** Tên cho trình đọc màn hình. */
  label: string;
  ref?: Ref<EmbedWebViewHandle>;
}

export function EmbedWebView({ url, onMessage, onFail, label, ref }: EmbedWebViewProps) {
  const theme = useTheme();
  const origin = useMemo(() => originOf(url), [url]);
  const [loading, setLoading] = useState(true);
  const webView = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({ send: (command) => webView.current?.postMessage(serializeEmbedMessage(command)) }), []);

  if (!origin) {
    // Địa chỉ cấu hình sai: không mở gì.
    queueMicrotask(onFail);
    return null;
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseEmbedMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'ready') setLoading(false);
    onMessage?.(message);
  };

  return (
    <View style={styles.fill} accessibilityLabel={label}>
      <WebView
        ref={webView}
        source={{ uri: url }}
        originWhitelist={[`${origin}*`]}
        onShouldStartLoadWithRequest={(request) => originOf(request.url) === origin || request.url === 'about:blank'}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        onError={onFail}
        // Tiến trình vẽ của WebView bị hệ thống dừng (thiếu bộ nhớ, GPU lỗi): không để người dùng nhìn trang trắng mãi, quay về danh sách hoặc bộ ảnh.
        onRenderProcessGone={onFail}
        // Chỉ lỗi của chính trang nhúng mới tính (Android còn báo cả ảnh nền bản đồ hoặc biểu tượng trang tải lỗi).
        onHttpError={(event) => {
          if (originOf(event.nativeEvent.url) === origin && event.nativeEvent.url.split('?')[0] === url.split('?')[0]) onFail();
        }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        style={styles.fill}
      />
      {loading ? (
        <View style={[styles.overlay, { backgroundColor: theme.color.background }]} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.color.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
