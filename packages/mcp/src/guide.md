# Punica Request 3 — the rules

An HTTP client built around one chain of middlewares. This guide is for
version 3. A project that still has 2.x installed has another API: read
`get_migration_guide` before changing it.

## Packages

| Package                      | What it exports                                                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@punica/request`            | `createClient`, `when`, `HttpError`, `RequestError`, `isHttpError`, `isRequestError`, `StatusCode`, `getCookie` / `setCookie` / `deleteCookie`, and the types (`Client`, `ClientConfig`, `RequestOptions`, `RequestContext`, `HttpResponse`, `Middleware`, `Next`, `Adapter`, `IPatch`, …) |
| `@punica/request-fetch`      | `fetchAdapter` — browsers, Node 18+, workers                                                                                                                                                                                                                                               |
| `@punica/request-http`       | `httpAdapter` — Node `http`/`https`: agents, certificates                                                                                                                                                                                                                                  |
| `@punica/request-middleware` | `tokenAuth`, `cookie`, `cancel`, `cache` (+ `StorageSession`, `StorageIndexedDB`, `IStorage`, `CacheEntry`), `refreshToken`, `onError`                                                                                                                                                     |

Each package has one entry point. The core has no adapter of its own: a
client always needs one. Install the core next to the others, they have it
as a peer dependency.

## A client

```ts
import { createClient } from '@punica/request';
import { fetchAdapter } from '@punica/request-fetch';

export const api = createClient({
  baseURL: 'https://api.example.com/v1',
  adapter: fetchAdapter(),
  headers: { Accept: 'application/json' },
  timeout: 10_000
});
```

`ClientConfig`: `adapter` (required), `baseURL`, `headers`, `timeout` (ms,
the whole request), `throwHttpErrors` (default `true`), `init` (passed to
the adapter: `credentials`, `mode`, `redirect`, …), `middlewares`.

- `baseURL` and the path are joined whatever slashes they have:
  `'https://x/v1'` + `'items'` or `'/items'` → `https://x/v1/items`.
- With a `baseURL`, a path that leads away from it is refused: another
  origin (`'https://other.example/…'`) or out of its path (`'../admin'`).
  Use a second client for another server. A colon is fine:
  `'items:batch'` is a path.
- A relative `baseURL` (`'/api'`) works in a page only; on a server give
  the whole address.
- Do not give the client a `Content-Type` header: it would go with every
  request, those without a body included. `json` sets it where it is
  needed; `Accept` says what the client reads.

## Requests

```ts
import { api } from './api';

interface Item {
  id: number;
  name: string;
}

const list = await api.get<Item[]>('items', {
  query: { page: 2, tags: ['a', 'b'], search: undefined }
});
const created = await api.post<Item>('items', { json: { name: 'Paper' } });

await api.put<Item>(`items/${created.data.id}`, { json: { name: 'Pen' } });
await api.patch<Item>('items/1', {
  json: [{ op: 'replace', path: '/name', value: 'Ink' }]
});
await api.delete('items/1');

const form = new FormData();

await api.post('upload', { body: form });

console.log(list.status, list.headers.get('x-total'), list.data);
```

- The methods: `get`, `post`, `put`, `patch`, `delete`, `head` and
  `request(method, path, options)`. The path is the first argument, a
  string. One type argument: the type of `data`.
- `RequestOptions`: `query`, `json`, `body`, `headers`, `responseType`,
  `signal`, `timeout`, `throwHttpErrors`, `init`, and `cache` when the
  cache middleware is imported.
- `query`: `null` and `undefined` are left out, an array repeats its name
  (`tags=a&tags=b`), a `Date` is written as ISO text. `URLSearchParams`
  works too.
- `json` is serialised and gets `Content-Type: application/json`. `body`
  is sent as it is (`FormData`, `Blob`, `URLSearchParams`, text, a buffer).
  Never both. Never `JSON.stringify` yourself. Do not set a `Content-Type`
  for `FormData`. `GET` and `HEAD` have no body.
- Headers of a request are added to those of the client; `undefined`
  removes one for that request.
- A response is `{ ok, status, headers, data, raw }`. `headers` is a
  `Headers` object. `data` is read by the `Content-Type` of the response:
  JSON is parsed; text (`text/*`, XML, or no `Content-Type` at all) is a
  string; anything else is a `Blob`; no body, or an empty one, is
  `undefined`. `responseType: 'json' | 'text' | 'blob' | 'arrayBuffer' |
'formData' | 'stream'` decides instead when given. With `'stream'`, `data`
  is a `ReadableStream` you read yourself; `raw.body` is then taken.

## Errors

A response outside 2xx **rejects** with an `HttpError`. A request that
brought no usable response rejects with a `RequestError` whose `reason` is
`'network'`, `'timeout'`, `'abort'` or `'parse'`.

