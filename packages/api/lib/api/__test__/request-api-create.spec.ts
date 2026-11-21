import { IConfig, RequestAPI } from '../..';
import { RequestSample } from './api';

describe('create control', () => {
  const config: IConfig = { hostname: '' };

  test('create request', () => {
    const api = new RequestSample();
    const request = new RequestAPI(api, config);

    expect(request).not.toBeNull();
  });
});
