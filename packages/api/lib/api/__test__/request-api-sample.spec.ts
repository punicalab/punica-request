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
    request: { hostname: 'http://host:port/api/' },
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
      .get({
        path: 'url',
        query: new URLSearchParams({ data: '5' }),
        contentType: 'json'
      })
      .then((d) => {
        expect(d.get('data')).toEqual('5');
      });
  });

  test('delete', async () => {
    return request
      .delete({
        path: 'url',
        query: new URLSearchParams({ data: '5' }),
        contentType: 'json'
      })
      .then((d) => {
        expect(d.get('data')).toEqual('5');
      });
  });

  test('post', async () => {
    return request
      .post({ path: 'url', data: { data: 5 }, contentType: 'json' })
      .then((d) => {
        expect(d).toEqual({ data: 5 });
      });
  });

  test('put', async () => {
    return request
      .put({ path: 'url', data: { data: 5 }, contentType: 'json' })
      .then((d) => {
        expect(d).toEqual({ data: 5 });
      });
  });

  test('patch', async () => {
    return request
      .patch({
        path: 'url',
        data: [{ op: 'add', path: '' }],
        contentType: 'json'
      })
      .then((d) => {
        expect(d).toEqual([{ op: 'add', path: '' }]);
      });
  });

  test.todo('send operation');
});
