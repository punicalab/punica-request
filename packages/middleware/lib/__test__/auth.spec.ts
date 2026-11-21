import { createClient } from '@punica/request';
import { cookie, tokenAuth } from '..';
import { recorder } from './support';

const baseURL = 'https://api.example.com';
const withCookies = (value: string) => {
  (globalThis as any).document = { cookie: value };
};

afterEach(() => {
  delete (globalThis as any).document;
});

describe('tokenAuth', () => {
  test('sends the token of the cookie as a bearer token', async () => {
    withCookies('other=1; token=abc');

    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [tokenAuth({ cookieName: 'token' })]
    });

    await api.get('items');

    expect(sent[0].headers.authorization).toBe('Bearer abc');
  });

  test('follows headerName and tokenFormat, whatever the token holds', async () => {
    withCookies('token=' + encodeURIComponent("a$&b$'c"));

    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        tokenAuth({
          cookieName: 'token',
          headerName: 'X-Auth',
          tokenFormat: 'Token ${token}'
        })
      ]
    });

    await api.get('items');

    expect(sent[0].headers['x-auth']).toBe("Token a$&b$'c");
  });

  test('sends the request as it is when there is no token', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [tokenAuth({ cookieName: 'token' })]
    });

    await api.get('items');

    expect(sent[0].headers).toEqual({});
  });

  test('takes the token from getToken, which may wait, for every request', async () => {
    let token = 'first';
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [tokenAuth({ getToken: async () => token })]
    });

    await api.get('items');
    token = 'second';
    await api.get('items');

    expect(sent.map((one) => one.headers.authorization)).toEqual([
      'Bearer first',
      'Bearer second'
    ]);
  });

  test('replaces an Authorization header of the client instead of adding to it', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      headers: { Authorization: 'Basic old' },
      middlewares: [tokenAuth({ getToken: () => 't' })]
    });

    await api.get('items');

    expect(sent[0].headers.authorization).toBe('Bearer t');
  });

  test('needs to know where the token is', () => {
    expect(() => tokenAuth({})).toThrow(/where the token is/);
    expect(() => (tokenAuth as any)()).toThrow(TypeError);
  });
});

describe('cookie', () => {
  test('sends the value of the cookie in the header', async () => {
    withCookies('XSRF-TOKEN=x%20y');

    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        cookie({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
      ]
    });

    await api.post('items');

    expect(sent[0].headers['x-xsrf-token']).toBe('x y');
  });

  test('sends the request as it is without the cookie, and outside a browser', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cookie({ cookieName: 'a', headerName: 'X-A' })]
    });

    await api.get('items');

    expect(sent[0].headers).toEqual({});
  });

  test('needs both names', () => {
    expect(() => cookie({ cookieName: 'a' } as any)).toThrow(/both names/);
  });
});