```ts
import { isHttpError, isRequestError } from '@punica/request';
import { api } from './api';

try {
  await api.post('items', { json: { name: '' } });
} catch (error) {
  if (isHttpError<{ message: string }>(error)) {
    console.log(error.status, error.response.data.message);
  } else if (isRequestError(error)) {
    console.log(error.reason); // 'network' | 'timeout' | 'abort' | 'parse'
  } else {
    throw error;
  }
}

// Or get the response back whatever its status
const response = await api.get('items/9', { throwHttpErrors: false });

if (!response.ok) console.log(response.status);
```

Use `isHttpError` / `isRequestError`, not `instanceof`: they also recognise
errors of a second copy of the package. The body of an error response is
read by its `Content-Type`, whatever `responseType` asked for.

## Cancelling and timeouts

`signal` cancels one request; `timeout` (client or request, `0` for none)
limits the whole request, middlewares and retries included. Both reject
with a `RequestError` (`'abort'`, `'timeout'`). For `responseType:
'stream'` the timeout ends when the response is there; the `signal` still
cancels the stream while you read it.

```ts
import { api } from './api';

const controller = new AbortController();
const pending = api.get('report', {
  signal: controller.signal,
  timeout: 30_000
});

controller.abort();
await pending.catch(() => undefined);
```

## Middlewares

One list, `middlewares`, from the outermost to the one next to the
adapter. A request passes them in that order, its response passes them in
reverse.

```ts
import { createClient, when } from '@punica/request';
import { fetchAdapter } from '@punica/request-fetch';
import {
  cache,
  cancel,
  onError,
  refreshToken,
  tokenAuth,
  StorageSession
} from '@punica/request-middleware';

const latest = cancel();

export const api = createClient({
  baseURL: 'https://api.example.com/v1',
  adapter: fetchAdapter(),
  middlewares: [
    onError({
      401: () => location.assign('/login'),
      default: (response) => console.error('Request failed', response.status)
    }),
    refreshToken({
      refresh: () => refreshSession(),
      exclude: (context) => context.url.pathname.endsWith('/auth/refresh')
    }),
    tokenAuth({ cookieName: 'token' }),
    cache({ storage: new StorageSession() }),
    when((context) => context.method === 'GET', latest)
  ]
});

declare function refreshSession(): Promise<boolean>;

await api.get('countries', { cache: { ttl: 60_000 } });
latest.cancelAll();
```

The order matters. Two rules:

1. `onError` goes **before** `refreshToken`: it then sees the response the
   caller gets, after the refresh.
2. `refreshToken` goes **before** `tokenAuth` / `cookie`: the request it
   sends again passes them and takes the new token.

`cache` and `cancel` go after those.

| Middleware                                                                             | What it does                                                                                                                                              |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokenAuth({ cookieName, headerName?, tokenFormat? })` or `tokenAuth({ getToken, … })` | Sends a token: from a cookie, or from `getToken(context)` (may be async). One options object. Default header `Authorization`, format `'Bearer ${token}'`. |
| `cookie({ cookieName, headerName })`                                                   | Sends the value of a cookie in a header (CSRF).                                                                                                           |
| `cancel({ getKey? })`                                                                  | The same request sent again cancels the earlier one (same method and address without query). Returns the middleware with `cancelAll()`.                   |
| `cache({ storage, getKey? })`                                                          | Answers `GET` requests made with `cache: true` or `cache: { ttl }` (ms) from the storage. Keeps 2xx responses only.                                       |
| `refreshToken({ refresh, exclude? })`                                                  | On a 401: calls `refresh` once for all requests that failed meanwhile, sends each again once. `refresh` returning `false` leaves the 401 as the answer.   |
| `onError({ [status]: handler, default? })`                                             | Calls `handler(response, context)` for responses outside 2xx; the request still rejects with its `HttpError`. Silent for `throwHttpErrors: false`.        |
| `when(predicate, middleware)` (core)                                                   | Limits a middleware to some requests.                                                                                                                     |

`StorageSession` keeps JSON and text until the tab is closed;
`StorageIndexedDB` keeps binary bodies too, across visits. A storage of
your own implements `IStorage`: `get(key)`, `set(key, entry)`, optionally
`delete(key)`.

## A middleware of your own

A function of `(context, next)` that returns a response. Before
`await next()` is the way out, after it the way back.

```ts
import type { Middleware } from '@punica/request';

