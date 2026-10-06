import { originOf, parseEmbedMessage, type EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../theme/ThemeProvider';

// Trang nhúng của web học tập (bản đồ, trình xem 3D) mở trong WebView. Chỉ cho đúng origin của web học tập, không đưa token nào vào trang, bỏ qua
// thông điệp lạ hoặc sai phiên bản. Tải lỗi (mạng, mã lỗi HTTP) thì báo lên để màn hình quay về danh sách hoặc bộ ảnh.

export interface EmbedWebViewProps {
  url: string;
  onMessage?: (message: EmbedMessage) => void;
  onFail: () => void;
  /** Tên cho trình đọc màn hình. */
  label: string;
}

export function EmbedWebView({ url, onMessage, onFail, label }: EmbedWebViewProps) {
  const theme = useTheme();
  const origin = useMemo(() => originOf(url), [url]);
  const [loading, setLoading] = useState(true);

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
        source={{ uri: url }}
        originWhitelist={[`${origin}*`]}
        onShouldStartLoadWithRequest={(request) => originOf(request.url) === origin || request.url === 'about:blank'}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        onError={onFail}
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
