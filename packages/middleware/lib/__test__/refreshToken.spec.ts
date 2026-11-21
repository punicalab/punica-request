import { createClient, isHttpError } from '@punica/request';
import type { Client } from '@punica/request';
import { onError, refreshToken, tokenAuth } from '..';
import { deferred, json, recorder, settled } from './support';

const baseURL = 'https://api.example.com';

/** A server that accepts one token. */
const server = (valid: { token: string }) =>
  recorder((context) =>
    context.headers.get('authorization') === `Bearer ${valid.token}`
      ? json({ at: context.url.pathname })
      : json({ message: 'Unauthorized' }, 401)
  );

describe('refreshToken', () => {
  test('refreshes once for requests that fail together and sends them again', async () => {
    const valid = { token: 'new' };
    let token = 'old';
    const refresh = jest.fn(async () => {
      await settled();
      token = 'new';
    });
    const { adapter, sent } = server(valid);
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        refreshToken({ refresh }),
        tokenAuth({ getToken: () => token })
      ]
    });
    const responses = await Promise.all([
      api.get('a'),
      api.get('b'),
      api.post('c')
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(responses.map((one) => one.data)).toEqual([
      { at: '/a' },
      { at: '/b' },
      { at: '/c' }
    ]);
    expect(sent).toHaveLength(6);
  });

  test('the request that is sent again carries the new token', async () => {
    let token = 'old';
    const { adapter, sent } = server({ token: 'new' });
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        refreshToken({ refresh: () => void (token = 'new') }),
        tokenAuth({ getToken: () => token })
      ]
    });

    await api.get('items');

    expect(sent.map((one) => one.headers.authorization)).toEqual([
      'Bearer old',
      'Bearer new'
    ]);
  });

  test('does not go on refreshing while the server keeps answering 401', async () => {
    const refresh = jest.fn(async () => true);
    const { adapter, sent } = recorder(json({}, 401));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [refreshToken({ refresh })]
    });
    const error = await api.get('items').catch((e) => e);

    expect(isHttpError(error) && error.status).toBe(401);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
  });

  test('a token that could not be refreshed leaves the 401 to what follows', async () => {
    const seen: number[] = [];
    const { adapter, sent } = recorder(json({ message: 'Unauthorized' }, 401));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        onError({ 401: (response) => void seen.push(response.status) }),
        refreshToken({ refresh: async () => false })
      ]
    });
    const error = await api.get('items').catch((e) => e);

    expect(error.status).toBe(401);
    expect(error.response.data).toEqual({ message: 'Unauthorized' });
    expect(seen).toEqual([401]);
    expect(sent).toHaveLength(1);
  });

  test('a provider that refreshes through the same API does not wait for itself', async () => {
    const { adapter, sent } = recorder(json({}, 401));
    // eslint-disable-next-line prefer-const
    let api: Client;
    const refresh = jest.fn(async () => {
      await api.post('auth/refresh');
    });

    api = createClient({
      baseURL,
      adapter,
      timeout: 1000,
      middlewares: [
        refreshToken({
          refresh,
          exclude: (context) => context.url.pathname === '/auth/refresh'
        })
      ]
    });

    const error = await api.get('items').catch((e) => e);

    // The 401 of the refresh itself, not a timeout of a request that waited for itself
    expect(isHttpError(error) && error.context.url.pathname).toBe(
      '/auth/refresh'
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sent.map((one) => one.context.url.pathname)).toEqual([
      '/items',
      '/auth/refresh'
    ]);
  });

  test('a refresh that throws rejects the requests that wait for it', async () => {
    const failure = new Error('session is over');
    const { adapter, sent } = recorder(json({}, 401));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        refreshToken({
          refresh: async () => {
            await settled();

            throw failure;
          }
        })
      ]
    });
    const results = await Promise.allSettled([api.get('a'), api.get('b')]);

    expect(results.map((one) => (one as PromiseRejectedResult).reason)).toEqual(
      [failure, failure]
    );
    expect(sent).toHaveLength(2);
  });

  test('a token that could not be refreshed leaves every waiting request its 401', async () => {
    const { adapter, sent } = recorder(json({}, 401));
    const refresh = jest.fn(async () => {
      await settled();

      return false;
    });
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [refreshToken({ refresh })]
    });
    const results = await Promise.allSettled([api.get('a'), api.get('b')]);

    expect(
      results.map((one) => (one as PromiseRejectedResult).reason.status)
    ).toEqual([401, 401]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
  });

  test('a request cancelled while the token is refreshed is not sent again', async () => {
    const refreshed = deferred<boolean>();
    const controller = new AbortController();
    const { adapter, sent } = recorder(json({}, 401));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [refreshToken({ refresh: () => refreshed.promise })]
    });
    const pending = api
      .get('items', { signal: controller.signal })
      .catch((e) => e);

    await settled();
    controller.abort();

    expect((await pending).reason).toBe('abort');

    refreshed.resolve(true);
    await settled();

    expect(sent).toHaveLength(1);
  });

  test('refreshes again for a 401 that comes later', async () => {
    const valid = { token: 't1' };
    let token = 't0';
    let count = 0;
    const refresh = jest.fn(() => {
      count += 1;
      token = `t${count}`;
    });
    const { adapter } = server(valid);
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        refreshToken({ refresh }),
        tokenAuth({ getToken: () => token })
      ]
    });

    await api.get('a');
    valid.token = 't2';
    await api.get('b');

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test('a request answered 401 after the token was refreshed is sent again without another refresh', async () => {
    let token = 'old';
    const refresh = jest.fn(() => void (token = 'new'));
    const slow = deferred<Response>();
    const { adapter, sent } = recorder((context) => {
      if (context.headers.get('authorization') === 'Bearer new') {
        return json({ at: context.url.pathname });
      }

      return context.url.pathname === '/slow' ? slow.promise : json({}, 401);
    });
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        refreshToken({ refresh }),
        tokenAuth({ getToken: () => token })
      ]
    });
    const late = api.get('slow');

    await api.get('fast');
    slow.resolve(json({}, 401));

    expect((await late).data).toEqual({ at: '/slow' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(4);
  });

  test('leaves other responses alone', async () => {
    const refresh = jest.fn();
    const { adapter } = recorder(json({}, 403));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [refreshToken({ refresh })]
    });

    await expect(api.get('items')).rejects.toMatchObject({ status: 403 });
    expect(refresh).not.toHaveBeenCalled();
  });

  test('works for a request made with throwHttpErrors: false', async () => {
    let token = 'old';
    const { adapter } = server({ token: 'new' });
    const api = createClient({
      baseURL,
      adapter,
      throwHttpErrors: false,
      middlewares: [
        refreshToken({ refresh: () => void (token = 'new') }),
        tokenAuth({ getToken: () => token })
      ]
    });

    expect((await api.get('items')).status).toBe(200);
  });

  test('needs a refresh function', () => {
    expect(() => refreshToken({} as any)).toThrow(/needs a function/);
  });
});

