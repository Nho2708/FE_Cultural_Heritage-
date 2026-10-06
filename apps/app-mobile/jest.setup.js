// Nơi lưu của điện thoại không có trong Jest: dùng bản giả của AsyncStorage (SecureStore chỉ được gọi khi chạy thật).
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
