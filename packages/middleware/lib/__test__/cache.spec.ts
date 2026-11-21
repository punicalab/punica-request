/**
 * @jest-environment jsdom
 */
import 'fake-indexeddb/auto';
import { RequestAPI } from '@punica/request';
import {
  CacheMiddleware,
  IStorage,
  StorageIndexedDB,
  StorageSession
} from '..';
import { Recorder, settled } from './support';

// jsdom has no structuredClone, which the stand-in for IndexedDB needs
globalThis.structuredClone ??= (value: unknown) =>
  JSON.parse(JSON.stringify(value));

const storages: Array<[string, () => IStorage]> = [
  ['StorageSession', () => new StorageSession()],
  ['StorageIndexedDB', () => new StorageIndexedDB()]
];

describe.each(storages)('%s', (_name, create) => {
  const url = () => `https://host/items?${Math.random()}`;

  test('returns what was written, and nothing for what was not', async () => {
    const storage = create();
    const key = url();

    expect(await settled(storage.read(key))).toBeNull();

    await storage.write(key, 'json', { id: 1 });

    expect(await settled(storage.read(key))).toEqual({ id: 1 });
  });

  test('keeps the last value written for an address', async () => {
    const storage = create();
    const key = url();

    await storage.write(key, 'json', { id: 1 });
    await storage.write(key, 'json', { id: 2 });

    expect(await settled(storage.read(key))).toEqual({ id: 2 });
  });

  test('keeps text as well as JSON', async () => {
    const storage = create();
    const key = url();

    await storage.write(key, 'text', 'hello');

    expect(await settled(storage.read(key))).toBe('hello');
  });

  test('forgets a value once its time is over', async () => {
    const storage = create();
    const key = url();
    const now = jest.spyOn(Date, 'now');

    now.mockReturnValue(1000);
    await storage.write(key, 'json', { id: 1 }, 50);

    now.mockReturnValue(1040);
    expect(await settled(storage.read(key))).toEqual({ id: 1 });

    now.mockReturnValue(1060);
    expect(await settled(storage.read(key))).toBeNull();

    // And it is gone, not only hidden
    now.mockReturnValue(1000);
    expect(await settled(storage.read(key))).toBeNull();
    now.mockRestore();
  });
});

describe('CacheMiddleware', () => {
  const create = (storage: IStorage = new StorageSession()) => {
    const adapter = new Recorder();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new CacheMiddleware({ storage })]
    });

    return { adapter, api };
  };

  beforeEach(() => sessionStorage.clear());

  test('answers the second request from the cache, as a whole response', async () => {
    const { adapter, api } = create();
    const first = await api.get({ path: 'a', contentType: 'json', cache: {} });
    const second = await settled(
      api.get({ path: 'a', contentType: 'json', cache: {} })
    );

    expect(adapter.calls).toHaveLength(1);
    expect(first.payload).toEqual({ ok: true });
    expect(second).toMatchObject({ payload: { ok: true }, status: 200 });
  });

  test('does not cache a request that did not ask for it, or one that failed', async () => {
    const { adapter, api } = create();

    await api.get({ path: 'a', contentType: 'json' });
    await api.get({ path: 'a', contentType: 'json' });

    expect(adapter.calls).toHaveLength(2);

    adapter.answer = () => ({ status: 500, response: null });
    await api.get({ path: 'b', contentType: 'json', cache: {} });
    adapter.answer = () => ({ status: 200, response: null, payload: 'now' });

    const again = await api.get({ path: 'b', contentType: 'json', cache: {} });

    expect(again.payload).toBe('now');
  });

  test('sends the request when the cache cannot be read, once', async () => {
    const broken: IStorage = {
      read: () => Promise.reject(new Error('no storage')),
      write: () => Promise.reject(new Error('no storage'))
    };
    const { adapter, api } = create(broken);
    const response = await settled(
      api.get({ path: 'a', contentType: 'json', cache: {} })
    );

    expect(response.payload).toEqual({ ok: true });
    expect(adapter.calls).toHaveLength(1);
  });

  test('works with the IndexedDB storage', async () => {
    const { adapter, api } = create(new StorageIndexedDB());

    await settled(api.get({ path: 'idb', contentType: 'json', cache: {} }));

    const second = await settled(
      api.get({ path: 'idb', contentType: 'json', cache: {} })
    );

    expect(second.payload).toEqual({ ok: true });
    expect(adapter.calls).toHaveLength(1);
  });
});
