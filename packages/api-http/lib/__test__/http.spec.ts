import http from 'http';
import https from 'https';
import { EventEmitter } from 'events';
import { gzipSync } from 'zlib';
import net from 'net';
import type { AddressInfo } from 'net';
import { createClient, isHttpError, isRequestError } from '@punica/request';
import { httpAdapter } from '..';

interface Seen {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

describe('httpAdapter', () => {
  const seen: Seen[] = [];
  let server: http.Server;
  let baseURL: string;

  beforeAll(async () => {
    server = http.createServer((request, response) => {
      const chunks: Buffer[] = [];

      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        seen.push({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });

        const { pathname } = new URL(request.url ?? '/', 'http://localhost');

        switch (pathname) {
          case '/api/items':
            response.writeHead(200, {
              'content-type': 'application/json',
              'set-cookie': ['a=1', 'b=2']
            });
            response.end(JSON.stringify({ id: 1 }));
            break;
          case '/api/split': {
            // A character that arrives in two pieces
            const bytes = Buffer.from(JSON.stringify({ name: 'çay' }));

            response.writeHead(200, { 'content-type': 'application/json' });
            response.write(bytes.subarray(0, 10));
            setTimeout(() => response.end(bytes.subarray(10)), 10);
            break;
          }
          case '/api/missing':
            response.writeHead(404, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ message: 'Not here' }));
            break;
          case '/api/empty':
            response.writeHead(204);
            response.end();
            break;
          case '/api/moved':
            response.writeHead(302, { location: '/api/items' });
            response.end();
            break;
          case '/api/zipped':
            response.writeHead(200, {
              'content-type': 'application/json',
              'content-encoding': 'gzip'
            });
            response.end(gzipSync('{"id":1}'));
            break;
          case '/api/binary':
            response.writeHead(200, { 'content-type': 'image/png' });
            response.end(Buffer.from([1, 2, 3, 250]));
            break;
          case '/api/slow':
            // Never answered
            break;
          case '/api/half':
            response.writeHead(200, { 'content-type': 'text/plain' });
            response.write('half');
            break;
          default:
            response.writeHead(200, { 'content-type': 'text/plain' });
            response.end('ok');
        }
      });
    });

    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    seen.length = 0;
  });

  const client = () =>
    createClient({
      baseURL,
      adapter: httpAdapter(),
      headers: { Accept: 'application/json' }
    });

  test('sends the method, the path under the base, the query and the headers to the port', async () => {
    const response = await client().get<{ id: number }>('items', {
      query: { page: 2, tags: ['a', 'b'] },
      headers: { 'X-Trace': '7' }
    });

    expect(response).toMatchObject({ ok: true, status: 200, data: { id: 1 } });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/api/items?page=2&tags=a&tags=b');
    expect(seen[0].headers.accept).toBe('application/json');
    expect(seen[0].headers['x-trace']).toBe('7');
  });

  test('gives the headers of the response, one sent twice included', async () => {
    const response = await client().get('items');

    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
  });

  test('sends a JSON body with its type and its length', async () => {
    await client().post('echo', { json: { name: 'çay' } });

    expect(seen[0].method).toBe('POST');
    expect(seen[0].body).toBe('{"name":"çay"}');
    expect(seen[0].headers['content-type']).toBe('application/json');
    expect(seen[0].headers['content-length']).toBe('15');
  });

  test('sends form data, a query and binary bodies as fetch would', async () => {
    const form = new FormData();

    form.append('name', 'Paper');
    await client().post('echo', { body: form });
    await client().put('echo', {
      body: new URLSearchParams({ a: '1', b: 'x y' })
    });
    await client().patch('echo', { body: new Uint8Array([104, 105]) });

    expect(seen[0].headers['content-type']).toMatch(
      /^multipart\/form-data; boundary=/
    );
    expect(seen[0].body).toContain('name="name"');
    expect(seen[0].body).toContain('Paper');
    expect(seen[1].headers['content-type']).toBe(
      'application/x-www-form-urlencoded;charset=UTF-8'
    );
    expect(seen[1].body).toBe('a=1&b=x+y');
    expect(seen[2].body).toBe('hi');
  });

  test('reads a character that arrives in two pieces as one', async () => {
    expect((await client().get('split')).data).toEqual({ name: 'çay' });
  });

  test('reads a binary body as it came', async () => {
    const { data } = await client().get<Blob>('binary');

    expect(new Uint8Array(await data.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 250])
    );
  });

  test('a response outside 2xx rejects with its body', async () => {
    const error = await client()
      .get('missing')
      .catch((e) => e);

    expect(isHttpError(error) && error.status).toBe(404);
    expect(error.response.data).toEqual({ message: 'Not here' });
  });

  test('a response without a body has no data, for 204 and for HEAD', async () => {
    expect(await client().delete('empty')).toMatchObject({
      status: 204,
      data: undefined
    });
    expect(await client().head('items')).toMatchObject({
      status: 200,
      data: undefined
    });
  });

  test('does not follow a redirect: the 3xx is the response', async () => {
    const response = await client().get('moved', { throwHttpErrors: false });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/api/items');
    expect(seen).toHaveLength(1);
  });

  test('does not decompress: a compressed body is given as it came', async () => {
    const response = await client().get('zipped', {
      responseType: 'arrayBuffer'
    });

    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(new Uint8Array(response.data as ArrayBuffer)[0]).toBe(0x1f);
  });

  test('a server that is not there rejects with reason network', async () => {
    const api = createClient({
      baseURL: 'http://127.0.0.1:1',
      adapter: httpAdapter()
    });
    const error = await api.get('items').catch((e) => e);

    expect(isRequestError(error) && error.reason).toBe('network');
    expect(error.cause.code).toBe('ECONNREFUSED');
  });

  test('the timeout of the client ends a request that is not answered', async () => {
    const api = createClient({ baseURL, adapter: httpAdapter(), timeout: 50 });
    const error = await api.get('slow').catch((e) => e);

    expect(isRequestError(error) && error.reason).toBe('timeout');
  });

  test('a cancelled request ends, also while its body arrives', async () => {
    const controller = new AbortController();
    const pending = client()
      .get('half', { signal: controller.signal })
      .catch((e) => e);

    setTimeout(() => controller.abort(), 50);

    const error = await pending;

    expect(isRequestError(error) && error.reason).toBe('abort');
  });

  test('uses the agent it is given', async () => {
    const agent = new http.Agent({ keepAlive: true });
    const created = jest.spyOn(agent, 'createConnection' as any);
    const api = createClient({
      baseURL,
      adapter: httpAdapter({ httpAgent: agent })
    });

    try {
      await api.get('items');
      await api.get('items');

      // One connection, kept alive, for both
      expect(created).toHaveBeenCalledTimes(1);
    } finally {
      agent.destroy();
    }
  });

  test('passes requestOptions on', async () => {
    const api = createClient({
      baseURL,
      adapter: httpAdapter({ requestOptions: { setHost: false } }),
      headers: { Host: 'example.test' }
    });

    await api.get('items');

    expect(seen[0].headers.host).toBe('example.test');
  });

  test('uses the agent of requestOptions when it is given no other', async () => {
    const agent = new http.Agent({ keepAlive: true });
    const created = jest.spyOn(agent, 'createConnection' as any);
    const api = createClient({
      baseURL,
      adapter: httpAdapter({ requestOptions: { agent } })
    });

    try {
      await api.get('items');

      expect(created).toHaveBeenCalledTimes(1);
    } finally {
      agent.destroy();
    }
  });

  test('sends a body to an address that holds credentials', async () => {
    const api = createClient({
      baseURL: baseURL.replace('http://', 'http://user:pw@'),
      adapter: httpAdapter()
    });

    await api.post('echo', { json: { a: 1 } });

    expect(seen[0].body).toBe('{"a":1}');
    expect(seen[0].headers.authorization).toBe(
      `Basic ${Buffer.from('user:pw').toString('base64')}`
    );
  });

  test('a server that switches protocols instead of answering rejects', async () => {
    const raw = net.createServer((socket) => {
      socket.once('data', () =>
        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\nUpgrade: x\r\nConnection: Upgrade\r\n\r\n'
        )
      );
    });

    await new Promise<void>((resolve) => raw.listen(0, '127.0.0.1', resolve));

    try {
      const api = createClient({
        baseURL: `http://127.0.0.1:${(raw.address() as AddressInfo).port}`,
        adapter: httpAdapter()
      });
      const error = await api.get('x').catch((e) => e);

      expect(isRequestError(error) && error.reason).toBe('network');
      expect(String(error.cause)).toMatch(/switched protocols/);
    } finally {
      raw.close();
    }
  });

  test('a connection cut while the body arrives rejects with reason network', async () => {
    const raw = net.createServer((socket) => {
      socket.once('data', () => {
        socket.write(
          'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 100\r\n\r\nhalf'
        );
        setTimeout(() => socket.destroy(), 20);
      });
    });

    await new Promise<void>((resolve) => raw.listen(0, '127.0.0.1', resolve));

    try {
      const api = createClient({
        baseURL: `http://127.0.0.1:${(raw.address() as AddressInfo).port}`,
        adapter: httpAdapter()
      });
      const error = await api.get('x').catch((e) => e);

      expect(isRequestError(error) && error.reason).toBe('network');
    } finally {
      raw.close();
    }
  });

  test('the timeout of requestOptions ends a request on an idle socket', async () => {
    const api = createClient({
      baseURL,
      adapter: httpAdapter({ requestOptions: { timeout: 50 } })
    });
    const error = await api.get('slow').catch((e) => e);

    expect(isRequestError(error) && error.reason).toBe('network');
    expect(String(error.cause)).toMatch(/socket timed out/);
  });

  test('sends requests to https addresses with the https module and its agent', async () => {
    const agent = new https.Agent();
    const request = jest.spyOn(https, 'request').mockImplementation((() => {
      const fake = new EventEmitter() as any;

      fake.end = () =>
        setImmediate(() => fake.emit('error', new Error('no TLS here')));

      return fake;
    }) as any);
    const api = createClient({
      baseURL: 'https://secure.example:8443/api',
      adapter: httpAdapter({ httpsAgent: agent, httpAgent: new http.Agent() })
    });

    try {
      const error = await api.get('items').catch((e) => e);
      const [url, options] = request.mock.calls[0] as any[];

      expect(isRequestError(error) && error.reason).toBe('network');
      expect(String(url)).toBe('https://secure.example:8443/api/items');
      expect(options.agent).toBe(agent);
    } finally {
      request.mockRestore();
    }
  });
});
