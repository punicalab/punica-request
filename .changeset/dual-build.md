---
'@punica/request': minor
'@punica/request-fetch': minor
'@punica/request-middleware': minor
'@punica/request-http': minor
---

The packages are published as ES modules and as CommonJS, with an `exports` map and `sideEffects: false`, so bundlers can drop what an application does not use. Importing from the package name works as before; files inside `dist/` are no longer importable one by one.
