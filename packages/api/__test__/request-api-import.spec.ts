import { RequestAPI } from '../lib';

describe('import control', () => {
  test('import class', () => {
    expect(RequestAPI).not.toBeNull();
  });
});