describe('onError', () => {
  test('calls the handler of the status, then the request rejects with its HttpError', async () => {
    const handler = jest.fn();
    const { adapter } = recorder(json({ message: 'Gone' }, 410));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [onError({ 410: handler })]
    });
    const error = await api.get('items').catch((e) => e);

    expect(isHttpError(error) && error.status).toBe(410);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].data).toEqual({ message: 'Gone' });
    expect(handler.mock.calls[0][1].method).toBe('GET');
  });

  test('waits for a handler that waits', async () => {
    const order: string[] = [];
    const { adapter } = recorder(json({}, 500));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        onError({
          500: async () => {
            await settled();
            order.push('handled');
          }
        })
      ]
    });

    await api.get('items').catch(() => order.push('rejected'));

    expect(order).toEqual(['handled', 'rejected']);
  });

  test('uses default for a status without a handler, and nothing when there is none', async () => {
    const fallback = jest.fn();
    const { adapter } = recorder(json({}, 502));
    const withDefault = createClient({
      baseURL,
      adapter,
      middlewares: [onError({ 401: jest.fn(), default: fallback })]
    });
    const without = createClient({
      baseURL,
      adapter,
      middlewares: [onError({ 401: jest.fn() })]
    });

    await expect(withDefault.get('x')).rejects.toMatchObject({ status: 502 });
    await expect(without.get('x')).rejects.toMatchObject({ status: 502 });
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  test('leaves 2xx responses and requests that could not be sent alone', async () => {
    const handler = jest.fn();
    const { adapter } = recorder(json({}), new TypeError('Failed to fetch'));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [onError({ default: handler })]
    });

    await api.get('items');
    await expect(api.get('items')).rejects.toMatchObject({ reason: 'network' });
    expect(handler).not.toHaveBeenCalled();
  });

  test('is silent for a request made with throwHttpErrors: false', async () => {
    const handler = jest.fn();
    const { adapter } = recorder(json({}, 404));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [onError({ default: handler })]
    });
    const response = await api.get('items', { throwHttpErrors: false });

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });

  test('sees the response the caller gets, after a refresh', async () => {
    let token = 'old';
    const handler = jest.fn();
    const { adapter } = recorder((context) =>
      context.headers.get('authorization') === 'Bearer new'
        ? json({ ok: 1 })
        : json({}, 401)
    );
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        onError({ 401: handler }),
        refreshToken({ refresh: () => void (token = 'new') }),
        tokenAuth({ getToken: () => token })
      ]
    });

    expect((await api.get('items')).data).toEqual({ ok: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  test('is silent for a request that was cancelled before its response got here', async () => {
    const handler = jest.fn();
    const controller = new AbortController();
    const held = deferred<void>();
    const { adapter } = recorder(json({}, 401));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        onError({ 401: handler }),
        async (_, next) => {
          const response = await next();

          await held.promise;

          return response;
        }
      ]
    });
    const pending = api
      .get('items', { signal: controller.signal })
      .catch((e) => e);

    await settled();
    controller.abort();

    expect((await pending).reason).toBe('abort');

    held.resolve();
    await settled();

    expect(handler).not.toHaveBeenCalled();
  });

  test('a handler that throws rejects the request with what it threw', async () => {
    const failure = new Error('handler broke');
    const { adapter } = recorder(json({}, 500));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        onError({
          500: () => {
            throw failure;
          }
        })
      ]
    });

    await expect(api.get('items')).rejects.toBe(failure);
  });

  test('needs its handlers', () => {
    expect(() => (onError as any)()).toThrow(/needs its handlers/);
  });
});
