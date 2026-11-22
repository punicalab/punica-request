# Punica Request: from 2.x to 3.0

3.0 is a new API; 2.x code does not compile against it. Change a project
in this order: the client, the requests, the handling of failures, the
middlewares. `validate_code` names what is left.

## Packages

```sh
npm i @punica/request@3 @punica/request-fetch@3 @punica/request-middleware@3
```

`@punica/request-http` is 3.x as well. The adapters and the middlewares
have `@punica/request` as a peer dependency: install it yourself. Node 18
or later. `experimentalDecorators` is no longer needed.

## The client

```ts
// 2.x
const api = new RequestAPI(new APIFetch(), {
  hostname: 'https://api.example.com/v1/',
  requestInit: {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  },
  requestMiddlewares: [
    new TokenAuthMiddleware({
      cookieName: 'token',
      headerName: 'Authorization'
    })
  ],
  responseMiddlewares: [
    new RefreshTokenMiddleware({ tokenProvider }),
    new ErrorMiddleware({ contentType: 'json', error: { 401: toLogin } })
  ]
});

// 3.0
const api = createClient({
  baseURL: 'https://api.example.com/v1',
  adapter: fetchAdapter(),
  headers: { Accept: 'application/json' },
  init: { credentials: 'include' },
  middlewares: [
    onError({ 401: toLogin }),
    refreshToken({ refresh: () => tokenProvider.refreshToken() }),
    tokenAuth({ cookieName: 'token' })
  ]
});
```

## Every change

| 2.x                                                                                                | 3.0                                                                                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `new RequestAPI(new APIFetch(), config)`                                                           | `createClient({ adapter: fetchAdapter(), …config })`                                             |
| `new APIHttp()`                                                                                    | `httpAdapter()`                                                                                  |
| `hostname`                                                                                         | `baseURL` (slashes do not matter any more)                                                       |
| `requestInit.headers`                                                                              | `headers`                                                                                        |
| `requestInit` (other fields)                                                                       | `init`                                                                                           |
| `requestMiddlewares` + `responseMiddlewares`                                                       | one `middlewares` list, outermost first                                                          |
| `api.get({ path: 'items', … })`                                                                    | `api.get('items', { … })`                                                                        |
| `api.get<Sent, Received>(…)`                                                                       | `api.get<Received>(…)`                                                                           |
| `data: JSON.stringify(x)` + a `Content-Type` header                                                | `json: x`                                                                                        |
| `data: formData`                                                                                   | `body: formData`                                                                                 |
| `init: { headers }` on a request                                                                   | `headers` on the request                                                                         |
| `init: { signal }` on a request                                                                    | `signal` on the request                                                                          |
| `contentType: 'json'`                                                                              | nothing: read by the `Content-Type` of the response; `responseType` to decide                    |
| `response.payload`                                                                                 | `response.data`                                                                                  |
| `response.response`                                                                                | `response.raw`                                                                                   |
| a response outside 2xx resolves; `isHttpStatusOk(response.status)`                                 | it rejects with `HttpError`; `isHttpError(error)`, or `throwHttpErrors: false` and `response.ok` |
| `ErrorMiddleware` rejects with the `ProcessData`                                                   | the request rejects with `HttpError` (`.status`, `.response.data`, `.context`)                   |
| a request that could not be sent                                                                   | rejects with `RequestError` (`.reason`)                                                          |
| `query: { a: null }` sent as `a=null`                                                              | left out                                                                                         |
| `query: { a: undefined }` sent as `a=undefined`                                                    | left out                                                                                         |
| `query: { tags: ['a', 'b'] }` sent as `tags=a,b`                                                   | sent as `tags=a&tags=b`: join the array yourself if the server wants one value                   |
| a `Date` in `query` sent as its `String()`                                                         | sent as ISO text                                                                                 |
| `new TokenAuthMiddleware({ cookieName, headerName, tokenFormat })`                                 | `tokenAuth({ cookieName, headerName?, tokenFormat? })`; or `getToken`                            |
| `new CookieMiddleware({ cookieName, headerName })`                                                 | `cookie({ cookieName, headerName })`                                                             |
| `new CancelRequestMiddleware({ timeout, getKey })`                                                 | `cancel({ getKey })`; `timeout` is an option of the client or the request                        |
| `cancelRequest.cancelAllRequests()`                                                                | `const latest = cancel()` in the list, then `latest.cancelAll()`                                 |
| `new CacheMiddleware({ storage })`                                                                 | `cache({ storage })`                                                                             |
| `cache: { expireTime }`                                                                            | `cache: { ttl }`; `cache: true` for no expiry                                                    |
| `IStorage.read(url)` / `write(url, contentType, body, expireTime)`                                 | `IStorage.get(key)` / `set(key, entry)`; the middleware looks after expiry                       |
| `new RefreshTokenMiddleware({ tokenProvider, exclude })`                                           | `refreshToken({ refresh, exclude })`; `exclude` gets the `context`                               |
| `new ErrorMiddleware({ contentType, error: { 401: fn } })`                                         | `onError({ 401: fn })`; a handler gets `(response, context)`                                     |
| `getActive`, `getAvailableMethods`, `availableMethods()`                                           | `when(predicate, middleware)`                                                                    |
| `class X extends BaseMiddleware { process = (processData) => … }`                                  | `const x: Middleware = async (context, next) => …`                                               |
| `this.next(processData)`                                                                           | `return next()`                                                                                  |
| `processData.resolve(response)`                                                                    | `return response`                                                                                |
| `processData.reject(error)`                                                                        | `throw error`                                                                                    |
| `processData.httpResponse`, `notifier.addSubscriber(…)`                                            | `const response = await next()` and the code after it                                            |
| `this.restart(processData)`                                                                        | `return next()` once more                                                                        |
| `processData.params.init.headers = { … }`                                                          | `context.headers.set(name, value)`                                                               |
| `processData.params.requestURL`                                                                    | `context.url.href`                                                                               |
| `processData.method`, `processData.config`                                                         | `context.method`; configuration is in the closure of your factory                                |
| `IRequest` (a class with five methods)                                                             | `Adapter`: `(context) => Promise<Response>`                                                      |
| `IConfig`, `RequestParams`, `ProcessData`, `ContentType`                                           | `ClientConfig`, `RequestOptions`, `RequestContext`, `ResponseType`                               |
| `RequestMethods`                                                                                   | `HttpMethod`                                                                                     |
| `mergeConfig`, `cleanNulls`, `Notifier`, `Subscriber`, `availableMiddlewareMethods`, `@Middleware` | removed, nothing replaces them                                                                   |

