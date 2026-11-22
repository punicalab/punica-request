# Security

## Supported versions

| Version       | Supported |
| ------------- | --------- |
| 3.x           | Yes       |
| 2.x and older | No        |

## Reporting a vulnerability

Please report it privately through GitHub: the repository's **Security** tab,
**Report a vulnerability**. Do not open a public issue.

Say which package and version, how to reproduce it, and what an attacker
gains. You will get an answer within a week, and a fix is released as a patch
before the report is made public.

One property is worth knowing when judging a report: with a `baseURL`, a
client refuses a path that leads to another origin or out of the path of its
base, so that its headers (a token among them) reach only its own API.
Anything that gets around that is in scope.
