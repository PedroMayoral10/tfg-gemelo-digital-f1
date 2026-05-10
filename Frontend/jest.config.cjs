module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css)$': 'identity-obj-proxy',
    '\\.(svg|png|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};