export const timing: Middleware = async (context, next) => {
  const started = Date.now();

  context.headers.set('X-Request-Started', String(started));

  const response = await next();

  console.log(
    context.method,
    context.url.pathname,
    response.status,
    Date.now() - started
  );

  return response;
};
```

- Always **return** a response: `return next()`, what `await next()` gave,
  or one of your own (`{ ok, status, headers: new Headers(), data }`). A
  middleware that returns nothing rejects the request.
- Reject by throwing.
- A response outside 2xx arrives as a **response**, not as an error: check
  `response.status` or `response.ok`; no `try` is needed for that. The
  `HttpError` is thrown after every middleware has returned. What is
  thrown through `next()` is a `RequestError` (no response at all), or an
  error of the code: what a middleware further in threw, a `TypeError` for
  a request that cannot be sent.
- `next()` may be called again to send the request again. Change headers
  with `context.headers.set`, never `append`, so a retry does not double
  them.
- `context`: `method`, `url` (a `URL`), `headers` (`Headers`), `body`,
  `responseType`, `init`, `options` (the options of the request), `signal`,
  `abort()`, `throwHttpErrors`, and `requestHeaders` (since 3.1): the headers
  the request itself gave, without those of the client. To set a header
  unless the request names its own:
  `if (!context.requestHeaders.has('Accept-Language')) context.headers.set(…)`.
- State of one request is a local variable. State shared by all requests
  lives in the closure of a factory: `const mine = (options) => { let
shared; return async (context, next) => { … }; }`.
- Options of your own on a request: augment `RequestOptions`
  (`declare module '@punica/request' { interface RequestOptions { retry?: number } }`)
  and read `context.options.retry`.

## An adapter of your own

```ts
import type { Adapter } from '@punica/request';

export const mockAdapter: Adapter = async (context) =>
  new Response(JSON.stringify({ path: context.url.pathname }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
```

An adapter gets the `context` and returns a Fetch `Response` for any
status, its body unread. It rejects only when no response came. Reading
the body, statuses and timeouts are the client's work.

## Code written for fetch

`toFetch(client)` is `fetch`'s shape sent through a client, for code that
takes a `fetch` or reads a `Response` (a stream of events, a library, a
webhook call): the client's middlewares run, and the caller sees what
`fetch` would give.

```ts
import { createClient, toFetch } from '@punica/request';
import { fetchAdapter } from '@punica/request-fetch';

const fetch = toFetch(createClient({ adapter: fetchAdapter(), timeout: 0 }));

const res = await fetch('https://hooks.example.com/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 7 }),
  signal: AbortSignal.timeout(10_000)
});

if (!res.ok) console.log(res.status, await res.text());
```

Every status resolves with a `Response`, its body unread (an error's body
the client read comes back in it). An abort rejects with the signal's
reason, a timeout with a `TimeoutError`, no answer with the adapter's own
error. The client's `timeout` still applies: `timeout: 0` leaves the limit
to the caller's signal, as with `fetch`.

## With a query layer

The client sends; it keeps nothing of what came back. For loading and
failed states, a cache the screens share and refetching, use it as the
`queryFn` of TanStack Query (or SWR). The two fit without glue:

```ts
import { isHttpError, isRequestError } from '@punica/request';
import { QueryClient, queryOptions } from '@tanstack/react-query';
import { api } from './api';

interface Item {
  id: number;
  name: string;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A response is an answer, whatever its status; only a request that
      // brought none is worth another try
      retry: (failures, error) =>
        !isHttpError(error) &&
        isRequestError(error) &&
        error.reason !== 'abort' &&
        failures < 2
    }
  }
});

export const items = (page: number) =>
  queryOptions({
    queryKey: ['items', page],
    // The signal of the query cancels the request
    queryFn: async ({ signal }) =>
      (await api.get<Item[]>('items', { query: { page }, signal })).data
  });
```

Return `response.data` from a `queryFn`, pass its `signal` on, and leave the
`cache` and `cancel` middlewares out of such a client: the query layer does
both. `onError`, `refreshToken` and `tokenAuth` stay.

## With the other Punica libraries

Punica Request is one of three libraries made to be used together: Punica
Form (`@punica/form`, forms and their rules) and Punica Components
(`@punica/components`, the elements). Each has an MCP server; when the
project has them, look their APIs up there instead of guessing. Where they
meet:

- **A form is submitted**: send the request inside the submit handler of the
  form, with a request option of the application (`silent: true`, declared
  by augmenting `RequestOptions`) that keeps `onError` from showing a message
  the form shows itself.
- **The server refuses it**: `isHttpError(error)` and `error.response.data`
  give the messages by field; the `SetErrors` service of Punica Form puts
  them on the fields.
- **A field asks the server while the user types**: the validation of the
  field gets a signal; pass it as `signal` of the request.

A whole application on the three, with its tests:
https://github.com/punicalab/punica-starter (start with its `AGENTS.md`).

## Node

`fetchAdapter()` works in Node 18 and later. `httpAdapter({ httpAgent,
httpsAgent, requestOptions })` is for agents, proxies and certificates; it
does not follow redirects and does not decompress. `tokenAuth({
cookieName })` and `cookie` read `document.cookie`: on a server use
`tokenAuth({ getToken })`.

## Checklist

- [ ] `createClient({ adapter: fetchAdapter(), … })`; names imported from the right package.
- [ ] The path is the first argument; `json` for JSON bodies; no `JSON.stringify`.
- [ ] Reads `response.data`; handles failures with `isHttpError` / `isRequestError`.
- [ ] One `middlewares` list: `onError`, `refreshToken`, `tokenAuth`/`cookie`, `cache`, `cancel`.
- [ ] Own middlewares return `next()` or a response.
- [ ] `validate_code` reports nothing.
