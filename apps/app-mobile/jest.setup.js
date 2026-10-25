// Nơi lưu của điện thoại không có trong Jest: dùng bản giả của AsyncStorage (SecureStore chỉ được gọi khi chạy thật).
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
// Animated.timing(... useNativeDriver: true) in tests: no native animated module, so fall back to the JS driver (otherwise it looks up host views of the test renderer).
jest.mock('react-native/src/private/animated/NativeAnimatedHelper');
// Mô-đun phát âm thanh gốc của expo-audio không có trong Jest: bản giả (test phát tiếng tự đưa trình phát giả vào qua `AudioPlayerFactory`).
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(), setAudioModeAsync: jest.fn(async () => undefined) }));
