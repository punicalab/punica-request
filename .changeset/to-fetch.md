---
'@punica/request': minor
---

`toFetch(client)`: `fetch`'s shape sent through a client, for code that takes a `fetch` or reads a `Response` (a stream of events, a webhook call, a library). The client's middlewares run on every call; the caller gets a `Response` for every status with its body unread, and the errors `fetch` would throw (the signal's reason on an abort, a `TimeoutError` when the client's own time runs out, the adapter's error when no answer came). It replaces the fetch-shaped wrappers applications wrote over the client.
