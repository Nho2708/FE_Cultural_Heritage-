import { originOf, parseEmbedMessage, serializeEmbedMessage } from '@dsvhvn/dung-chung/embed';
import { createElement, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import type { EmbedWebViewProps } from './EmbedWebView';

// Bản chạy trong trình duyệt (chỉ để thử build web): khung iframe cùng hợp đồng thông điệp, chỉ nhận thông điệp từ đúng origin của trang nhúng.

export function EmbedWebView({ url, onMessage, label, onFail, ref }: EmbedWebViewProps) {
  const origin = originOf(url);
  const frame = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({ send: (command) => frame.current?.contentWindow?.postMessage(serializeEmbedMessage(command), origin ?? '*') }), [origin]);

  useEffect(() => {
    if (!origin) {
      onFail();
      return;
    }
    const listener = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const message = parseEmbedMessage(event.data);
      if (message) onMessage?.(message);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [origin, onMessage, onFail]);

  return <View style={{ flex: 1 }}>{createElement('iframe', { ref: frame, src: url, title: label, style: { border: 0, width: '100%', height: '100%' } })}</View>;
}
