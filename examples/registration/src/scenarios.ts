// What an application does with its client, one scenario each. They run
// against the stand-in API of server.mjs, in a browser and in Node.
import { isHttpError, isRequestError } from '@punica/request';
import type { CacheEntry, IStorage } from '@punica/request-middleware';
import { createApi } from './api';
import type { ApiError, Environment } from './api';

export interface Result {
  name: string;
  ok: boolean;
  detail: string;
}

interface Registration {
  id: string;
  email: string;
  contentType: string;
  csrf: string | null;
}

/** A storage that keeps entries in memory: the same in a browser and in Node. */
export class StorageMemory implements IStorage {
  #entries = new Map<string, CacheEntry>();

  get = async (key: string) => this.#entries.get(key);
  set = async (key: string, entry: CacheEntry) =>
    void this.#entries.set(key, entry);
  delete = async (key: string) => void this.#entries.delete(key);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export const run = async (
  environment: Omit<Environment, 'notify'>,
  browser: boolean
): Promise<Result[]> => {
  const messages: string[] = [];
  const { api, latest, refreshes } = createApi({
    ...environment,
    notify: (message) => messages.push(message)
  });
  const results: Result[] = [];
  const state = async () =>
    (
      await api.get<{ hits: Record<string, number>; validToken: string }>(
        'state'
      )
    ).data;
  const scenario = async (
    name: string,
    body: () => Promise<[boolean, unknown]>
  ) => {
    messages.length = 0;

    try {
      const [ok, detail] = await body();

      results.push({
        name,
        ok,
        detail: typeof detail === 'string' ? detail : JSON.stringify(detail)
      });
    } catch (error) {
      results.push({ name, ok: false, detail: `threw ${String(error)}` });
    }
  };

  await scenario(
    'the language of the page goes with a request, a request may name its own',
    async () => {
      const page = await api.get<{ language: string }>('pages/7');
      const own = await api.get<{ language: string }>('pages/7', {
        headers: { 'Accept-Language': 'de' }
      });

      return [
        page.data.language === 'fr' &&
          own.data.language === 'de' &&
          page.headers.get('x-request-language') === 'fr',
        [page.data.language, own.data.language]
      ];
    }
  );

  await scenario(
    'a query leaves out what is empty and repeats arrays',
    async () => {
      const { data } = await api.get<{ query: string }>('pages/7', {
        query: {
          page: 2,
          tags: ['a', 'b'],
          search: undefined,
          filter: null,
          exact: false
        }
      });

      return [data.query === '?page=2&tags=a&tags=b&exact=false', data.query];
    }
  );

  await scenario(
    'a JSON body is serialised and typed, the answer is read',
    async () => {
      const response = await api.post<Registration>('registration', {
        json: { email: 'ada@example.com' }
      });

      return [
        response.status === 201 &&
          response.data.email === 'ada@example.com' &&
          response.data.contentType === 'application/json',
        [response.status, response.data.contentType]
      ];
    }
  );

  await scenario(
    'a failed validation rejects with the errors of the server, and the user is told',
    async () => {
      const error = await api
        .post('registration', { json: {} })
        .catch((e) => e);

      return [
        isHttpError<ApiError>(error) &&
          error.status === 400 &&
          error.response.data.errors.email[0] === 'Email is required' &&
          same(messages, ['Email is required']),
        [isHttpError(error) && error.status, messages]
      ];
    }
  );

  await scenario(
    'a request that deals with its failure itself shows no message',
    async () => {
      const error = await api
        .post('registration', { json: {}, ignoreNotification: true })
        .catch((e) => e);

      return [isHttpError(error) && messages.length === 0, messages];
    }
  );

  await scenario('a failure can be asked for as a response', async () => {
    const response = await api.get<ApiError>('nowhere', {
      throwHttpErrors: false
    });

    return [
      !response.ok && response.status === 404 && messages.length === 0,
      [response.status, response.data]
    ];
  });

  await scenario(
    'a 409 and a 500 reach the catch with their status',
    async () => {
      const conflict = await api
        .put('sessions/3', { json: {} })
        .catch((e) => e);
      const broken = await api.get('broken').catch((e) => e);

      return [
        isHttpError(conflict) &&
          conflict.status === 409 &&
          isHttpError(broken) &&
          broken.status === 500 &&
          same(messages, ['Session is full', 'Something went wrong']),
        messages
      ];
    }
  );

  await scenario(
    'the token goes with a request; an expired one is refreshed once for requests that fail together',
    async () => {
      environment.token.set('expired');

      const before = refreshes();
      const [a, b, c] = await Promise.all([
        api.get<{ token: string }>('cart'),
        api.get<{ token: string }>('cart'),
        api.get<{ token: string }>('cart')
      ]);
      const { validToken } = await state();

      return [
        refreshes() - before === 1 &&
          [a, b, c].every((one) => one.data.token === `Bearer ${validToken}`) &&
          messages.length === 0,
        { refreshes: refreshes() - before, token: a.data.token, messages }
      ];
    }
  );

  await scenario(
    'a response is cached when the request asks for it, for as long as it says',
    async () => {
      const before = (await state()).hits['GET /v1/countries'] ?? 0;
      const first = await api.get<string[]>('countries', {
        cache: { ttl: 80 }
      });
      const second = await api.get<string[]>('countries', {
        cache: { ttl: 80 }
      });
      const uncached = await api.get<string[]>('countries');

      await wait(100);

      const third = await api.get<string[]>('countries', {
        cache: { ttl: 80 }
      });
      const hits = (await state()).hits['GET /v1/countries'] - before;

      return [
        hits === 3 &&
          same(second.data, first.data) &&
          second.raw === undefined &&
          second.headers.get('x-total') === '2' &&
          uncached.raw !== undefined &&
          third.raw !== undefined,
        { hits, cached: second.data }
      ];
    }
  );

  await scenario(
    'a search that was replaced by a newer one is cancelled',
    async () => {
      const outcome = (q: string) =>
        api.get<{ q: string }>('search', { query: { q } }).then(
          (response) => response.data.q,
          (error) => (isRequestError(error) ? error.reason : String(error))
        );
      const first = outcome('p');

      await wait(10);

      const second = outcome('pa');

      await wait(10);

      const third = outcome('paper');
      const all = await Promise.all([first, second, third]);

      return [same(all, ['abort', 'abort', 'paper']), all];
    }
  );

  await scenario('cancelAll cancels a search that is under way', async () => {
    const pending = api
      .get('search', { query: { q: 'slow' } })
      .catch((e) => (isRequestError(e) ? e.reason : String(e)));

    await wait(10);
    latest.cancelAll();

    return [(await pending) === 'abort', await pending];
  });

  await scenario(
    'a request that takes too long is ended by the timeout of the client',
    async () => {
      const started = Date.now();
      const error = await api.get('slow').catch((e) => e);
      const took = Date.now() - started;

      return [
        isRequestError(error) && error.reason === 'timeout' && took < 1500,
        { reason: error.reason, took }
      ];
    }
  );

  await scenario('the caller cancels a request with its signal', async () => {
    const controller = new AbortController();
    const pending = api
      .get('slow', { signal: controller.signal })
      .catch((e) => e);

    await wait(20);
    controller.abort();

    const error = await pending;

    return [isRequestError(error) && error.reason === 'abort', error.reason];
  });

  await scenario(
    'a form with a file is sent as multipart, with a type nobody set',
    async () => {
      const form = new FormData();

      form.append('name', 'Ada');
      form.append(
        'file',
        new Blob(['badge'], { type: 'text/plain' }),
        'badge.txt'
      );

      const { data } = await api.post<{ type: string; hasFile: boolean }>(
        'upload',
        { body: form }
      );

      return [
        data.hasFile && data.type.startsWith('multipart/form-data; boundary='),
        data
      ];
    }
  );

  await scenario(
    'a binary answer is a blob, a text answer a text, no answer nothing',
    async () => {
      const badge = await api.get<Blob>('badge');
      const csv = await api.get<string>('export', {
        headers: { Accept: 'text/csv' }
      });
      const removed = await api.delete('sessions/3');

      return [
        badge.data instanceof Blob &&
          badge.data.size === 7 &&
          csv.data === 'id,name\n1,Paper\n' &&
          removed.status === 204 &&
          removed.data === undefined,
        [
          badge.data instanceof Blob && badge.data.size,
          csv.data,
          removed.status
        ]
      ];
    }
  );

  await scenario('a stream is read by the caller', async () => {
    const { data } = await api.get<ReadableStream<Uint8Array>>('events', {
      responseType: 'stream'
    });
    const text = await new Response(data).text();

    return [text === 'data: one\n\ndata: two\n\n', text];
  });

  await scenario(
    'a path that leaves the API is refused before anything is sent',
    async () => {
      const other = await api.get('https://example.com/steal').catch((e) => e);
      const up = await api.get('../admin').catch((e) => e);

      return [
        other instanceof TypeError && up instanceof TypeError,
        String(other).slice(0, 60)
      ];
    }
  );

  await scenario(
    'a server that is not there rejects with reason network',
    async () => {
      const { api: nowhere } = createApi({
        ...environment,
        baseURL: 'http://127.0.0.1:9/v1',
        notify: () => undefined
      });
      const error = await nowhere.get('pages/7').catch((e) => e);

      return [
        isRequestError(error) && error.reason === 'network',
        isRequestError(error) ? error.reason : String(error)
      ];
    }
  );

  await scenario(
    'an error that is written to a log holds no token',
    async () => {
      environment.token.set('secret-token');

      const error = await api
        .get('nowhere', {
          query: { key: 'secret-key' },
          ignoreNotification: true
        })
        .catch((e) => e);
      const written = JSON.stringify(error) + String(error);

      return [isHttpError(error) && !written.includes('secret'), written];
    }
  );

  if (browser) {
    await scenario(
      'a cookie is sent in a header with the requests that change something',
      async () => {
        document.cookie = 'XSRF-TOKEN=csrf-1; path=/';

        const { data } = await api.post<Registration>('registration', {
          json: { email: 'a@b.c' }
        });

        return [data.csrf === 'csrf-1', data.csrf];
      }
    );
  }

  return results;
};