`StatusCode`, `getCookie`, `setCookie`, `deleteCookie`, `IPatch`,
`StorageSession` and `StorageIndexedDB` keep their names.

## Where middlewares go

The two lists become one. A middleware that was in `requestMiddlewares`
does its work before `await next()`, one that was in `responseMiddlewares`
after it. Order them: `onError`, `refreshToken`, `tokenAuth` / `cookie`,
`cache`, `cancel`.

## A middleware of your own

```ts
// 2.x
class Timing extends BaseMiddleware {
  process = (processData: ProcessData) => {
    processData.params.init.headers = {
      ...processData.params.init.headers,
      'X-Started': String(Date.now())
    };
    this.next(processData);
  };
}

// 3.0
const timing: Middleware = async (context, next) => {
  context.headers.set('X-Started', String(Date.now()));

  return next();
};
```

## Behaviour that changed without a new name

- Code after `await api.get(…)` now runs for 2xx only. Checks of
  `response.status` for failures move into `catch`, or the request gets
  `throwHttpErrors: false`.
- `try`/`catch` around a request now also catches responses outside 2xx.
- A request that could not be sent used to leave its promise open in some
  cases; it rejects.
- The body of a response is read without `contentType`; a request that
  gave none used to have no payload.
- The cache of `StorageIndexedDB` starts empty: it uses a new database.
  Entries of `StorageSession` written by 2.x are ignored.
- `cancel` no longer has a timeout; a request cancelled or timed out
  rejects with `RequestError`, not a plain `Error`.
- Relative addresses: `hostname: '/api'` worked wherever `fetch` resolved
  it; `baseURL: '/api'` needs a page (`document.baseURI`).
