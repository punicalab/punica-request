---
'@punica/request-mcp': minor
---

`get_api` of a type guard brings the class it checks for: `isRequestError` comes with `RequestError` (and its `RequestErrorReason`), `isHttpError` with `HttpError`. `…Reason` types count among the types a declaration takes.
