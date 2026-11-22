import {
  createClient,
  when,
  HttpError,
  RequestError,
  isHttpError,
  isRequestError,
  Middleware
} from '..';
import { recorder, json, hanging } from './support';

const baseURL = 'https://api.example.com/v1';

describe('createClient', () => {
  it('needs an adapter that is a function', () => {
    expect(() => createClient({} as any)).toThrow(/needs an adapter/);
    expect(() => createClient({ adapter: {} as any })).toThrow(TypeError);
  });

  it('refuses a middleware that is not a function', () => {
    const { adapter } = recorder();

    expect(() =>
      createClient({ adapter, middlewares: [{ process() {} } as any] })
    ).toThrow(/middlewares\[0\] is not a function/);
  });

  it('sends each method', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({ baseURL, adapter });

    await api.get('a');
    await api.post('a');
    await api.put('a');
    await api.patch('a');
    await api.delete('a');
    await api.head('a');
    await api.request('OPTIONS', 'a');

    expect(sent.map((one) => one.method)).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'HEAD',
      'OPTIONS'
    ]);
  });

  it('gives the response with its body read', async () => {
    const { adapter } = recorder(json({ id: 1 }, 201, { 'x-total': '4' }));
    const api = createClient({ baseURL, adapter });
    const response = await api.post<{ id: number }>('items');

    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    expect(response.data.id).toBe(1);
    expect(response.headers.get('x-total')).toBe('4');
    expect(response.raw).toBeInstanceOf(Response);
  });
});

