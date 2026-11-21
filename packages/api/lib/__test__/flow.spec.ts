import {
  BaseMiddleware,
  HttpResponse,
  IConfig,
  IRequest,
  ProcessData,
  RequestAPI,
  RequestParams,
  getCookie
} from '..';

/** Records what it is asked to send and answers with it. */
class Recorder implements IRequest {
  public calls: string[] = [];
  public fail: unknown;

  public set config(_value: IConfig) {}

  #answer(method: string, params: RequestParams<any>): Promise<HttpResponse> {
    this.calls.push(`${method} ${params.path}`);

    return this.fail
      ? Promise.reject(this.fail)
      : Promise.resolve({ status: 200, response: null, payload: method });
  }

  public get = (params: RequestParams<any>) => this.#answer('GET', params);
  public delete = (params: RequestParams<any>) =>
    this.#answer('DELETE', params);
  public post = (params: RequestParams<any>) => this.#answer('POST', params);
  public put = (params: RequestParams<any>) => this.#answer('PUT', params);
  public patch = (params: RequestParams<any>) => this.#answer('PATCH', params);
}

/** Waits before it lets a request on, as a middleware that reads a cache does. */
class Slow extends BaseMiddleware {
  public process = async (processData: ProcessData) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.next(processData);
  };
}

class Plain extends BaseMiddleware {
  public process(processData: ProcessData) {
    this.next(processData);
  }
}

describe('the path of a request', () => {
  test('requests that run at the same time each keep their own path', async () => {
    const adapter = new Recorder();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new Slow(), new Plain()]
    });

    // The second request is set up while the first one is still waiting
    const [first, second, third] = await Promise.all([
      api.get({ path: 'a' }),
      api.post({ path: 'b' }),
      api.delete({ path: 'c' })
    ]);

    expect(first.payload).toBe('GET');
    expect(second.payload).toBe('POST');
    expect(third.payload).toBe('DELETE');
    expect(adapter.calls.sort()).toEqual(['DELETE c', 'GET a', 'POST b']);
  });

  test('a request that cannot be sent rejects', async () => {
    const adapter = new Recorder();
    const api = new RequestAPI(adapter, { hostname: 'https://host/' });

    adapter.fail = new TypeError('Failed to fetch');

    await expect(api.get({ path: 'a' })).rejects.toThrow('Failed to fetch');
  });

  test('what a response middleware throws rejects the request', async () => {
    class Broken extends BaseMiddleware {
      public process(): void {
        throw new Error('cannot read the response');
      }
    }

    const api = new RequestAPI(new Recorder(), {
      hostname: 'https://host/',
      responseMiddlewares: [new Broken()]
    });

    await expect(api.get({ path: 'a' })).rejects.toThrow(
      'cannot read the response'
    );
  });

  test('what is thrown after a middleware that waits rejects the request too', async () => {
    class Broken extends BaseMiddleware {
      public process(): void {
        throw new Error('cannot go on');
      }
    }

    const before = new RequestAPI(new Recorder(), {
      hostname: 'https://host/',
      requestMiddlewares: [new Slow(), new Broken()]
    });
    const after = new RequestAPI(new Recorder(), {
      hostname: 'https://host/',
      responseMiddlewares: [new Slow(), new Broken()]
    });

    await expect(before.get({ path: 'a' })).rejects.toThrow('cannot go on');
    await expect(after.get({ path: 'a' })).rejects.toThrow('cannot go on');
  });

  test('a middleware listed for the request and for the response is passed twice', async () => {
    const adapter = new Recorder();
    const seen: string[] = [];

    class Log extends BaseMiddleware {
      public process(processData: ProcessData) {
        seen.push(processData.httpResponse ? 'response' : 'request');
        this.next(processData);
      }
    }

    const log = new Log();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [log],
      responseMiddlewares: [log]
    });
    const response = await api.get({ path: 'a' });

    expect(response.payload).toBe('GET');
    expect(seen).toEqual(['request', 'response']);
    expect(adapter.calls).toEqual(['GET a']);
  });

  test('an instance listed twice in a row is passed twice', async () => {
    const adapter = new Recorder();
    let passed = 0;

    class Count extends BaseMiddleware {
      public process(processData: ProcessData) {
        passed++;
        this.next(processData);
      }
    }

    const count = new Count();
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [count, count]
    });

    await api.get({ path: 'a' });

    expect(passed).toBe(2);
    expect(adapter.calls).toEqual(['GET a']);
  });

  test('a middleware another one hands the request to goes where it was told', async () => {
    const adapter = new Recorder();

    class Inner extends BaseMiddleware {
      public process(processData: ProcessData) {
        this.next(processData);
      }
    }

    /** Hands every request to a middleware of its own, then goes on. */
    class Outer extends BaseMiddleware {
      #inner = new Inner();

      public process(processData: ProcessData) {
        this.#inner.nextMiddleware = {
          process: (data: ProcessData) => this.next(data)
        } as Inner;
        this.#inner.process(processData);
      }
    }

    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new Outer()]
    });

    expect((await api.get({ path: 'a' })).payload).toBe('GET');
    expect(adapter.calls).toEqual(['GET a']);
  });

  test('a rejection of any kind of promise ends the request', async () => {
    class Foreign extends BaseMiddleware {
      // What a promise of another library or another realm looks like
      public process(): any {
        return {
          then: (_done: unknown, failed: (reason: Error) => void) =>
            failed(new Error('from elsewhere'))
        };
      }
    }

    const api = new RequestAPI(new Recorder(), {
      hostname: 'https://host/',
      requestMiddlewares: [new Foreign()]
    });

    await expect(api.get({ path: 'a' })).rejects.toThrow('from elsewhere');
  });

  test('a middleware can send a request again, along its own path', async () => {
    const adapter = new Recorder();

    /** Sends every request twice. */
    class Twice extends BaseMiddleware {
      #seen = new WeakSet<ProcessData>();

      public process(processData: ProcessData) {
        if (this.#seen.has(processData)) {
          this.next(processData);

          return;
        }

        this.#seen.add(processData);
        this.restart(processData);
      }
    }

    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      requestMiddlewares: [new Slow()],
      responseMiddlewares: [new Twice()]
    });
    const [first, second] = await Promise.all([
      api.get({ path: 'a' }),
      api.put({ path: 'b' })
    ]);

    expect(first.payload).toBe('GET');
    expect(second.payload).toBe('PUT');
    expect(adapter.calls.sort()).toEqual(['GET a', 'GET a', 'PUT b', 'PUT b']);
  });

  test('a middleware knows the method of the request', async () => {
    const seen: string[] = [];

    class Look extends BaseMiddleware {
      public process(processData: ProcessData) {
        seen.push(`${processData.method} ${processData.params.requestURL}`);
        this.next(processData);
      }
    }

    const api = new RequestAPI(new Recorder(), {
      hostname: 'https://host/',
      requestMiddlewares: [new Look()]
    });

    await api.patch({ path: 'a', query: { page: '2' } });

    expect(seen).toEqual(['PATCH https://host/a?page=2']);
  });
});

describe('getCookie', () => {
  test('reads a cookie from the text it is given', () => {
    expect(getCookie('token', 'a=1; token=abc%20d')).toBe('abc d');
    expect(getCookie('missing', 'a=1')).toBeNull();
    // A name is matched as it is written
    expect(getCookie('user.id', 'userXid=evil; user.id=42')).toBe('42');
    expect(getCookie('a(b', 'a(b=1')).toBe('1');
  });

  test('finds no cookie where there is no document', () => {
    expect(typeof document).toBe('undefined');
    expect(getCookie('token')).toBeNull();
  });
});
