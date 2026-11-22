import { createClient, isRequestError } from '..';
import { recorder, json } from './support';

const baseURL = 'https://api.example.com';

describe('headers', () => {
  it('are those of the client, then those of the request', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      headers: { Accept: 'application/json', 'X-App': 'shop' }
    });

    await api.get('items', { headers: { accept: 'text/csv', 'X-Trace': '7' } });

    expect(sent[0].headers).toEqual({
      accept: 'text/csv',
      'x-app': 'shop',
      'x-trace': '7'
    });
  });

  it('of the client are dropped by null or undefined in the request', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      headers: { 'X-App': 'shop' }
    });

    await api.get('items', { headers: { 'X-App': undefined } });

    expect(sent[0].headers).toEqual({});
  });

  it('may be Headers or pairs', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      headers: new Headers({ a: '1' })
    });

    await api.get('items', { headers: [['b', '2']] });

    expect(sent[0].headers).toEqual({ a: '1', b: '2' });
  });

  it('given as pairs keep both values of a name given twice', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({ baseURL, adapter, headers: { accept: 'x/y' } });

    await api.get('items', {
      headers: [
        ['accept', 'a/b'],
        ['Accept', 'c/d']
      ]
    });

    expect(sent[0].headers.accept).toBe('a/b, c/d');
  });

  it('of one request do not stay on the client', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({ baseURL, adapter, headers: { a: '1' } });

    await api.get('items', { headers: { b: '2' } });
    await api.get('items');

    expect(sent[1].headers).toEqual({ a: '1' });
  });
});

describe('the body of a request', () => {
  it('json is serialised and gets its Content-Type', async () => {
    const { adapter, sent } = recorder();

    await createClient({ baseURL, adapter }).post('items', {
      json: { name: 'Paper' }
    });

    expect(sent[0].body).toBe('{"name":"Paper"}');
    expect(sent[0].headers['content-type']).toBe('application/json');
  });

  it('json keeps a Content-Type that is given', async () => {
    const { adapter, sent } = recorder();

    await createClient({ baseURL, adapter }).patch('items/1', {
      json: [{ op: 'remove', path: '/a' }],
      headers: { 'Content-Type': 'application/json-patch+json' }
    });

    expect(sent[0].headers['content-type']).toBe('application/json-patch+json');
  });

  it('json is not sent under a default of the client that says something else', async () => {
    const { adapter, sent } = recorder();
    const form = createClient({
      baseURL,
      adapter,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const jsonApi = createClient({
      baseURL,
      adapter,
      headers: { 'Content-Type': 'application/vnd.api+json' }
    });

    await form.post('items', { json: { a: 1 } });
    await jsonApi.post('items', { json: { a: 1 } });

    expect(sent[0].headers['content-type']).toBe('application/json');
    expect(sent[1].headers['content-type']).toBe('application/vnd.api+json');
  });

  it('json takes null, false and 0 as values', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({ baseURL, adapter });

    await api.post('a', { json: null });
    await api.post('a', { json: false });
    await api.post('a', { json: 0 });

    expect(sent.map((one) => one.body)).toEqual(['null', 'false', '0']);
  });

  it('body is sent as it is, without a Content-Type of ours', async () => {
    const { adapter, sent } = recorder();

    await createClient({ baseURL, adapter }).post('items', { body: 'a=1' });

    expect(sent[0].body).toBe('a=1');
    expect(sent[0].headers['content-type']).toBeUndefined();
  });

  it('json and body together are refused', async () => {
    const { adapter, sent } = recorder();

    await expect(
      createClient({ baseURL, adapter }).post('items', { json: {}, body: 'x' })
    ).rejects.toThrow(/"json" or "body", not both/);
    expect(sent).toHaveLength(0);
  });

  it('FormData loses a Content-Type, which only it can write', async () => {
    const { adapter, sent } = recorder();
    const form = new FormData();

    form.append('file', new Blob(['x']), 'x.txt');
    await createClient({
      baseURL,
      adapter,
      headers: { 'Content-Type': 'application/json' }
    }).post('upload', {
      body: form,
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    expect(sent[0].body).toBe(form);
    expect(sent[0].headers['content-type']).toBeUndefined();
  });

  it('URLSearchParams and typed blobs lose the default of the client, not their own', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      headers: { 'Content-Type': 'application/json' }
    });

    await api.post('a', { body: new URLSearchParams({ a: '1' }) });
    await api.post('a', { body: new Blob(['x'], { type: 'image/png' }) });
    await api.post('a', { body: new Blob(['x']) });
    await api.post('a', {
      body: new URLSearchParams({ a: '1' }),
      headers: { 'Content-Type': 'text/plain' }
    });

    expect(sent.map((one) => one.headers['content-type'])).toEqual([
      undefined,
      undefined,
      'application/json',
      'text/plain'
    ]);
  });

  it.each(['get', 'head'] as const)(
    'is refused for %s before anything runs',
    async (method) => {
      const { adapter, sent } = recorder();
      const middleware = jest.fn((_, next) => next());
      const api = createClient({ baseURL, adapter, middlewares: [middleware] });

      await expect(api[method]('items', { json: { a: 1 } })).rejects.toThrow(
        /request cannot have a body/
      );
      expect(middleware).not.toHaveBeenCalled();
      expect(sent).toHaveLength(0);
    }
  );

  it('is refused for GET when a middleware adds it', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        (context, next) => {
          context.body = 'x';

          return next();
        }
      ]
    });

    await expect(api.get('items')).rejects.toThrow(/cannot have a body/);
    expect(sent).toHaveLength(0);
  });

  it('is refused when it is a stream', async () => {
    const { adapter } = recorder();

    await expect(
      createClient({ baseURL, adapter }).post('items', {
        body: new ReadableStream()
      })
    ).rejects.toThrow(/stream cannot be the body/);
  });

  it('is refused when json cannot express it', async () => {
    const { adapter } = recorder();

    await expect(
      createClient({ baseURL, adapter }).post('items', { json: () => 1 })
    ).rejects.toThrow(/JSON cannot express/);
  });
});

