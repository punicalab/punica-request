# @punica/request-mcp

## 0.6.1

### Patch Changes

- [#130](https://github.com/punicalab/punica-request/pull/130) [`678afe4`](https://github.com/punicalab/punica-request/commit/678afe45c463577ed2f75729461501340cf08727) Thanks [@punicalab](https://github.com/punicalab)! - The server instructions name where each import comes from, so an assistant does not read package.json exports or READMEs in node_modules to find out.

## 0.6.0

### Minor Changes

- [#126](https://github.com/punicalab/punica-request/pull/126) [`93733f4`](https://github.com/punicalab/punica-request/commit/93733f4cb43c5434a87750eaeb922d334c6c0318) Thanks [@punicalab](https://github.com/punicalab)! - `get_api` of a type guard brings the class it checks for: `isRequestError` comes with `RequestError` (and its `RequestErrorReason`), `isHttpError` with `HttpError`. `…Reason` types count among the types a declaration takes.

## 0.5.1

### Patch Changes

- [#122](https://github.com/punicalab/punica-request/pull/122) [`513a916`](https://github.com/punicalab/punica-request/commit/513a916d4396df04ad99c06896d241d3464227e0) Thanks [@punicalab](https://github.com/punicalab)! - The guide opens with where exact declarations come from: `get_api` (with the Options types a function takes), instead of the `.d.ts` files in `node_modules`.

## 0.5.0

### Minor Changes

- [#118](https://github.com/punicalab/punica-request/pull/118) [`6fcc12f`](https://github.com/punicalab/punica-request/commit/6fcc12f686c31a27d5e5d05d4805a087ccada76e) Thanks [@punicalab](https://github.com/punicalab)! - `get_api` now brings the option, configuration and handler types an export takes: `refreshToken` comes with `RefreshTokenOptions`, `onError` with `ErrorHandlers` and `ErrorHandler`, `createClient` with `ClientConfig` (at most four, none that were asked for). `RefreshTokenOptions.refresh` documents that what it resolves with is not used, and shows a refresh that stores the token for `tokenAuth`.

## 0.4.1

### Patch Changes

- [#114](https://github.com/punicalab/punica-request/pull/114) [`dd731a1`](https://github.com/punicalab/punica-request/commit/dd731a1d85d6632c51eb5823ba3a2b7b4c76107a) Thanks [@punicalab](https://github.com/punicalab)! - `createClient` says how a path is joined to `baseURL`, so the rule is in the declaration an assistant reads first.

## 0.4.0

### Minor Changes

- [#110](https://github.com/punicalab/punica-request/pull/110) [`272abab`](https://github.com/punicalab/punica-request/commit/272ababacf4a45502f63edaa4808921dd7548e69) Thanks [@punicalab](https://github.com/punicalab)! - `ClientConfig.baseURL` says how it and a path are joined, what is refused and where a relative one works. `get_api` answers a name the packages declare without exporting with its declaration and the exports that hold it, as form-mcp does.

## 0.3.0

### Minor Changes

- [#106](https://github.com/punicalab/punica-request/pull/106) [`38bf720`](https://github.com/punicalab/punica-request/commit/38bf7207b1ef02e5cda1d0537288313ca0ca8bf4) Thanks [@punicalab](https://github.com/punicalab)! - The server knows Punica Request 3.2: `toFetch(client)` is in its guide and in the API it gives a project that has not installed the packages (the bundled copy was 3.1.0).

## 0.2.0

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

- [#96](https://github.com/punicalab/punica-request/pull/96) [`175d83d`](https://github.com/punicalab/punica-request/commit/175d83d83b1699996a84510d5c215963f9d3b3dc) Thanks [@punicalab](https://github.com/punicalab)! - The guide says where Punica Request meets Punica Form and Punica Components (a form that is submitted, what the server refuses, a field that asks the server) and points to an application on the three.

## 0.1.0

### Minor Changes

- [#81](https://github.com/punicalab/punica-request/pull/81) [`8eff516`](https://github.com/punicalab/punica-request/commit/8eff516caaea586952a7f97379c8a1ccce8a842b) Thanks [@punicalab](https://github.com/punicalab)! - An MCP server for Punica Request. It gives an AI assistant the exact API of the packages installed in the project (`search_api`, `get_api`), the rules of version 3 (`get_guide`), the way from 2.x to 3.0 (`get_migration_guide`) and a checker for the code it writes (`validate_code`): imports that do not exist, the API of 2.x with its replacement in 3.x, middlewares in the wrong order and bodies that are set twice. A project that still has 2.x installed is recognised and not steered into rewriting working code.

## 0.1.0-next.0

### Minor Changes

- [#81](https://github.com/punicalab/punica-request/pull/81) [`8eff516`](https://github.com/punicalab/punica-request/commit/8eff516caaea586952a7f97379c8a1ccce8a842b) Thanks [@punicalab](https://github.com/punicalab)! - An MCP server for Punica Request. It gives an AI assistant the exact API of the packages installed in the project (`search_api`, `get_api`), the rules of version 3 (`get_guide`), the way from 2.x to 3.0 (`get_migration_guide`) and a checker for the code it writes (`validate_code`): imports that do not exist, the API of 2.x with its replacement in 3.x, middlewares in the wrong order and bodies that are set twice. A project that still has 2.x installed is recognised and not steered into rewriting working code.
