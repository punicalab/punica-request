# Punica Request

A promise-based HTTP client for TypeScript, built around a chain of
middlewares. The transport is an adapter: `fetch` in the browser and in Node,
or Node's `http`.

Documentation: [request.punicalab.com](https://request.punicalab.com)

| Package                                                                                  |                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`@punica/request`](https://www.npmjs.com/package/@punica/request)                       | `createClient`, the errors, the types                               |
| [`@punica/request-fetch`](https://www.npmjs.com/package/@punica/request-fetch)           | `fetchAdapter`: browsers, Node 18+, workers                         |
| [`@punica/request-http`](https://www.npmjs.com/package/@punica/request-http)             | `httpAdapter`: Node's `http` / `https`, for agents and certificates |
| [`@punica/request-middleware`](https://www.npmjs.com/package/@punica/request-middleware) | Token, cookie, error, refresh-token, cancel and cache middlewares   |
| [`@punica/request-mcp`](https://www.npmjs.com/package/@punica/request-mcp)               | An MCP server that gives an AI assistant the real API               |

```bash
npm install @punica/request @punica/request-fetch @punica/request-middleware
```

This is version 3. Coming from 2.x? See the
[migration guide](https://request.punicalab.com/docs/migration).

## A request

```ts
import { createClient, isHttpError } from '@punica/request';
import { fetchAdapter } from '@punica/request-fetch';

const api = createClient({
  baseURL: 'https://api.example.com/v1',
  adapter: fetchAdapter(),
  headers: { Accept: 'application/json' },
  timeout: 10_000
});

type Item = { id: number; name: string };

const { data, status, headers } = await api.get<Item[]>('items', {
  // null and undefined are left out, an array repeats its name
  query: { page: 2, tags: ['a', 'b'] }
});

try {
  await api.post<Item>('items', { json: { name: 'Paper' } });
} catch (error) {
  if (isHttpError<{ message: string }>(error)) {
    console.log(error.status, error.response.data.message);
  }
}
```

`get`, `post`, `put`, `patch`, `delete` and `head` resolve with
`{ ok, status, headers, data, raw }`. The body is read by the `Content-Type`
of the response; `responseType` decides when it has to.

**A response outside 2xx rejects** with an `HttpError` that carries the
response. A request that brought no response rejects with a `RequestError`
whose `reason` is `network`, `timeout`, `abort` or `parse`.
`throwHttpErrors: false` gives the response back whatever its status.

## Middlewares

One list. A request passes it from the first to the last, is sent, and its
response passes it back from the last to the first.

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

const api = createClient({
  baseURL: 'https://api.example.com/v1',
  adapter: fetchAdapter(),
  middlewares: [
    onError({
      401: () => router.go('/login'),
      500: (response) => notify(response.data.message)
    }),
    // Before tokenAuth: the request it sends again takes the new token
    refreshToken({ refresh: () => session.refresh() }),
    tokenAuth({ cookieName: 'token' }),
    cache({ storage: new StorageSession() }),
    when((context) => context.method === 'GET', cancel())
  ]
});

await api.get('countries', { cache: { ttl: 60_000 } });
```

| Middleware     | What it does                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tokenAuth`    | Sends a token, from a cookie or from `getToken` (`Bearer ${token}` in `Authorization` by default)                 |
| `cookie`       | Sends the value of a cookie in a header                                                                           |
| `cancel`       | Cancels a request when the same one is sent again; `getKey` says what the same is; `cancelAll()`                  |
| `cache`        | Answers a `GET` made with `cache: true` or `cache: { ttl }` from a storage (`StorageSession`, `StorageIndexedDB`) |
| `refreshToken` | On a 401, refreshes the token once for all requests that failed and sends each again, once                        |
| `onError`      | Calls the handler of the status of a response outside 2xx; the request still rejects                              |
| `when`         | From the core: limits a middleware to some requests                                                               |

### Your own

```ts
import type { Middleware } from '@punica/request';

const trace: Middleware = async (context, next) => {
  context.headers.set('X-Trace', crypto.randomUUID());

  const response = await next();

  console.log(context.method, context.url.pathname, response.status);

  return response;
};
```

A middleware ends a request by returning a response or by throwing. What it
does before `await next()` happens on the way out, what it does after on the
way back; calling `next()` again sends the request again.

## AI assistants

A model that has not seen the library guesses its API. `@punica/request-mcp`
gives an assistant the API of the version you have installed and a checker
for the code it writes:

```bash
claude mcp add punica-request -- npx -y @punica/request-mcp
```

See [its README](./packages/mcp/README.md) for other clients and the tools.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).
