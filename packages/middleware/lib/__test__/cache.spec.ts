import 'fake-indexeddb/auto';
import { createClient } from '@punica/request';
import { cache, IStorage, StorageIndexedDB, StorageSession } from '..';
import type { CacheEntry } from '..';
import { json, recorder } from './support';

const baseURL = 'https://api.example.com';

// What a browser has and Node has not
const session = new Map<string, string>();

(globalThis as any).sessionStorage = {
  getItem: (key: string) => session.get(key) ?? null,
  setItem: (key: string, value: string) => void session.set(key, String(value)),
  removeItem: (key: string) => void session.delete(key)
};

let database = 0;
const storages: Array<[string, () => IStorage]> = [
  ['StorageSession', () => new StorageSession()],
  [
    'StorageIndexedDB',
    () => new StorageIndexedDB({ databaseName: `test-${(database += 1)}` })
  ]
];
const entry = (data: unknown, more: Partial<CacheEntry> = {}): CacheEntry => ({
  status: 200,
  headers: [['content-type', 'application/json']],
  data,
  ...more
});

beforeEach(() => session.clear());

describe.each(storages)('%s', (_, create) => {
  test('returns what was written, and nothing for what was not', async () => {
    const storage = create();

    await storage.set('a', entry({ id: 1 }));

    expect(await storage.get('a')).toEqual(entry({ id: 1 }));
    expect(await storage.get('b')).toBeFalsy();
  });

  test('keeps the last value written for a key', async () => {
    const storage = create();

    await storage.set('a', entry({ id: 1 }));
    await storage.set('a', entry({ id: 2 }, { expiresAt: 5 }));

    expect(await storage.get('a')).toEqual(entry({ id: 2 }, { expiresAt: 5 }));
  });

  test('keeps text as well as JSON', async () => {
    const storage = create();

    await storage.set('a', entry('plain'));
    await storage.set('b', entry([1, 'two', null]));

    expect((await storage.get('a'))?.data).toBe('plain');
    expect((await storage.get('b'))?.data).toEqual([1, 'two', null]);
  });

  test('forgets what is deleted', async () => {
    const storage = create();

    await storage.set('a', entry(1));
    await storage.delete?.('a');
    await storage.delete?.('never there');

    expect(await storage.get('a')).toBeFalsy();
  });
});

describe('StorageSession', () => {
  test('does not keep what cannot be written as text', async () => {
    const storage = new StorageSession();

    expect(await storage.set('a', entry(new Blob(['x'])))).toBe(false);
    expect(await storage.set('b', entry(new ArrayBuffer(2)))).toBe(false);
    expect(await storage.set('c', entry(new FormData()))).toBe(false);
    expect(await storage.get('a')).toBeNull();
    expect(session.size).toBe(0);
  });

  test('gives nothing for what it did not write', async () => {
    session.set('punica-request:a', 'not json');
    session.set('punica-request:b', '"text"');
    session.set('punica-request:c', '{"status":200,"headers":"oops","data":1}');

    const storage = new StorageSession();

    expect(await storage.get('a')).toBeNull();
    expect(await storage.get('b')).toBeNull();
    expect(await storage.get('c')).toBeNull();
  });

  test('writes under its prefix', async () => {
    await new StorageSession({ prefix: 'shop/' }).set('a', entry(1));

    expect([...session.keys()]).toEqual(['shop/a']);
  });
});

describe('StorageIndexedDB', () => {
  test('keeps what IndexedDB can copy, binary included', async () => {
    const storage = new StorageIndexedDB({ databaseName: 'binary' });

    await storage.set('a', entry(new Uint8Array([1, 2, 3]).buffer));

    const kept = await storage.get('a');

    expect(new Uint8Array(kept?.data as ArrayBuffer)).toEqual(
      new Uint8Array([1, 2, 3])
    );
  });

  test('two storages of one database share it, of two do not', async () => {
    await new StorageIndexedDB({ databaseName: 'shared' }).set('a', entry(1));

    expect(
      (await new StorageIndexedDB({ databaseName: 'shared' }).get('a'))?.data
    ).toBe(1);
    expect(await new StorageIndexedDB().get('a')).toBeUndefined();
  });

  test('opens the database again after its connection was closed', async () => {
    const storage = new StorageIndexedDB({ databaseName: 'closed' });

    await storage.set('a', entry(1));

    // An upgrade by another script closes our connection (versionchange)
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('closed', 2);

      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    expect((await storage.get('a'))?.data).toBe(1);
    await storage.set('b', entry(2));
    expect((await storage.get('b'))?.data).toBe(2);
  });

  test('answers requests that are made together', async () => {
    const storage = new StorageIndexedDB({ databaseName: 'together' });

    await Promise.all([
      storage.set('a', entry(1)),
      storage.set('b', entry(2)),
      storage.get('a')
    ]);

    expect((await storage.get('b'))?.data).toBe(2);
  });
});

