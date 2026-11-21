import { createClient, isRequestError } from '@punica/request';
import type { Adapter } from '@punica/request';
import { cancel, refreshToken } from '..';
import { deferred, json, settled } from './support';

const baseURL = 'https://api.example.com';

/** An adapter whose requests are answered by the test, or by their abort. */
const manual = () => {
  const requests: Array<{
    url: string;
    method: string;
    signal: AbortSignal;
    answer: (response: Response) => void;
  }> = [];
  const adapter: Adapter = (context) => {
    const { promise, resolve, reject } = deferred<Response>();

    context.signal.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError'))
    );
    requests.push({
      url: context.url.href,
      method: context.method,
      signal: context.signal,
      answer: resolve
    });

    return promise;
  };

  return { adapter, requests };
};

const reasonOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'answered',
    (error) => (isRequestError(error) ? error.reason : error)
  );

describe('cancel', () => {
  test('the same request sent again cancels the one before it', async () => {
    const { adapter, requests } = manual();
    const api = createClient({ baseURL, adapter, middlewares: [cancel()] });
    const first = reasonOf(api.get('search'));

    await settled();

    const second = reasonOf(api.get('search'));

    await settled();
    requests[1].answer(json({}));

    expect(await first).toBe('abort');
    expect(await second).toBe('answered');
    expect(requests[0].signal.aborted).toBe(true);
    expect(requests[1].signal.aborted).toBe(false);
  });

  test('a new query to the same path cancels the one before it, another method does not', async () => {
    const { adapter, requests } = manual();
    const api = createClient({ baseURL, adapter, middlewares: [cancel()] });
    const first = reasonOf(api.get('search', { query: { q: 'a' } }));
    const post = reasonOf(api.post('search'));

    await settled();

    const second = reasonOf(api.get('search', { query: { q: 'ab' } }));

    await settled();
    requests.forEach((request) => request.answer(json({})));

    expect(await first).toBe('abort');
    expect(await post).toBe('answered');
    expect(await second).toBe('answered');
  });

  test('getKey says which requests are the same one', async () => {
    const { adapter, requests } = manual();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        cancel({ getKey: (context) => `${context.method} ${context.url.href}` })
      ]
    });
    const a = reasonOf(api.get('search', { query: { q: 'a' } }));
    const b = reasonOf(api.get('search', { query: { q: 'b' } }));

    await settled();

    const again = reasonOf(api.get('search', { query: { q: 'a' } }));

    await settled();
    requests.forEach((request) => request.answer(json({})));

    expect(await a).toBe('abort');
    expect(await b).toBe('answered');
    expect(await again).toBe('answered');
  });

  test('the signal the caller gave the request still cancels it', async () => {
    const { adapter, requests } = manual();
    const api = createClient({ baseURL, adapter, middlewares: [cancel()] });
    const controller = new AbortController();
    const pending = reasonOf(api.get('search', { signal: controller.signal }));

    await settled();
    controller.abort();

    expect(await pending).toBe('abort');
    expect(requests[0].signal.aborted).toBe(true);
  });

  test('a request that is sent again after a token refresh is not cancelled by itself', async () => {
    const { adapter, requests } = manual();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [refreshToken({ refresh: async () => true }), cancel()]
    });
    const pending = api.get<{ ok: number }>('items');

    await settled();
    requests[0].answer(json({}, 401));
    await settled();

    expect(requests).toHaveLength(2);
    expect(requests[1].signal.aborted).toBe(false);

    requests[1].answer(json({ ok: 1 }));

    expect((await pending).data).toEqual({ ok: 1 });
  });

  test('a request that waits for a token does not cancel a later one when it is sent again', async () => {
    const { adapter, requests } = manual();
    const refreshed = deferred<boolean>();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        refreshToken({ refresh: () => refreshed.promise }),
        cancel()
      ]
    });
    const older = reasonOf(api.get('search', { query: { q: 'old' } }));

    await settled();
    requests[0].answer(json({}, 401));
    await settled();

    // Sent while the older one waits for the token
    const newer = reasonOf(api.get('search', { query: { q: 'new' } }));

    await settled();
    refreshed.resolve(true);
    await settled();

    // The older one gives way instead of taking the place back
    expect(await older).toBe('abort');
    expect(requests).toHaveLength(2);
    expect(requests[1].signal.aborted).toBe(false);

    requests[1].answer(json({}));

    expect(await newer).toBe('answered');
  });

  test('a request cancelled while it waits for a token cancels nothing when the token comes', async () => {
    const { adapter, requests } = manual();
    const refreshed = deferred<boolean>();
    const controller = new AbortController();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        refreshToken({ refresh: () => refreshed.promise }),
        cancel()
      ]
    });
    const dead = reasonOf(api.get('search', { signal: controller.signal }));

    await settled();
    requests[0].answer(json({}, 401));
    await settled();
    controller.abort();

    expect(await dead).toBe('abort');

    const live = reasonOf(api.get('search'));

    await settled();
    refreshed.resolve(true);
    await settled();

    expect(requests).toHaveLength(2);
    expect(requests[1].signal.aborted).toBe(false);

    requests[1].answer(json({}));

    expect(await live).toBe('answered');
  });

  test('a request whose caller cancelled it before it was sent cancels nothing else', async () => {
    const { adapter, requests } = manual();
    const api = createClient({ baseURL, adapter, middlewares: [cancel()] });
    const first = reasonOf(api.get('search'));

    await settled();

    const dead = reasonOf(api.get('search', { signal: AbortSignal.abort() }));

    expect(await dead).toBe('abort');

    requests[0].answer(json({}));

    expect(await first).toBe('answered');
    expect(requests).toHaveLength(1);
  });

  test('keeps nothing of the requests that ended, however they ended', async () => {
    const { adapter, requests } = manual();
    const latest = cancel();
    const cancelled: string[] = [];
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        (context, next) => {
          context.signal.addEventListener('abort', () =>
            cancelled.push(context.url.pathname)
          );

          return next();
        },
        latest
      ]
    });
    const ok = reasonOf(api.get('a'));
    const failed = reasonOf(api.get('b'));

    await settled();
    requests[0].answer(json({}));
    requests[1].answer(json({}, 500));

    expect(await ok).toBe('answered');
    expect((await failed).status).toBe(500);

    // Nothing is left to cancel
    latest.cancelAll();

    expect(cancelled).toEqual([]);
  });

  test('a request that was answered is not cancelled by a later one', async () => {
    const { adapter, requests } = manual();
    const api = createClient({ baseURL, adapter, middlewares: [cancel()] });
    const first = api.get('search');

    await settled();
    requests[0].answer(json({ id: 1 }));

    expect((await first).data).toEqual({ id: 1 });

    const second = reasonOf(api.get('search'));

    await settled();
    requests[1].answer(json({}));

    expect(await second).toBe('answered');
    expect(requests[0].signal.aborted).toBe(false);
  });

  test('the timeout of the client still ends a request', async () => {
    jest.useFakeTimers();

    try {
      const { adapter } = manual();
      const api = createClient({
        baseURL,
        adapter,
        timeout: 100,
        middlewares: [cancel()]
      });
      const pending = reasonOf(api.get('slow'));

      await jest.advanceTimersByTimeAsync(100);

      expect(await pending).toBe('timeout');
    } finally {
      jest.useRealTimers();
    }
  });

  test('cancelAll cancels what is under way', async () => {
    const { adapter, requests } = manual();
    const latest = cancel();
    const api = createClient({ baseURL, adapter, middlewares: [latest] });
    const a = reasonOf(api.get('a'));
    const b = reasonOf(api.post('b'));

    await settled();
    latest.cancelAll();

    expect(await a).toBe('abort');
    expect(await b).toBe('abort');
    expect(requests.every((request) => request.signal.aborted)).toBe(true);

    // And the client goes on working
    const next = reasonOf(api.get('a'));

    await settled();
    requests[2].answer(json({}));

    expect(await next).toBe('answered');
  });
});