describe('middlewares', () => {
  it('run as an onion: out in their order, back in reverse', async () => {
    const order: string[] = [];
    const step =
      (name: string): Middleware =>
      async (_, next) => {
        order.push(`${name} out`);

        const response = await next();

        order.push(`${name} back`);

        return response;
      };
    const { adapter } = recorder(() => {
      order.push('adapter');

      return json({});
    });
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [step('a'), step('b')]
    });

    await api.get('items');

    expect(order).toEqual(['a out', 'b out', 'adapter', 'b back', 'a back']);
  });

  it('change the request that is sent', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        (context, next) => {
          context.headers.set('authorization', 'Bearer t');
          context.url.searchParams.set('lang', 'tr');

          return next();
        }
      ]
    });

    await api.get('items');

    expect(sent[0].headers.authorization).toBe('Bearer t');
    expect(sent[0].url).toBe('https://api.example.com/v1/items?lang=tr');
  });

  it('answer a request themselves, and nothing is sent', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        async () => ({
          ok: true,
          status: 200,
          headers: new Headers(),
          data: 'kept'
        })
      ]
    });

    expect((await api.get('items')).data).toBe('kept');
    expect(sent).toHaveLength(0);
  });

  it('reject the request by throwing, with what they throw', async () => {
    const { adapter } = recorder();
    const failure = new Error('no');
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        async () => {
          throw failure;
        }
      ]
    });

    await expect(api.get('items')).rejects.toBe(failure);
  });

  it('reject the request when they throw before returning a promise', async () => {
    const { adapter } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        () => {
          throw new Error('at once');
        }
      ]
    });

    await expect(api.get('items')).rejects.toThrow('at once');
  });

  it('that return nothing reject the request instead of leaving it open', async () => {
    const { adapter } = recorder();
    const forgetful = (async (_: unknown, next: () => Promise<unknown>) => {
      await next();
    }) as unknown as Middleware;
    const api = createClient({ baseURL, adapter, middlewares: [forgetful] });

    await expect(api.get('items')).rejects.toThrow(
      /forgetful returned no response/
    );
  });

  it('send the request again by calling next again', async () => {
    const { adapter, sent } = recorder(json({}, 401), json({ ok: 1 }));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        async (context, next) => {
          const first = await next();

          if (first.status !== 401) return first;

          context.headers.set('authorization', 'Bearer new');

          return next();
        }
      ]
    });
    const response = await api.get('items');

    expect(response.data).toEqual({ ok: 1 });
    expect(sent).toHaveLength(2);
    expect(sent[0].headers.authorization).toBeUndefined();
    expect(sent[1].headers.authorization).toBe('Bearer new');
  });

  it('do not share their path between requests that run together', async () => {
    const seen: string[] = [];
    const { adapter } = recorder((context) =>
      json({ at: context.url.pathname })
    );
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        async (context, next) => {
          // The first request waits while the second is set up
          if (context.url.pathname.endsWith('slow')) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          const response = await next();

          seen.push(`${context.method} ${(response.data as any).at}`);

          return response;
        }
      ]
    });
    const [slow, fast] = await Promise.all([
      api.get<{ at: string }>('slow'),
      api.post<{ at: string }>('fast')
    ]);

    expect(slow.data.at).toBe('/v1/slow');
    expect(fast.data.at).toBe('/v1/fast');
    expect(seen).toEqual(['POST /v1/fast', 'GET /v1/slow']);
  });

  it('cannot replace what belongs to the client', async () => {
    const { adapter } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        (context, next) => {
          expect(() => {
            (context as any).signal = new AbortController().signal;
          }).toThrow(TypeError);
          expect(() => {
            (context as any).method = 'POST';
          }).toThrow(TypeError);

          return next();
        }
      ]
    });

    await api.get('items');
  });

  it('tell the headers of the request from those of the client', async () => {
    const seen: Array<Record<string, boolean | string | null>> = [];
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      headers: { Accept: 'application/json', 'Accept-Language': 'en' },
      middlewares: [
        (context, next) => {
          seen.push({
            language: context.requestHeaders.has('accept-language'),
            accept: context.requestHeaders.has('Accept'),
            merged: context.headers.get('accept-language')
          });

          // The language of the page, unless the request names its own
          if (!context.requestHeaders.has('Accept-Language')) {
            context.headers.set('Accept-Language', 'fr');
          }

          return next();
        }
      ]
    });

    await api.get('items');
    await api.get('items', { headers: { 'Accept-Language': 'de' } });
    await api.get('items', { headers: [['accept-language', 'tr']] });
    await api.get('items', { headers: { 'Accept-Language': undefined } });

    expect(seen).toEqual([
      { language: false, accept: false, merged: 'en' },
      { language: true, accept: false, merged: 'de' },
      { language: true, accept: false, merged: 'tr' },
      // Removed by the request: it named none
      { language: false, accept: false, merged: null }
    ]);
    expect(sent.map((one) => one.headers['accept-language'])).toEqual([
      'fr',
      'de',
      'tr',
      'fr'
    ]);
  });

  it('cannot replace the headers of the request, and changing them sends nothing else', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        (context, next) => {
          expect(() => {
            (context as any).requestHeaders = new Headers();
          }).toThrow(TypeError);
          context.requestHeaders.set('x-late', '1');

          return next();
        }
      ]
    });

    await api.get('items', { headers: { 'X-Own': '1' } });

    expect(sent[0].headers).toEqual({ 'x-own': '1' });
  });

  it('see the options of the request, their own included', async () => {
    const { adapter } = recorder();
    let seen: unknown;
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        (context, next) => {
          seen = (context.options as any).cache;

          return next();
        }
      ]
    });

    await api.get('items', { cache: { ttl: 5 } } as any);

    expect(seen).toEqual({ ttl: 5 });
  });

  it('when() limits a middleware to some requests', async () => {
    const { adapter, sent } = recorder();
    const mark: Middleware = (context, next) => {
      context.headers.set('x-mark', '1');

      return next();
    };
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [when((context) => context.method === 'GET', mark)]
    });

    await api.get('items');
    await api.post('items');

    expect(sent[0].headers['x-mark']).toBe('1');
    expect(sent[1].headers['x-mark']).toBeUndefined();
  });
});

