# Punica Request: the rules

Punica Request is an HTTP client for TypeScript built around a chain of
middlewares. The transport is an adapter you pass in.

## The packages

- `@punica/request`: `RequestAPI`, `BaseMiddleware`, the types (`IConfig`,
  `RequestParams`, `HttpResponse`, `ProcessData`, `IRequest`, `IPatch`,
  `ContentType`, `Subscriber`), `StatusCode`, and helpers (`getCookie`,
  `setCookie`, `deleteCookie`, `isHttpStatusOk`, `mergeConfig`, `cleanNulls`).
- `@punica/request-fetch`: `APIFetch`, the adapter for `fetch` (browser, Node).
- `@punica/request-http`: `APIHttp`, an adapter for Node's `http` module.
- `@punica/request-middleware`: `TokenAuthMiddleware`, `CookieMiddleware`,
  `CancelRequestMiddleware`, `CacheMiddleware` with `StorageSession` and
  `StorageIndexedDB`, `RefreshTokenMiddleware`, `ErrorMiddleware`.

There is no XHR adapter and no decorator to write: an application creates a
`RequestAPI` and calls its methods. Every package has one entry point; do not
import from `dist/` or from a sub-path. Use `search_api` for the exact list.

## A request

```ts
import { RequestAPI, type IConfig } from "@punica/request";
import { APIFetch } from "@punica/request-fetch";

const config: IConfig = {
  hostname: "https://api.example.com/",
  requestInit: { headers: { Accept: "application/json" } },
  requestMiddlewares: [],
  responseMiddlewares: [],
};

const api = new RequestAPI(new APIFetch(), config);

type Item = { id: number; name: string };

const response = await api.get<never, Item[]>({
  path: "items",
  query: { page: "2" },
  contentType: "json",
});

response.payload; // Item[] | undefined
response.status; // 200
```

- The methods are `get`, `delete`, `post`, `put`, `patch`. Each takes one
  `RequestParams` object and resolves with
  `HttpResponse`: `{ payload?, status, response }`. The type arguments are
  `<Sent, Received>`.
- **The address is `hostname + path`, joined as they are.** End `hostname`
  with a slash and write paths without a leading one, or the other way round.
  `query` is appended as a query string; leave out values that are `null`
  or `undefined`, they are sent as the texts "null" and "undefined".
- **`contentType` is how the body of the response is read**, not a MIME
  type: `"json"`, `"text"`, `"blob"`, `"arrayBuffer"` or `"formData"`. It is a
  type, not an enum: write the string. Without it the response has no payload.
- **The body is sent as it is given.** For JSON write
  `data: JSON.stringify(value)` and set the header:
  `init: { headers: { "Content-Type": "application/json" } }`. A `GET` takes
  no body.
- `init` is the `RequestInit` of this request; it is merged over
  `config.requestInit`. Write headers as a plain object, not as a `Headers`
  instance.

## What a request resolves and rejects with

- **A response that is not 2xx resolves**, with its `status` and no
  `payload`. Check `response.status` (or `isHttpStatusOk(status)`), or add an
  `ErrorMiddleware` to have such requests reject.
- A request rejects when it cannot be sent (no network, cancelled), when a
  middleware calls `processData.reject`, and with `ErrorMiddleware` for a
  status that is not 2xx. `ErrorMiddleware` rejects with the `ProcessData` of
  the request (its `httpResponse.status`, and the error body as `body`), not
  with an `Error`.

## Middlewares

A request goes through `requestMiddlewares` in their order, is sent, and its
response goes through `responseMiddlewares` in theirs. A middleware works
only in the list it is made for:

| Middleware | List | Options | What it does |
|---|---|---|---|
| `TokenAuthMiddleware` | request | `cookieName`, `headerName`, `tokenFormat?` (`"Bearer ${token}"`) | Puts the token of a cookie into a header |
| `CookieMiddleware` | request | `cookieName`, `headerName` | Copies a cookie into a header |
| `CancelRequestMiddleware` | request | `timeout?` (ms), `getKey?` | Cancels a request when one with the same method and path is sent again or the timeout is over; `cancelAllRequests()` |
| `CacheMiddleware` | request | `storage` | Answers a `GET` whose params have `cache` from the storage, and stores its response |
| `RefreshTokenMiddleware` | response | `tokenProvider: { refreshToken(): Promise<boolean> }`, `exclude?` | On a 401, refreshes the token once and sends the request again, once |
| `ErrorMiddleware` | response | `contentType`, `error: { [status]: async (processData) => … }` | Calls the handler of the status, then rejects |

