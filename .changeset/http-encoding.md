---
'@punica/request-http': patch
---

A response whose text arrives in several pieces is decoded as one: a character that was split between two pieces used to be corrupted, which could also leave the response without a payload.
