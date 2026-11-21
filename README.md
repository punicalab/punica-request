# Punica Request

A promise-based HTTP client for TypeScript, built around a chain of
middlewares. The transport is an adapter: `fetch` in the browser and in Node,
or Node's `http`.

Documentation: [request.punicalab.com](https://request.punicalab.com)

| Package                                                                                  |                                                                   |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`@punica/request`](https://www.npmjs.com/package/@punica/request)                       | `RequestAPI`, the middleware base class, the types                |
| [`@punica/request-fetch`](https://www.npmjs.com/package/@punica/request-fetch)           | `APIFetch`, the adapter for `fetch`                               |
| [`@punica/request-http`](https://www.npmjs.com/package/@punica/request-http)             | `APIHttp`, an adapter for Node's `http`                           |
| [`@punica/request-middleware`](https://www.npmjs.com/package/@punica/request-middleware) | Token, cookie, error, refresh-token, cancel and cache middlewares |

```bash
npm install @punica/request @punica/request-fetch @punica/request-middleware
```

## A request

```ts
import { RequestAPI, type IConfig } from '@punica/request';
import { APIFetch } from '@punica/request-fetch';

const config: IConfig = {
  // Joined with the path as it is: end it with a slash
  hostname: 'https://api.example.com/',
  requestInit: { headers: { Accept: 'application/json' } }
};

const api = new RequestAPI(new APIFetch(), config);

type Item = { id: number; name: string };

const { payload, status } = await api.get<never, Item[]>({
  path: 'items',
  query: { page: '2' },
  // How the body of the response is read: 'json', 'text', 'blob', 'arrayBuffer' or 'formData'
  contentType: 'json'
});

await api.post<string, Item>({
  path: 'items',
  // The body is sent as it is given: serialize it yourself
  data: JSON.stringify({ name: 'Paper' }),
  contentType: 'json',
  init: { headers: { 'Content-Type': 'application/json' } }
});
```

`get`, `delete`, `post`, `put` and `patch` resolve with
`{ payload, status, response }`.

**A response that is not 2xx resolves too**, with its status and no payload.
Add an `ErrorMiddleware` to have such requests reject. A request that cannot
be sent at all (no network, cancelled) rejects.

## Middlewares

A request goes through `requestMiddlewares`, is sent, and its response goes
through `responseMiddlewares`, each in the order of its list.

```ts
import {
  CacheMiddleware,
  CancelRequestMiddleware,
  ErrorMiddleware,
  RefreshTokenMiddleware,
  StorageSession,
  TokenAuthMiddleware
} from '@punica/request-middleware';

const config: IConfig = {
  hostname: 'https://api.example.com/',
  requestMiddlewares: [
    new TokenAuthMiddleware({
      cookieName: 'token',
      headerName: 'Authorization'
    }),
    new CancelRequestMiddleware({ timeout: 10_000 }),
    new CacheMiddleware({ storage: new StorageSession() })
  ],
  responseMiddlewares: [
    // Before the error middleware: it sends a request that got a 401 again
    new RefreshTokenMiddleware({
      tokenProvider: { refreshToken: () => session.refresh() }
    }),
    new ErrorMiddleware({
      contentType: 'json',
      error: {
        401: async () => router.go('/login'),
        500: async ({ body }) => notify(body.message)
      }
    })
  ]
};
```

| Middleware                | List     | What it does                                                                                  |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `TokenAuthMiddleware`     | request  | Puts a token from a cookie into a header (`Bearer ${token}` by default)                       |
| `CookieMiddleware`        | request  | Copies the value of a cookie into a header                                                    |
| `CancelRequestMiddleware` | request  | Cancels a request when the same one is sent again or a timeout is over; `cancelAllRequests()` |
| `CacheMiddleware`         | request  | Answers a `GET` that has `cache: {}` from a storage (`StorageSession`, `StorageIndexedDB`)    |
| `RefreshTokenMiddleware`  | response | On a 401, refreshes the token once and sends the request again, once                          |
| `ErrorMiddleware`         | response | Rejects a response that is not 2xx, after calling the handler of its status                   |

Every middleware takes `getActive` and `getAvailableMethods` to switch it off
or limit it to some methods.

### Your own

```ts
import { BaseMiddleware, type ProcessData } from '@punica/request';

class TraceMiddleware extends BaseMiddleware {
  public process(processData: ProcessData): void {
    processData.params.init.headers = {
      ...processData.params.init.headers,
      'X-Trace': crypto.randomUUID()
    };

    // Pass the request on; without this call it ends here
    this.next(processData);
  }
}
```

A middleware ends a request by calling `processData.resolve(response)` or
`processData.reject(error)` instead of `next`.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).