describe('responses outside 2xx', () => {
  it('reject with an HttpError that carries the response', async () => {
    const { adapter } = recorder(json({ message: 'Not here' }, 404));
    const api = createClient({ baseURL, adapter });
    const error = await api.get('items/9').catch((e) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(isHttpError(error)).toBe(true);
    expect(isRequestError(error)).toBe(false);
    expect(error.status).toBe(404);
    expect(error.response.data).toEqual({ message: 'Not here' });
    expect(error.response.ok).toBe(false);
    expect(error.context.method).toBe('GET');
    expect(error.message).toBe(
      'Request failed with status 404: GET https://api.example.com/v1/items/9'
    );
  });

  it('reach every middleware as a response first, without a try', async () => {
    const statuses: number[] = [];
    const { adapter } = recorder(json({}, 500));
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        async (_, next) => {
          const response = await next();

          statuses.push(response.status);

          return response;
        }
      ]
    });

    await expect(api.get('items')).rejects.toBeInstanceOf(HttpError);
    expect(statuses).toEqual([500]);
  });

  it('resolve for a client with throwHttpErrors: false', async () => {
    const { adapter } = recorder(json({ message: 'No' }, 403));
    const api = createClient({ baseURL, adapter, throwHttpErrors: false });
    const response = await api.get('items');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(403);
    expect(response.data).toEqual({ message: 'No' });
  });

  it('follow throwHttpErrors of the request before that of the client', async () => {
    const { adapter } = recorder(json({}, 403));
    const lenient = createClient({ baseURL, adapter, throwHttpErrors: false });
    const strict = createClient({ baseURL, adapter });

    await expect(
      lenient.get('items', { throwHttpErrors: true })
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      strict.get('items', { throwHttpErrors: false })
    ).resolves.toMatchObject({ status: 403 });
  });

  it('tell middlewares whether they will reject', async () => {
    const seen: boolean[] = [];
    const { adapter } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        (context, next) => {
          seen.push(context.throwHttpErrors);

          return next();
        }
      ]
    });

    await api.get('items');
    await api.get('items', { throwHttpErrors: false });

    expect(seen).toEqual([true, false]);
  });

  it('do not take headers or the query along when the error is written out', async () => {
    const { adapter } = recorder(json({}, 401, { 'set-cookie': 'sid=secret' }));
    const api = createClient({
      baseURL,
      adapter,
      headers: { authorization: 'Bearer secret' }
    });
    const error = await api
      .get('items', { query: { key: 'secret' } })
      .catch((e) => e);
    const written = JSON.stringify(error) + String(error) + error.stack;

    expect(written).not.toContain('secret');
    expect(Object.keys(error).sort()).toEqual(['name', 'status']);
    // Still there for the code that asks
    expect(error.context.headers.get('authorization')).toBe('Bearer secret');
  });

  it('are recognised by their brand, whatever copy of the package made them', () => {
    const foreign = Object.create({
      [Symbol.for('@punica/request:HttpError')]: true
    });
    const other = Object.create({
      [Symbol.for('@punica/request:RequestError')]: true
    });

    expect(isHttpError(foreign)).toBe(true);
    expect(isRequestError(other)).toBe(true);
    expect(isHttpError(new Error('x'))).toBe(false);
    expect(isHttpError(null)).toBe(false);
    expect(isRequestError('abort')).toBe(false);
  });
});

describe('requests that bring no response', () => {
  it('reject with a RequestError of reason network, with its cause', async () => {
    const cause = new TypeError('Failed to fetch');
    const { adapter } = recorder(cause);
    const api = createClient({ baseURL, adapter });
    const error = await api.get('items').catch((e) => e);

    expect(error).toBeInstanceOf(RequestError);
    expect(isRequestError(error)).toBe(true);
    expect(error.reason).toBe('network');
    expect(error.cause).toBe(cause);
    expect(error.context.url.href).toBe('https://api.example.com/v1/items');
  });

  it('reach the middlewares as that error', async () => {
    const { adapter } = recorder(new TypeError('Failed to fetch'));
    let caught: unknown;
    const api = createClient({
      baseURL,
      adapter,
      middlewares: [
        async (_, next) => {
          try {
            return await next();
          } catch (error) {
            caught = error;

            throw error;
          }
        }
      ]
    });

    await expect(api.get('items')).rejects.toBeInstanceOf(RequestError);
    expect(isRequestError(caught) && caught.reason).toBe('network');
  });

  it('reject when the adapter gives something that is no response', async () => {
    const api = createClient({
      baseURL,
      adapter: (async () => ({ payload: 1 })) as any
    });

    await expect(api.get('items')).rejects.toThrow(
      /adapter did not return a Response/
    );
  });
});

