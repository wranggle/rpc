const path = require('path');
const packageDir = path.resolve(__dirname, 'packages');

// jestjs.io trumpets "zero config".. sigh... this ts/jest/lerna/rollup combo is the biggest headache of the project

module.exports = {
  clearMocks: true,
  globals: {
    'ts-jest': {
      // tsConfig: 'tsconfig.test.json'
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  notifyMode: 'failure', // https://jestjs.io/docs/en/configuration.html#notifymode-string
  rootDir: packageDir,
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.+(ts|js)'],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/test-support/"
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleDirectories: [
    "node_modules",
    packageDir,
  ],
};