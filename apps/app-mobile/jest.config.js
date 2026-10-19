const shared = '<rootDir>/../../packages/dung-chung/src';

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/src', '<rootDir>/app'],
  moduleNameMapper: {
    '^@dsvhvn/dung-chung$': `${shared}/index.ts`,
    '^@dsvhvn/dung-chung/api$': `${shared}/api/index.ts`,
    '^@dsvhvn/dung-chung/auth$': `${shared}/auth/index.ts`,
    '^@dsvhvn/dung-chung/i18n$': `${shared}/i18n/index.ts`,
    '^@dsvhvn/dung-chung/heritage-text$': `${shared}/heritageText.ts`,
    '^@dsvhvn/dung-chung/embed$': `${shared}/embed/index.ts`,
    '^@dsvhvn/dung-chung/map/route$': `${shared}/map/route.ts`,
    '^@dsvhvn/dung-chung/lesson-data$': `${shared}/lesson/lessonData.ts`,
    '^@dsvhvn/dung-chung/speech$': `${shared}/speech/index.ts`,
    '^@dsvhvn/dung-chung/theme$': `${shared}/theme/index.ts`,
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
};
