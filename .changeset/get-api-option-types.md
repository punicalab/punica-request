---
'@punica/request-mcp': minor
'@punica/request-middleware': patch
---

`get_api` now brings the option, configuration and handler types an export takes: `refreshToken` comes with `RefreshTokenOptions`, `onError` with `ErrorHandlers` and `ErrorHandler`, `createClient` with `ClientConfig` (at most four, none that were asked for). `RefreshTokenOptions.refresh` documents that what it resolves with is not used, and shows a refresh that stores the token for `tokenAuth`.
