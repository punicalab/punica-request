import { HttpResponse, RequestAPI } from '@punica/request';
import { CancelRequestMiddleware } from '..';
import { Recorder } from './support';

/** Answers when the test says so, and fails when its request is aborted. */
const createSlow = () => {
  const open: Array<(response: HttpResponse) => void> = [];
  const adapter = new Recorder(
    (_method, params) =>
      new Promise<HttpResponse>((resolve, reject) => {
        open.push(resolve);
        params.init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        );
      })
  );
  const answer = (index: number) =>
    open[index]({ status: 200, response: null, payload: index });

  return { adapter, answer };
};

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('CancelRequestMiddleware', () => {
  const unhandled = jest.fn();

  beforeAll(() => process.on('unhandledRejection', unhandled));
  afterAll(() => process.off('unhandledRejection', unhandled));
  beforeEach(() => unhandled.mockClear());

  test('the same request sent again cancels the one before it', async () => {
    const { adapter, answer } = createSlow();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new CancelRequestMiddleware()]
    });
    const first = api.get({ path: 'items' });
    const failed = expect(first).rejects.toThrow('aborted');
    const second = api.get({ path: 'items' });

    await tick();
    answer(1);

    await failed;
    expect((await second).payload).toBe(1);

    await tick();
    expect(unhandled).not.toHaveBeenCalled();
  });

  test('a new query to the same path cancels the one before it, another method does not', async () => {
    const { adapter, answer } = createSlow();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new CancelRequestMiddleware()]
    });
    // What a search field sends while the user types
    const stale = expect(
      api.get({ path: 'search', query: { q: 'a' } })
    ).rejects.toThrow('aborted');
    const current = api.get({ path: 'search', query: { q: 'ab' } });
    const saved = api.post({ path: 'search' });

    await tick();
    answer(1);
    answer(2);

    await stale;
    expect((await current).payload).toBe(1);
    expect((await saved).payload).toBe(2);
  });

  test('getKey says which requests are the same one', async () => {
    const { adapter, answer } = createSlow();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [
        new CancelRequestMiddleware({
          getKey: ({ params }) => params.requestURL
        })
      ]
    });
    const pages = [
      api.get({ path: 'items', query: { page: '1' } }),
      api.get({ path: 'items', query: { page: '2' } })
    ];

    await tick();
    [0, 1].forEach(answer);

    expect((await Promise.all(pages)).map(({ payload }) => payload)).toEqual([
      0, 1
    ]);
  });

  test('the signal the caller gave the request still cancels it', async () => {
    const { adapter } = createSlow();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new CancelRequestMiddleware()]
    });
    const own = new AbortController();
    const request = expect(
      api.get({ path: 'report', init: { signal: own.signal } })
    ).rejects.toThrow('aborted');

    await tick();
    own.abort();
    await request;

    // And one that was aborted before the request was sent
    await expect(
      api.get({ path: 'report', init: { signal: own.signal } })
    ).rejects.toThrow('aborted');
    expect(adapter.calls).toHaveLength(1);
  });

  test('a request that ends without a response leaves no timer behind', async () => {
    jest.useFakeTimers();

    try {
      const adapter = new Recorder(() => {
        throw new TypeError('Failed to fetch');
      });
      const api = new RequestAPI(adapter, {
        hostname: 'https://host/',
        requestMiddlewares: [new CancelRequestMiddleware({ timeout: 10_000 })]
      });

      await expect(api.get({ path: 'a' })).rejects.toThrow('Failed to fetch');
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a request that takes longer than the timeout is cancelled', async () => {
    const { adapter } = createSlow();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new CancelRequestMiddleware({ timeout: 20 })]
    });

    await expect(api.get({ path: 'slow' })).rejects.toThrow('aborted');
  });

  test('the timeout of a request that was answered does not touch a later one', async () => {
    jest.useFakeTimers();

    try {
      const { adapter, answer } = createSlow();
      const cancel = new CancelRequestMiddleware({ timeout: 100 });
      const api = new RequestAPI(adapter, {
        hostname: 'https://host/',
        requestMiddlewares: [cancel]
      });
      const first = api.get({ path: 'items' });

      await jest.advanceTimersByTimeAsync(10);
      answer(0);
      expect((await first).payload).toBe(0);

      // Sent 60 ms later: the timeout of the first request is due at 100
      await jest.advanceTimersByTimeAsync(60);

      const second = api.get({ path: 'items' });
      const outcome = second.then(
        ({ payload }) => payload,
        (error) => error.message
      );

      await jest.advanceTimersByTimeAsync(50);
      answer(1);

      expect(await outcome).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test('cancelAllRequests cancels what is under way', async () => {
    const { adapter } = createSlow();
    const cancel = new CancelRequestMiddleware();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [cancel]
    });
    const requests = [api.get({ path: 'a' }), api.get({ path: 'b' })].map(
      (request) => expect(request).rejects.toThrow('aborted')
    );

    await tick();
    cancel.cancelAllRequests();
    await Promise.all(requests);
  });
});
