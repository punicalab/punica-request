import { createClient, isHttpError, isRequestError } from '@punica/request';
import { fetchAdapter } from '..';

describe('fetchAdapter', () => {
  const fetchMock = jest.fn();
  const original = globalThis.fetch;
  const api = createClient({
    baseURL: 'https://host/v1',
    adapter: fetchAdapter(),
    headers: { Accept: 'application/json' },
    init: { credentials: 'include' }
  });

  beforeAll(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = original;
  });

  beforeEach(() => fetchMock.mockReset());

  test('gives fetch the address, the method, the headers, the body, the signal and init', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      })
    );

    const response = await api.post<{ id: number }>('items', {
      json: { name: 'a' },
      query: { draft: true },
      init: { redirect: 'manual' }
    });

    expect(response).toMatchObject({ ok: true, status: 201, data: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe('https://host/v1/items?draft=true');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"name":"a"}');
    expect(init.credentials).toBe('include');
    expect(init.redirect).toBe('manual');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(Object.fromEntries(init.headers)).toEqual({
      accept: 'application/json',
      'content-type': 'application/json'
    });
  });

  test('a response outside 2xx rejects with its body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not here' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      })
    );

    const error = await api.get('items/9').catch((e) => e);

    expect(isHttpError(error)).toBe(true);
    expect(error.status).toBe(404);
    expect(error.response.data).toEqual({ message: 'Not here' });
  });

  test('a request that cannot be sent rejects with reason network', async () => {
    const cause = new TypeError('Failed to fetch');

    fetchMock.mockRejectedValue(cause);

    const error = await api.get('items').catch((e) => e);

    expect(isRequestError(error) && error.reason).toBe('network');
    expect(error.cause).toBe(cause);
  });

  test('a cancelled request aborts the fetch and rejects with reason abort', async () => {
    fetchMock.mockImplementation(
      (_: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );

    const controller = new AbortController();
    const pending = api
      .get('items', { signal: controller.signal })
      .catch((e) => e);

    controller.abort();

    expect((await pending).reason).toBe('abort');
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  test('sends the credentials of the address in a header, which fetch takes', async () => {
    fetchMock.mockImplementation(async () => new Response('ok'));

    const client = createClient({
      baseURL: 'https://us%C3%A9r:p%40ss@host/v1',
      adapter: fetchAdapter()
    });

    await client.get('items');
    await client.get('items', { headers: { Authorization: 'Bearer mine' } });

    const [[url, init], [, second]] = fetchMock.mock.calls;

    expect(url).toBe('https://host/v1/items');
    expect(init.headers.get('authorization')).toBe(
      `Basic ${Buffer.from('usér:p@ss').toString('base64')}`
    );
    expect(second.headers.get('authorization')).toBe('Bearer mine');
  });

  test('uses the fetch it is given instead of the global one', async () => {
    const own = jest.fn(async () => new Response('hello'));
    const client = createClient({
      baseURL: 'https://host',
      adapter: fetchAdapter({ fetch: own as unknown as typeof fetch })
    });

    expect((await client.get('x')).data).toBe('hello');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('says so where there is no fetch', async () => {
    globalThis.fetch = undefined as unknown as typeof fetch;

    try {
      const error = await api.get('items').catch((e) => e);

      expect(isRequestError(error) && error.reason).toBe('network');
      expect(String(error.cause)).toMatch(/There is no fetch here/);
    } finally {
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    }
  });
});
