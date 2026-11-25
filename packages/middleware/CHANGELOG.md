# @punica/request-middleware

## 3.2.2

### Patch Changes

- Updated dependencies [[`dd731a1`](https://github.com/punicalab/punica-request/commit/dd731a1d85d6632c51eb5823ba3a2b7b4c76107a)]:
  - @punica/request@3.2.2

## 3.2.1

### Patch Changes

- Updated dependencies [[`272abab`](https://github.com/punicalab/punica-request/commit/272ababacf4a45502f63edaa4808921dd7548e69)]:
  - @punica/request@3.2.1

## 3.2.0

### Patch Changes

- Updated dependencies [[`cf12139`](https://github.com/punicalab/punica-request/commit/cf121393b9b8b16a7c10c47e12ed81fd408dcfa7)]:
  - @punica/request@3.2.0

## 3.1.0

### Minor Changes

- [#95](https://github.com/punicalab/punica-request/pull/95) [`b32bab2`](https://github.com/punicalab/punica-request/commit/b32bab23bb94c5f8a9c68a2bfc2f4bb23700aab2) Thanks [@punicalab](https://github.com/punicalab)! - `context.requestHeaders`: the headers a request itself gave, without those of the client. A middleware that sets a header unless the request names its own no longer has to read `context.options.headers` in its three shapes:
  
  ```ts
  if (!context.requestHeaders.has('Accept-Language')) {
    context.headers.set('Accept-Language', language());
  }
  ```
  
  The `license` field of the packages says `MIT`, as the `LICENSE` file of the repository always did; it said `ISC`.
  
  The guide of the MCP server says how to use the client with a query layer (TanStack Query): the signal of a query cancels its request, and the errors of the client say what is worth another try.

### Patch Changes

- Updated dependencies [[`b32bab2`](https://github.com/punicalab/punica-request/commit/b32bab23bb94c5f8a9c68a2bfc2f4bb23700aab2)]:
  - @punica/request@3.1.0

## 3.0.0

### Major Changes

- [#84](https://github.com/punicalab/punica-request/pull/84) [`accd5ea`](https://github.com/punicalab/punica-request/commit/accd5ea2d6be55ddde5e241fe8caf055d406869e) Thanks [@punicalab](https://github.com/punicalab)! - Punica Request 3.0: a new API. Code written for 2.x has to be changed; the migration guide in the documentation lists every step, and `@punica/request-mcp` recognises 2.x code and names its replacement.
  
  - `createClient({ baseURL, adapter, headers, timeout, middlewares })` replaces `new RequestAPI(adapter, config)`. A request is `api.get<T>(path, { query, json, body, headers, responseType, signal, timeout })`.
  - A middleware is one function, `(context, next) => Promise<HttpResponse>`, in one list. What it does before `await next()` happens on the way out, what it does after on the way back. It ends a request by returning a response or throwing; there is nothing to forget to call. `BaseMiddleware`, `ProcessData`, `Notifier`, the `@Middleware` decorator and the two lists are gone.
  - A response outside 2xx rejects with an `HttpError` that carries the response (`error.response.data`, `error.status`). `throwHttpErrors: false`, for the client or for one request, brings the 2.x behaviour back. A request that cannot be sent, times out, is cancelled or brings JSON that cannot be read rejects with a `RequestError` whose `reason` says which. `isHttpError` and `isRequestError` tell them apart.
  - A response is `{ ok, status, headers, data, raw }`. Its body is read by its `Content-Type` unless `responseType` says otherwise.
  - `json` serialises a body and sets its `Content-Type`; `query` leaves out `null` and `undefined` and repeats arrays; `baseURL` and the path are joined whatever their slashes, and a path that leads to another origin is refused.
  - `timeout` and `signal` belong to the client: every request has a signal, a timeout covers the whole request with its middlewares, and nothing is left behind when it ends.
  - The middlewares are functions: `tokenAuth`, `cookie`, `cache`, `cancel`, `refreshToken`, `onError`; `when(predicate, middleware)` limits one to some requests. `IStorage` is `get` / `set`.
  - The adapters are functions: `fetchAdapter()` and `httpAdapter()`. `@punica/request-http` follows `https`, ports and queries, and shares the version of the other packages from now on.
  - The adapters and the middlewares have `@punica/request` as a peer dependency, so an application has one copy of it. Node 18 or later.
  - Published as ES modules and as CommonJS, with an `exports` map and `sideEffects: false`.

### Patch Changes

- Updated dependencies [[`accd5ea`](https://github.com/punicalab/punica-request/commit/accd5ea2d6be55ddde5e241fe8caf055d406869e)]:
  - @punica/request@3.0.0

## 3.0.0-next.0

### Major Changes

- [#84](https://github.com/punicalab/punica-request/pull/84) [`accd5ea`](https://github.com/punicalab/punica-request/commit/accd5ea2d6be55ddde5e241fe8caf055d406869e) Thanks [@punicalab](https://github.com/punicalab)! - Punica Request 3.0: a new API. Code written for 2.x has to be changed; the migration guide in the documentation lists every step, and `@punica/request-mcp` recognises 2.x code and names its replacement.
  
  - `createClient({ baseURL, adapter, headers, timeout, middlewares })` replaces `new RequestAPI(adapter, config)`. A request is `api.get<T>(path, { query, json, body, headers, responseType, signal, timeout })`.
  - A middleware is one function, `(context, next) => Promise<HttpResponse>`, in one list. What it does before `await next()` happens on the way out, what it does after on the way back. It ends a request by returning a response or throwing; there is nothing to forget to call. `BaseMiddleware`, `ProcessData`, `Notifier`, the `@Middleware` decorator and the two lists are gone.
  - A response outside 2xx rejects with an `HttpError` that carries the response (`error.response.data`, `error.status`). `throwHttpErrors: false`, for the client or for one request, brings the 2.x behaviour back. A request that cannot be sent, times out, is cancelled or brings JSON that cannot be read rejects with a `RequestError` whose `reason` says which. `isHttpError` and `isRequestError` tell them apart.
  - A response is `{ ok, status, headers, data, raw }`. Its body is read by its `Content-Type` unless `responseType` says otherwise.
  - `json` serialises a body and sets its `Content-Type`; `query` leaves out `null` and `undefined` and repeats arrays; `baseURL` and the path are joined whatever their slashes, and a path that leads to another origin is refused.
  - `timeout` and `signal` belong to the client: every request has a signal, a timeout covers the whole request with its middlewares, and nothing is left behind when it ends.
  - The middlewares are functions: `tokenAuth`, `cookie`, `cache`, `cancel`, `refreshToken`, `onError`; `when(predicate, middleware)` limits one to some requests. `IStorage` is `get` / `set`.
  - The adapters are functions: `fetchAdapter()` and `httpAdapter()`. `@punica/request-http` follows `https`, ports and queries, and shares the version of the other packages from now on.
  - The adapters and the middlewares have `@punica/request` as a peer dependency, so an application has one copy of it. Node 18 or later.
  - Published as ES modules and as CommonJS, with an `exports` map and `sideEffects: false`.

### Patch Changes

- Updated dependencies [[`accd5ea`](https://github.com/punicalab/punica-request/commit/accd5ea2d6be55ddde5e241fe8caf055d406869e)]:
  - @punica/request@3.0.0-next.0