describe('the body of a response', () => {
  const read = async (
    response: Response,
    options: Parameters<ReturnType<typeof createClient>['get']>[1] = {}
  ) => {
    const { adapter } = recorder(response);

    return createClient({ baseURL, adapter, throwHttpErrors: false }).get(
      'x',
      options
    );
  };
  const of = (body: BodyInit | null, type?: string, status = 200) =>
    new Response(body, {
      status,
      headers: type ? { 'content-type': type } : {}
    });

  it.each([
    'application/json',
    'application/json; charset=utf-8',
    'application/problem+json',
    'application/vnd.api+json'
  ])('is parsed for %s', async (type) => {
    expect((await read(of('{"a":1}', type))).data).toEqual({ a: 1 });
  });

  it.each(['text/plain', 'text/html; charset=utf-8', 'application/xml'])(
    'is text for %s',
    async (type) => {
      expect((await read(of('<a>1</a>', type))).data).toBe('<a>1</a>');
    }
  );

  it('is text without a Content-Type', async () => {
    const response = new Response('plain');

    response.headers.delete('content-type');

    expect((await read(response)).data).toBe('plain');
  });

  it('is a blob for anything else', async () => {
    const { data } = await read(of(new Uint8Array([1, 2, 3]), 'image/png'));

    expect(data).toBeInstanceOf(Blob);
    expect((data as Blob).size).toBe(3);
  });

  it.each([
    ['an empty JSON body', of('', 'application/json')],
    ['an empty text body', of('', 'text/plain')],
    ['an empty binary body', of('', 'image/png')],
    ['204', new Response(null, { status: 204 })],
    ['304', new Response(null, { status: 304 })],
    ['a response without a body', new Response(null)]
  ])('is undefined for %s', async (_, response) => {
    expect((await read(response)).data).toBeUndefined();
  });

  it('is undefined for HEAD, whatever is promised', async () => {
    const { adapter } = recorder(of('{"a":1}', 'application/json'));

    expect(
      (await createClient({ baseURL, adapter }).head('x')).data
    ).toBeUndefined();
  });

  it('follows responseType before the Content-Type', async () => {
    expect(
      (await read(of('{"a":1}', 'application/json'), { responseType: 'text' }))
        .data
    ).toBe('{"a":1}');
    expect(
      (await read(of('{"a":1}', 'text/plain'), { responseType: 'json' })).data
    ).toEqual({ a: 1 });

    const buffer = (
      await read(of('abc', 'text/plain'), {
        responseType: 'arrayBuffer'
      })
    ).data as ArrayBuffer;

    expect(buffer.byteLength).toBe(3);

    const blob = (await read(of('', 'text/plain'), { responseType: 'blob' }))
      .data as Blob;

    expect(blob.size).toBe(0);
  });

  it('is left unread for stream', async () => {
    const response = await read(of('abc', 'text/plain'), {
      responseType: 'stream'
    });

    expect(response.data).toBeInstanceOf(ReadableStream);
    expect(await new Response(response.data as ReadableStream).text()).toBe(
      'abc'
    );
  });

  it.each([
    'application/json-seq',
    'application/x-ndjson',
    'application/jsonlines',
    'application/json5',
    'application/javascript',
    'application/yaml'
  ])('is text, not parsed, for %s', async (type) => {
    expect((await read(of('{"a":1}\n{"a":2}', type))).data).toBe(
      '{"a":1}\n{"a":2}'
    );
  });

  it('rejects with reason parse when 2xx JSON cannot be read', async () => {
    const { adapter } = recorder(of('<html>', 'application/json'));
    const error = await createClient({ baseURL, adapter })
      .get('x')
      .catch((e) => e);

    expect(isRequestError(error) && error.reason).toBe('parse');
    expect(error.cause).toBeInstanceOf(SyntaxError);
  });

  it('of an error is read by its Content-Type, whatever was asked for', async () => {
    const { adapter } = recorder(json({ message: 'Too large' }, 413));
    const error = await createClient({ baseURL, adapter })
      .get('file', { responseType: 'blob' })
      .catch((e) => e);

    expect(error.response.data).toEqual({ message: 'Too large' });
  });

  it('of an error that is no JSON after all is kept as text', async () => {
    const { adapter } = recorder(
      of('<html>Bad gateway', 'application/json', 502)
    );
    const error = await createClient({ baseURL, adapter })
      .get('x')
      .catch((e) => e);

    expect(error.status).toBe(502);
    expect(error.response.data).toBe('<html>Bad gateway');
  });
});

describe('what the adapter is given', () => {
  it('holds init of the client and of the request, and the response type', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      init: { credentials: 'include', mode: 'cors' }
    });

    await api.get('items', {
      init: { mode: 'same-origin' },
      responseType: 'text'
    });

    expect(sent[0].context.init).toEqual({
      credentials: 'include',
      mode: 'same-origin'
    });
    expect(sent[0].context.responseType).toBe('text');
  });
});
