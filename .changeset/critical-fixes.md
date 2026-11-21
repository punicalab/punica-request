---
'@punica/request': patch
'@punica/request-fetch': patch
'@punica/request-middleware': patch
---

Fixes for defects found in an audit, each with a test.

- Requests that run at the same time no longer share their path through the middlewares. A request whose middleware waited (a cache that is read, a token that is refreshed) could continue along the path of a request set up after it, and be sent with that request's method.
- A request that cannot be sent (no network, cancelled, an invalid request) rejects, and so does one whose response middleware throws. Both used to leave the promise unsettled.
- `StorageIndexedDB` works: it never found what it wrote, and a request that used it never ended. It returns the cached body, replaces the entry of an address and removes expired entries.
- `StorageSession` returns `null` for an entry it cannot give back instead of never answering, and keeps `text` as well as `json`.
- A cached answer is a whole response, `{ payload, status: 200 }`. A cache that cannot be read no longer sends the request twice.
- `CancelRequestMiddleware` tells requests apart by method and address with its query, so another page or another method is not cancelled. Its timeout is cleared when the response arrives and no longer touches a later request.
- `RefreshTokenMiddleware` sends a request again once: a server that keeps answering 401 no longer starts refresh after refresh. When `refreshToken()` returns `false` the request is not sent again and its 401 goes on to the next middleware.
- `getCookie` returns `null` where there is no `document` instead of throwing.

New, for middlewares of your own: `processData.method`, and `restart(processData)` on `BaseMiddleware` to send a request again. `IStorage` is exported, so a cache storage of your own can be typed.
