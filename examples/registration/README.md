# Example: a registration application

A small application on the **published** packages (`npm install` takes them
from npm, not from this repository): a client set up the way an application
sets one up, and what the application does with it, one scenario each.

- [`src/api.ts`](./src/api.ts): the client. `onError` with one handler for
  every status and a request option of the application's own
  (`ignoreNotification`), `refreshToken` through the same client, a
  middleware of its own that sends the language of the page, `tokenAuth`
  from a cookie or from a variable, `cookie` for a CSRF token, `cache` and
  `cancel`.
- [`src/scenarios.ts`](./src/scenarios.ts): queries, JSON and form bodies,
  failures and how they are told to the user, the token refresh, the cache,
  cancelled searches, timeouts, binary, text and streamed answers.
- [`server.mjs`](./server.mjs): a stand-in for the API, and the page, on two
  ports, so that the browser sends every request as a CORS request.

```bash
npm install
npm test     # type-checks, builds, and runs the scenarios in Node with both adapters
npm start    # then open http://127.0.0.1:4400: the same scenarios in the browser
```