describe.each(storages)('cache with %s', (_, create) => {
  test('answers the second request from the cache, as a whole response', async () => {
    const { adapter, sent } = recorder(
      json({ id: 1 }, 200, { 'x-total': '9' })
    );
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage: create() })]
    });
    const first = await api.get('items', { cache: true });
    const second = await api.get('items', { cache: true });

    expect(sent).toHaveLength(1);
    expect(first.raw).toBeDefined();
    expect(second).toMatchObject({ ok: true, status: 200, data: { id: 1 } });
    expect(second.headers.get('x-total')).toBe('9');
    expect(second.raw).toBeUndefined();
  });
});

describe('cache', () => {
  const memory = () => {
    const kept = new Map<string, CacheEntry>();
    const storage: IStorage & { kept: Map<string, CacheEntry> } = {
      kept,
      get: jest.fn(async (key) => kept.get(key)),
      set: jest.fn(async (key, value) => void kept.set(key, value)),
      delete: jest.fn(async (key) => void kept.delete(key))
    };

    return storage;
  };

  test('does not cache a request that did not ask for it, or one that failed', async () => {
    const storage = memory();
    const { adapter, sent } = recorder(json({}), json({}), json({}, 500));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    await api.get('items');
    await api.get('items', { cache: false });
    await api.get('items', { cache: true }).catch(() => undefined);

    expect(sent).toHaveLength(3);
    expect(storage.kept.size).toBe(0);
    expect(storage.get).toHaveBeenCalledTimes(1);
  });

  test('caches GET only', async () => {
    const storage = memory();
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    await api.post('items', { cache: true });
    await api.post('items', { cache: true });

    expect(sent).toHaveLength(2);
    expect(storage.get).not.toHaveBeenCalled();
  });

  test('tells queries apart', async () => {
    const storage = memory();
    const { adapter, sent } = recorder((context) =>
      json({ page: context.url.searchParams.get('page') })
    );
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    await api.get('items', { query: { page: 1 }, cache: true });

    const other = await api.get('items', { query: { page: 2 }, cache: true });
    const again = await api.get('items', { query: { page: 1 }, cache: true });

    expect(sent).toHaveLength(2);
    expect(other.data).toEqual({ page: '2' });
    expect(again.data).toEqual({ page: '1' });
  });

  test('does not answer a request that reads the address as something else', async () => {
    const storage = memory();
    const { adapter, sent } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });
    const parsed = await api.get('items', { cache: true });
    const text = await api.get('items', { cache: true, responseType: 'text' });

    expect(sent).toHaveLength(2);
    expect(parsed.data).toEqual({ id: 1 });
    expect(text.data).toBe('{"id":1}');
  });

  test('does not cache a stream', async () => {
    const storage = memory();
    const { adapter, sent } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    await api.get('items', { cache: true, responseType: 'stream' });
    await api.get('items', { cache: true, responseType: 'stream' });

    expect(sent).toHaveLength(2);
    expect(storage.get).not.toHaveBeenCalled();
  });

  test('forgets a response once its ttl is over', async () => {
    jest.useFakeTimers({ now: 1_000_000 });

    try {
      const storage = memory();
      const { adapter, sent } = recorder(json({ id: 1 }));
      const api = createClient({
        baseURL,
        adapter,
        middlewares: [cache({ storage })]
      });
      const options = { cache: { ttl: 1000 } };

      await api.get('items', options);
      jest.setSystemTime(1_000_999);
      await api.get('items', options);

      expect(sent).toHaveLength(1);

      jest.setSystemTime(1_001_000);
      await api.get('items', options);

      expect(sent).toHaveLength(2);
      expect(storage.delete).toHaveBeenCalledTimes(1);
      // Kept again, for another ttl
      expect([...storage.kept.values()][0].expiresAt).toBe(1_002_000);
    } finally {
      jest.useRealTimers();
    }
  });

  test.each([
    ['headers that are no headers', { status: 200, headers: 'oops', data: 1 }],
    ['no status', { headers: [], data: 1 }],
    ['a text', 'not an entry']
  ])('an entry with %s is a miss, and is removed', async (_, broken) => {
    const storage = memory();
    const { adapter, sent } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    storage.kept.set(
      ' https://api.example.com/items',
      broken as unknown as CacheEntry
    );

    expect((await api.get('items', { cache: true })).data).toEqual({ id: 1 });
    expect(sent).toHaveLength(1);
    expect(storage.delete).toHaveBeenCalledTimes(1);
    // And the response took its place
    expect((await api.get('items', { cache: true })).data).toEqual({ id: 1 });
    expect(sent).toHaveLength(1);
  });

  test('a storage that cannot delete does not fail the request', async () => {
    const storage = memory();

    storage.delete = jest.fn(async () => {
      throw new Error('read only');
    });
    storage.kept.set(' https://api.example.com/items', {
      status: 200,
      headers: [],
      data: 'old',
      expiresAt: 1
    });

    const { adapter } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    expect((await api.get('items', { cache: true })).data).toEqual({ id: 1 });
  });

  test('a ttl of 0 or less keeps nothing', async () => {
    const storage = memory();
    const { adapter, sent } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    await api.get('items', { cache: { ttl: 0 } });
    await api.get('items', { cache: { ttl: -1 } });

    expect(sent).toHaveLength(2);
    expect(storage.kept.size).toBe(0);
  });

  test('does not keep the cookies a response sets', async () => {
    const storage = memory();
    const { adapter } = recorder(
      json({}, 200, { 'set-cookie': 'sid=secret', 'x-total': '1' })
    );
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    await api.get('items', { cache: true });

    expect([...storage.kept.values()][0].headers).toEqual([
      ['content-type', 'application/json'],
      ['x-total', '1']
    ]);
  });

  test('keeps a response without a ttl for as long as the storage does', async () => {
    const storage = memory();
    const { adapter } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    await api.get('a', { cache: true });
    await api.get('b', { cache: {} });

    expect([...storage.kept.values()].map((one) => 'expiresAt' in one)).toEqual(
      [false, false]
    );
  });

  test('sends the request when the cache cannot be read, once', async () => {
    const storage: IStorage = {
      get: jest.fn(async () => {
        throw new Error('storage is closed');
      }),
      set: jest.fn(async () => {
        throw new Error('storage is full');
      })
    };
    const { adapter, sent } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [cache({ storage })]
    });

    expect((await api.get('items', { cache: true })).data).toEqual({ id: 1 });
    expect(sent).toHaveLength(1);
    expect(storage.set).toHaveBeenCalledTimes(1);
  });

  test('getKey decides what a response is kept under', async () => {
    const storage = memory();
    let user = 'ada';
    const { adapter, sent } = recorder(() => json({ user }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        cache({ storage, getKey: (context) => `${user} ${context.url.href}` })
      ]
    });

    await api.get('me', { cache: true });
    user = 'grace';

    expect((await api.get('me', { cache: true })).data).toEqual({
      user: 'grace'
    });
    expect(sent).toHaveLength(2);
    expect([...storage.kept.keys()]).toEqual([
      'ada https://api.example.com/me',
      'grace https://api.example.com/me'
    ]);
  });

  test('a cached answer still passes the middlewares before it', async () => {
    const storage = memory();
    const seen: unknown[] = [];
    const { adapter } = recorder(json({ id: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        async (_, next) => {
          const response = await next();

          seen.push(response.data);

          return response;
        },
        cache({ storage })
      ]
    });

    await api.get('items', { cache: true });
    await api.get('items', { cache: true });

    expect(seen).toEqual([{ id: 1 }, { id: 1 }]);
  });

  test('needs a storage', () => {
    expect(() => cache({} as any)).toThrow(/needs a storage/);
    expect(() => cache({ storage: { read() {}, write() {} } } as any)).toThrow(
      TypeError
    );
  });
});