describe('timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('rejects with reason timeout and aborts the signal of the request', async () => {
    let signal: AbortSignal | undefined;
    const api = createClient({
      baseURL,
      timeout: 1000,
      adapter: (context) => {
        signal = context.signal;

        return hanging(context);
      }
    });
    const pending = api.get('items').catch((e) => e);

    await jest.advanceTimersByTimeAsync(1000);

    const error = await pending;

    expect(isRequestError(error) && error.reason).toBe('timeout');
    expect(signal?.aborted).toBe(true);
  });

  it('ends a request whose middleware never answers', async () => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL,
      adapter,
      timeout: 500,
      middlewares: [() => new Promise(() => undefined)]
    });
    const pending = api.get('items').catch((e) => e);

    await jest.advanceTimersByTimeAsync(500);

    expect((await pending).reason).toBe('timeout');
    expect(sent).toHaveLength(0);
  });

  it('covers the whole request, attempts sent again included', async () => {
    let attempts = 0;
    const api = createClient({
      baseURL,
      timeout: 1000,
      adapter: async (context) => {
        attempts += 1;

        if (attempts === 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));

          return json({}, 401);
        }

        return hanging(context);
      },
      middlewares: [
        async (_, next) => {
          const response = await next();

          return response.status === 401 ? next() : response;
        }
      ]
    });
    const pending = api.get('items').catch((e) => e);

    await jest.advanceTimersByTimeAsync(999);
    expect(attempts).toBe(2);
    await jest.advanceTimersByTimeAsync(1);

    expect((await pending).reason).toBe('timeout');
  });

  it('of the request comes before that of the client, and 0 means none', async () => {
    const api = createClient({ baseURL, timeout: 100, adapter: hanging });
    const longer = api.get('items', { timeout: 300 }).catch((e) => e);
    const none = api.get('items', { timeout: 0 });
    let settled = false;

    none.then(
      () => (settled = true),
      () => (settled = true)
    );

    await jest.advanceTimersByTimeAsync(299);
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect((await longer).reason).toBe('timeout');

    await jest.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
  });

  it.each([Infinity, 2 ** 31, 3e9, -5, NaN])(
    'of %p does not end the request at once',
    async (timeout) => {
      const { adapter } = recorder(
        () =>
          new Promise<Response>((resolve) =>
            setTimeout(() => resolve(json({ ok: 1 })), 5000)
          )
      );
      const api = createClient({ baseURL, adapter, timeout });
      const pending = api.get('items');

      await jest.advanceTimersByTimeAsync(5000);

      expect((await pending).data).toEqual({ ok: 1 });
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  it('leaves no timer behind, however the request ends', async () => {
    const { adapter } = recorder(json({}), json({}, 500), new Error('down'));
    const api = createClient({ baseURL, adapter, timeout: 1000 });

    await api.get('items');
    await api.get('items').catch(() => undefined);
    await api.get('items').catch(() => undefined);
    await api.get('items', { body: 'x' }).catch(() => undefined);

    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('cancellation', () => {
  it('by the signal of the caller rejects with reason abort and its reason as cause', async () => {
    const controller = new AbortController();
    const api = createClient({ baseURL, adapter: hanging });
    const pending = api
      .get('items', { signal: controller.signal })
      .catch((e) => e);
    const reason = new Error('left the page');

    controller.abort(reason);

    const error = await pending;

    expect(isRequestError(error) && error.reason).toBe('abort');
    expect(error.cause).toBe(reason);
  });

  it('before the request starts sends nothing and runs no middleware', async () => {
    const { adapter, sent } = recorder();
    const middleware = jest.fn((_, next) => next());
    const api = createClient({ baseURL, adapter, middlewares: [middleware] });

    await expect(
      api.get('items', { signal: AbortSignal.abort() })
    ).rejects.toMatchObject({ reason: 'abort' });
    expect(middleware).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it('by a middleware, through the context, also from outside the request', async () => {
    let cancel: (() => void) | undefined;
    const api = createClient({
      baseURL,
      adapter: hanging,
      middlewares: [
        (context, next) => {
          cancel = () => context.abort();

          return next();
        }
      ]
    });
    const pending = api.get('items').catch((e) => e);

    await Promise.resolve();
    await Promise.resolve();
    cancel?.();

    expect((await pending).reason).toBe('abort');
  });

  it('wins over a middleware that would answer after it', async () => {
    const controller = new AbortController();
    const api = createClient({
      baseURL,
      adapter: hanging,
      middlewares: [
        async (_, next) => {
          try {
            return await next();
          } catch {
            return { ok: true, status: 200, headers: new Headers(), data: 1 };
          }
        }
      ]
    });
    const pending = api
      .get('items', { signal: controller.signal })
      .catch((e) => e);

    controller.abort();

    expect((await pending).reason).toBe('abort');
  });

  it('leaves no listener on the signal of the caller', async () => {
    const controller = new AbortController();
    const add = jest.spyOn(controller.signal, 'addEventListener');
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    const { adapter } = recorder(json({}), json({}, 500), new Error('down'));
    const api = createClient({ baseURL, adapter });
    const options = { signal: controller.signal };

    await api.get('items', options);
    await api.get('items', options).catch(() => undefined);
    await api.get('items', options).catch(() => undefined);

    expect(add).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenCalledTimes(3);
    add.mock.calls.forEach((call, index) => {
      expect(remove.mock.calls[index][1]).toBe(call[1]);
    });
  });

  it('after the request is over does not reach the request any more', async () => {
    const controller = new AbortController();
    let signal: AbortSignal | undefined;
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    const api = createClient({
      baseURL,
      adapter: async (context) => {
        signal = context.signal;

        return json({ id: 1 });
      }
    });

    process.on('unhandledRejection', onRejection);

    try {
      await api.get('items', { signal: controller.signal });
      controller.abort();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(signal?.aborted).toBe(false);
      expect(rejections).toEqual([]);
    } finally {
      process.off('unhandledRejection', onRejection);
    }
  });

  describe('of a stream, which is read after the request', () => {
    const body = () =>
      new Response('abc', { headers: { 'content-type': 'text/plain' } });
    const spied = () => {
      const controller = new AbortController();

      return {
        controller,
        add: jest.spyOn(controller.signal, 'addEventListener'),
        remove: jest.spyOn(controller.signal, 'removeEventListener')
      };
    };
    const stream = async (signal: AbortSignal) => {
      let inner: AbortSignal | undefined;
      const api = createClient({
        baseURL,
        timeout: 1000,
        adapter: async (context) => {
          inner = context.signal;

          return body();
        }
      });
      const { data } = await api.get<ReadableStream<Uint8Array>>('events', {
        signal,
        responseType: 'stream'
      });

      return { data, inner: inner as AbortSignal };
    };

    it('still follows the signal of the caller while it is read', async () => {
      const { controller, remove } = spied();
      const { inner } = await stream(controller.signal);

      expect(remove).not.toHaveBeenCalled();

      controller.abort();

      expect(inner.aborted).toBe(true);
    });

    it('lets go of the signal once it has been read', async () => {
      const { controller, add, remove } = spied();

      for (let i = 0; i < 3; i++) {
        const { data } = await stream(controller.signal);

        expect(await new Response(data).text()).toBe('abc');
      }

      expect(add).toHaveBeenCalledTimes(3);
      expect(remove).toHaveBeenCalledTimes(3);
    });

    it('lets go of the signal when it is given up', async () => {
      const { controller, remove } = spied();
      const { data, inner } = await stream(controller.signal);

      await data.cancel();
      controller.abort();

      expect(remove).toHaveBeenCalledTimes(1);
      expect(inner.aborted).toBe(false);
    });

    it('follows the signal also when a middleware gave the response another stream', async () => {
      const { controller, remove } = spied();
      let inner: AbortSignal | undefined;
      const api = createClient({
        baseURL,
        adapter: async (context) => {
          inner = context.signal;

          return body();
        },
        middlewares: [
          async (_, next) => {
            const response = await next();

            response.data = (response.data as ReadableStream).pipeThrough(
              new TransformStream()
            );

            return response;
          }
        ]
      });
      const { data } = await api.get<ReadableStream<Uint8Array>>('events', {
        signal: controller.signal,
        responseType: 'stream'
      });

      expect(remove).not.toHaveBeenCalled();

      controller.abort();

      expect(inner?.aborted).toBe(true);
      expect(data).toBeInstanceOf(ReadableStream);
    });

    it('that a middleware reads itself is left alone, and nothing is left behind', async () => {
      const { controller, add, remove } = spied();
      const api = createClient({
        baseURL,
        adapter: async () => body(),
        middlewares: [
          async (_, next) => {
            const response = await next();

            // Locked from here on: nobody else can read it
            (response.data as ReadableStream).getReader();

            return response;
          }
        ]
      });
      const response = await api.get('events', {
        signal: controller.signal,
        responseType: 'stream'
      });

      expect((response.data as ReadableStream).locked).toBe(true);
      expect(remove).toHaveBeenCalledTimes(add.mock.calls.length);
    });

    it('is not ended by the timeout, which is over when the response is there', async () => {
      jest.useFakeTimers();

      try {
        const { data, inner } = await stream(new AbortController().signal);

        await jest.advanceTimersByTimeAsync(5000);

        expect(jest.getTimerCount()).toBe(0);
        expect(inner.aborted).toBe(false);
        expect(await new Response(data).text()).toBe('abc');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
