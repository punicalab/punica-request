# @punica/request-mcp

An [MCP](https://modelcontextprotocol.io) server for
[Punica Request](https://request.punicalab.com). It gives an AI assistant the
real API of the packages and a checker for the code it writes, so it looks
names up instead of guessing them.

## Set up

**Claude Code**

```bash
claude mcp add punica-request -- npx -y @punica/request-mcp
```

**Cursor** (`.cursor/mcp.json`), **Claude Desktop** and most other clients:

```json
{
  "mcpServers": {
    "punica-request": {
      "command": "npx",
      "args": ["-y", "@punica/request-mcp"]
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "punica-request": {
      "command": "npx",
      "args": ["-y", "@punica/request-mcp"]
    }
  }
}
```

## Tools

| Tool            | What it does                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `get_guide`     | The rules: the packages, how a request is sent and what it resolves with, the middlewares and the list each belongs in, an example |
| `search_api`    | Finds exports of the packages by name or by words in their documentation                                                           |
| `get_api`       | The exact TypeScript declaration and documentation of one or more exports                                                          |
| `validate_code` | Checks code for imports that do not exist, names of older versions, wrong options and middlewares in the wrong list                |

Resources: `punica-request://guide` and `punica-request://api/<name>`.

The API is read from the type declarations of the packages installed in the
project the server is started in, so the answers match that version. For a
package that is not installed it answers for the version it was built with.

## What the checker catches

```ts
import { RequestAPI, APIXHR, CacheMiddleware } from '@punica/request';

const config = {
  hostname: 'https://api.example.com',
  requestMiddlewares: [new RefreshTokenMiddleware({ tokenProvider })],
  responseMiddlewares: [new CacheMiddleware({ storage })]
};

await api.get({ path: 'items', contentType: 'application/json', cache: true });
```

```text
7 problems:
line 1 unknown-export: @punica/request does not export APIXHR. [fix: there is no XHR adapter: APIFetch from "@punica/request-fetch", or APIHttp from "@punica/request-http" for Node]
line 1 unknown-export: @punica/request does not export CacheMiddleware. [fix: import it from "@punica/request-middleware"]
line 4 url: hostname and path are joined with nothing between them: "https://api.example.com" and a path without a leading slash give a wrong address. [fix: end hostname with a slash, or start every path with one]
line 5 middleware-list: RefreshTokenMiddleware does not work in requestMiddlewares: it reads the status of the response, which a request middleware does not have. [fix: move it to responseMiddlewares]
line 6 middleware-list: CacheMiddleware does not work in responseMiddlewares: it answers from the cache before the request is sent; in responseMiddlewares it never caches. [fix: move it to requestMiddlewares]
line 9 content-type: contentType is not a MIME type: it names how the body of the response is read. [fix: contentType: 'json' (or 'text', 'blob', 'arrayBuffer', 'formData'); a Content-Type header goes into init.headers]
line 9 cache: cache is an object. [fix: cache: {} or cache: { expireTime: 60_000 } (milliseconds)]
```
