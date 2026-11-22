---
'@punica/request': minor
'@punica/request-fetch': minor
'@punica/request-http': minor
'@punica/request-middleware': minor
'@punica/request-mcp': minor
---

`context.requestHeaders`: the headers a request itself gave, without those of the client. A middleware that sets a header unless the request names its own no longer has to read `context.options.headers` in its three shapes:

```ts
if (!context.requestHeaders.has('Accept-Language')) {
  context.headers.set('Accept-Language', language());
}
```

The `license` field of the packages says `MIT`, as the `LICENSE` file of the repository always did; it said `ISC`.
