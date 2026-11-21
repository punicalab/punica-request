---
'@punica/request': patch
'@punica/request-fetch': patch
'@punica/request-middleware': patch
---

Fixes for defects found in an audit, each with a test.

- Requests that run at the same time no longer share their path through the middlewares. A request whose middleware waited (a cache that is read, a token that is refreshed) could continue along the path of a request set up after it, and be sent with that request's method.
- A request that cannot be sent (no network, cancelled, an invalid request) rejects, and so does one whose response middleware throws. Both used to leave the promise unsettled. That holds after a middleware that waits as well.
- `StorageIndexedDB` works: it never found what it wrote, and a request that used it never ended. It returns the cached body, replaces the entry of an address and removes expired entries.
- `StorageSession` returns `null` for an entry it cannot give back instead of never answering, and keeps `text` as well as `json`.
- A cached answer is a whole response, `{ payload, status: 200 }`. A cache that cannot be read no longer sends the request twice.
- `CancelRequestMiddleware` tells requests apart by method and path, so a `POST` no longer cancels a `GET` to the same path; a new query to a path still cancels the one before it, as a search field needs. `getKey` changes what counts as the same request. Its timeout and its entry are cleared however the request ends, they no longer touch a later request, and the signal a caller gives a request still cancels it. A request that is sent again after a token refresh is not cancelled by its own first attempt.
- `RefreshTokenMiddleware` sends a request again once: a server that keeps answering 401 no longer starts refresh after refresh. When `refreshToken()` returns `false` the request is not sent again and its 401 goes on to the next middleware.
- `getCookie` returns `null` where there is no `document` instead of throwing, and matches a name as it is written, whatever characters it holds.
- `RefreshTokenMiddleware` takes `exclude`, for a token provider that refreshes through the same API: its own request, answered with a 401, used to wait for itself.
- A middleware instance listed for the request and for the response is passed twice instead of sending the request in a loop.

New, for middlewares of your own: `processData.method`, and `restart(processData)` on `BaseMiddleware` to send a request again. `IStorage` is exported, so a cache storage of your own can be typed.
