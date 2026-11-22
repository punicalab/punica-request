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

| Tool                  | What it does                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `get_guide`           | The rules of version 3: the packages, clients and requests, what a request rejects with, the middlewares and their order       |
| `get_migration_guide` | From 2.x to 3.0: every name that changed with its replacement, before and after examples, the behaviour that changed           |
| `search_api`          | Finds exports of the packages by name or by words in their documentation                                                       |
| `get_api`             | The exact TypeScript declaration and documentation of one or more exports                                                      |
| `validate_code`       | Checks code for imports that do not exist, the API of 2.x (with its replacement), middlewares in the wrong order, wrong bodies |

Resources: `punica-request://guide`, `punica-request://migration` and
`punica-request://api/<name>`.

The API is read from the type declarations of the packages installed in the
project the server is started in, so the answers match that version. For a
package that is not installed it answers for the version it was built with.

A project that still has 2.x installed is told so: the assistant looks up the
2.x API that is installed and is not steered into rewriting working code. Ask
it to upgrade and it follows the migration guide.

## What the checker catches

Code written from memory is usually 2.x:

```ts
import { RequestAPI } from '@punica/request';
import { APIFetch } from '@punica/request-fetch';

const api = new RequestAPI(new APIFetch(), {
  hostname: 'https://api.example.com/',
  responseMiddlewares: [new ErrorMiddleware({ contentType: 'json', error: {} })]
});
const response = await api.get({ path: 'items', contentType: 'json' });

console.log(response.payload);
```

```text
11 problems:
line 1 unknown-export: @punica/request does not export RequestAPI. [fix: createClient({ adapter, baseURL, middlewares }) from "@punica/request"]
line 2 unknown-export: @punica/request-fetch does not export APIFetch. [fix: fetchAdapter() from "@punica/request-fetch"]
line 4 v2: RequestAPI is the client of 2.x. [fix: createClient({ adapter: fetchAdapter(), baseURL, headers, middlewares })]
line 4 v2: APIFetch is the adapter class of 2.x. [fix: fetchAdapter()]
line 5 v2: hostname is the option of 2.x. [fix: baseURL; it is joined with the path whatever their slashes]
line 6 v2: ErrorMiddleware is a class of 2.x; middlewares are made by functions. [fix: onError({ 401: (response, context) => { … } })]
line 6 v2: responseMiddlewares is one of the two lists of 2.x. [fix: one list, `middlewares`, outermost first: onError, refreshToken, tokenAuth / cookie, cache, cancel]
line 6 v2: contentType is the option of 2.x. [fix: leave it out: a response is read by its Content-Type. responseType ('json', 'text', 'blob', 'arrayBuffer', 'formData', 'stream') decides when it has to]
line 8 v2: The path is not an option any more. [fix: the path is the first argument: api.get('items', { query })]
line 8 v2: contentType is the option of 2.x. [fix: leave it out: a response is read by its Content-Type. responseType ('json', 'text', 'blob', 'arrayBuffer', 'formData', 'stream') decides when it has to]
line 10 v2: payload is the body of a response in 2.x. [fix: response.data]
```

And the rules of 3.x itself:

```ts
const api = createClient({
  adapter: fetchAdapter(),
  middlewares: [
    tokenAuth({ cookieName: 'token' }),
    refreshToken({ refresh }),
    onError({ 401: toLogin })
  ]
});

await api.post('items', { body: JSON.stringify(item) });
```

```text
3 problems:
line 3 middleware-order: onError after refreshToken sees the 401 before the token is refreshed, and reacts to requests that then succeed. [fix: put onError before refreshToken: the first in the list is the outermost]
line 3 middleware-order: refreshToken after tokenAuth / cookie sends the request again with the old token: the request does not pass them a second time. [fix: put refreshToken before tokenAuth and cookie]
line 10 body: A body is not serialised by hand: json does it. [fix: json: value]
```
