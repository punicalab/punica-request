module.exports = {
  roots: ['<rootDir>/packages'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }]
  },
  testRegex: '/__test__/.*\\.(test|spec)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Tests run against the sources of the packages, not their builds
  moduleNameMapper: {
    '^@punica/request$': '<rootDir>/packages/api/lib',
    '^@punica/request-fetch$': '<rootDir>/packages/api-fetch/lib',
    '^@punica/request-http$': '<rootDir>/packages/api-http/lib',
    '^@punica/request-middleware$': '<rootDir>/packages/middleware/lib'
  },
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text-summary'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/__test__/']
};
