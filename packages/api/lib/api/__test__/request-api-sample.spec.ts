import { IConfig, RequestAPI } from '../..';
import { RequestSample } from './api';
import {
  SampleAMiddleware,
  SampleBMiddleware,
  SampleCMiddleware
} from './middleware';

describe('api sample', () => {
  let request: RequestAPI;
  let api: RequestSample;

  const sampleAMiddleware = new SampleAMiddleware();
  const sampleBMiddleware = new SampleBMiddleware();
  const sampleCMiddleware = new SampleCMiddleware();
  const config: IConfig = {
    request: { baseURL: '' },
    middleware: {
      request: [sampleBMiddleware, sampleAMiddleware],
      response: [sampleCMiddleware]
    }
  };

  beforeAll(() => {
    api = new RequestSample();
    request = new RequestAPI(api, config);
  });

  test('get', async () => {
    return request
      .get({ url: 'url', urlParams: { data: 5 } })
      .then(async (res) => {
        return await res.json();
      })
      .then((d) => {
        expect(d).toEqual({ data: 5 });
      });
  });

  test('delete', async () => {
    return request
      .delete({ url: 'url', urlParams: { data: 5 } })
      .then(async (res) => await res.json())
      .then((d) => {
        expect(d).toEqual({ data: 5 });
      });
  });

  test('post', async () => {
    return request
      .post({ url: 'url', data: { data: 5 } })
      .then(async (res) => await res.json())
      .then((d) => {
        expect(d).toEqual({ data: 5 });
      });
  });

  test('put', async () => {
    return request
      .put({ url: 'url', data: { data: 5 } })
      .then(async (res) => await res.json())
      .then((d) => {
        expect(d).toEqual({ data: 5 });
      });
  });
});
