import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayerFactory } from './audioNarrator';

// Nối `AudioNarrator` với expo-audio (có sẵn trong Expo Go; bản APK phải dựng lại vì là mô-đun gốc).

let audioModeReady = false;

/** Thuyết minh là nội dung chính nên vẫn phát khi iPhone gạt im lặng; đặt một lần cho cả app. */
function ensureAudioMode(): void {
  if (audioModeReady) return;
  audioModeReady = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
}

export const expoAudioPlayer: AudioPlayerFactory = (url, onStatus) => {
  ensureAudioMode();
  const player = createAudioPlayer({ uri: url }, { updateInterval: 100 });
  player.shouldCorrectPitch = true;
  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    onStatus({
      positionMs: status.currentTime * 1000,
      finished: status.didJustFinish,
      error: Boolean(status.error) || status.playbackState === 'failed' || status.playbackState === 'error',
    });
  });
  return {
    play: () => player.play(),
    pause: () => player.pause(),
    seekTo: (positionMs) => void player.seekTo(positionMs / 1000).catch(() => undefined),
    setRate: (rate) => player.setPlaybackRate(rate, 'medium'),
    release: () => {
      subscription.remove();
      player.remove();
    },
  };
};