```ts
import {
  CacheMiddleware,
  CancelRequestMiddleware,
  ErrorMiddleware,
  RefreshTokenMiddleware,
  StorageSession,
  TokenAuthMiddleware,
} from "@punica/request-middleware";

const config: IConfig = {
  hostname: "https://api.example.com/",
  requestMiddlewares: [
    new TokenAuthMiddleware({ cookieName: "token", headerName: "Authorization" }),
    new CancelRequestMiddleware({ timeout: 10_000 }),
    new CacheMiddleware({ storage: new StorageSession() }),
  ],
  responseMiddlewares: [
    new RefreshTokenMiddleware({
      tokenProvider: { refreshToken: () => session.refresh() },
    }),
    new ErrorMiddleware({
      contentType: "json",
      error: {
        401: async () => router.go("/login"),
        500: async ({ body }) => notify(body.message),
      },
    }),
  ],
};
```

- `RefreshTokenMiddleware` comes **before** `ErrorMiddleware`; after it, the
  401 is rejected before it can be refreshed. When `refreshToken()` resolves
  `false` the request is not sent again and its 401 goes on to the next
  middleware.
- `CancelRequestMiddleware` treats requests with the same method and path as
  one: a new search cancels the one before it, whatever its query, and two
  `POST`s to one path cancel each other too. To let requests that differ in
  their query run side by side:
  `getKey: ({ params }) => params.requestURL`; to keep it away from writes:
  `getAvailableMethods: () => ["GET"]`. A signal given in `init.signal` still
  cancels the request.
- A `tokenProvider` that refreshes through the same `RequestAPI` must name its
  own request: `exclude: ({ params }) => params.path === "auth/refresh"`.
  Otherwise a 401 for the refresh waits for itself.
- A status without a handler in `ErrorMiddleware` is rejected too; a message
  in the console asks for the handler.
- Caching is asked for per request: `api.get({ path, contentType: "json", cache: {} })`,
  or `cache: { expireTime: 60_000 }` (milliseconds). Only `GET` is cached.
  `StorageSession` keeps `json` and `text` until the tab closes;
  `StorageIndexedDB` keeps them across visits. A storage of your own
  implements `IStorage` (`read(url)`, `write(url, contentType, body, expireTime?)`).
- Every middleware also takes `getActive: () => boolean` and
  `getAvailableMethods: () => ["GET", …]` to switch it off or limit it.
- The cookie middlewares read `document.cookie`; outside a browser they find
  no cookie.

## Your own middleware

```ts
import { BaseMiddleware, type ProcessData } from "@punica/request";

class TraceMiddleware extends BaseMiddleware {
  public process(processData: ProcessData): void {
    processData.params.init.headers = {
      ...processData.params.init.headers,
      "X-Trace": crypto.randomUUID(),
    };

    this.next(processData);
  }
}
```

- `process` must end in exactly one of `this.next(processData)`,
  `processData.resolve(httpResponse)` or `processData.reject(error)`. A
  middleware that does none of them leaves the request unsettled.
- `processData` holds `config`, `params` (with `requestURL` and `init`),
  `method`, `notifier`, and in a response middleware `httpResponse`. It is a
  type: never `new ProcessData()`.
- The instance is shared by every request of the API: keep nothing about one
  request on `this`. Keep it on `processData`, or in a `WeakMap` keyed by it.
- `this.restart(processData)` sends the request again from the first
  middleware (since 2.7).
- To act when the response has arrived, from a request middleware:
  `processData.notifier.addSubscriber({ key, update: async (processData) => … })`.

## Your own adapter

Implement `IRequest`: a `config` setter and `get`, `delete`, `post`, `put`,
`patch`, each `(params: RequestParams<T>) => Promise<HttpResponse<R>>`. Send
to `params.requestURL` with `params.init`, read the body as
`params.contentType` says, and resolve for every status.

`APIHttp` of `@punica/request-http` is limited: plain `http` to the default
port, `hostname` without a scheme, JSON responses, and it does not send the
query. For Node prefer `APIFetch`, which uses the `fetch` of Node.

Documentation: https://request.punicalab.com
