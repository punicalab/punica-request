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
    const first = api.get({ path: 'items', query: { page: '1' } });
    const failed = expect(first).rejects.toThrow('aborted');
    const second = api.get({ path: 'items', query: { page: '1' } });

    await tick();
    answer(1);

    await failed;
    expect((await second).payload).toBe(1);

    await tick();
    expect(unhandled).not.toHaveBeenCalled();
  });

  test('another page, or another method, is another request', async () => {
    const { adapter, answer } = createSlow();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new CancelRequestMiddleware()]
    });
    const pages = [
      api.get({ path: 'items', query: { page: '1' } }),
      api.get({ path: 'items', query: { page: '2' } }),
      api.post({ path: 'items' })
    ];

    await tick();
    [0, 1, 2].forEach(answer);

    expect((await Promise.all(pages)).map(({ payload }) => payload)).toEqual([
      0, 1, 2
    ]);
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
