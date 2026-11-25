import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createPunicaRequestServer } from '../src/create.mjs';
import { createKnowledge } from '../src/knowledge.mjs';
import { loadPackage, readTypes } from '../src/load.mjs';

// The type declarations the packages of this repository were built with
const types = (path) =>
  readTypes(fileURLToPath(new URL(path, import.meta.url)));
const packages = [
  {
    name: '@punica/request',
    version: '3.0.0',
    files: types('../../api/dist/')
  },
  {
    name: '@punica/request-fetch',
    version: '3.0.0',
    files: types('../../api-fetch/dist/')
  },
  {
    name: '@punica/request-http',
    version: '3.0.0',
    files: types('../../api-http/dist/')
  },
  {
    name: '@punica/request-middleware',
    version: '3.0.0',
    files: types('../../middleware/dist/')
  }
];
const read = (name) =>
  readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const guide = read('guide.md');
const migration = read('migration.md');

async function connect(given = packages) {
  const server = createPunicaRequestServer({
    packages: given,
    guide,
    migration
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });

  await Promise.all([server.connect(a), client.connect(b)]);

  const call = async (name, args = {}) =>
    (await client.callTool({ name, arguments: args })).content[0].text;

  return { client, call };
}

test('lists the tools and says to look things up', async () => {
  const { client } = await connect();
  const { tools } = await client.listTools();

  assert.deepEqual(tools.map((tool) => tool.name).sort(), [
    'get_api',
    'get_guide',
    'get_migration_guide',
    'search_api',
    'validate_code'
  ]);
  assert.match(client.getInstructions(), /never write an import/);
  assert.doesNotMatch(client.getInstructions(), /^This project has/);
});

test('search_api lists exactly the public exports', async () => {
  const { call } = await connect();
  const all = await call('search_api');

  for (const [name, kind, pkg] of [
    ['createClient', 'const', '@punica/request'],
    ['when', 'const', '@punica/request'],
    ['HttpError', 'class', '@punica/request'],
    ['RequestError', 'class', '@punica/request'],
    ['isHttpError', 'const', '@punica/request'],
    ['ClientConfig', 'interface', '@punica/request'],
    ['RequestOptions', 'interface', '@punica/request'],
    ['RequestContext', 'interface', '@punica/request'],
    ['Middleware', 'type', '@punica/request'],
    ['Adapter', 'type', '@punica/request'],
    ['StatusCode', 'enum', '@punica/request'],
    ['getCookie', 'const', '@punica/request'],
    ['toFetch', 'const', '@punica/request'],
    ['fetchAdapter', 'const', '@punica/request-fetch'],
    ['httpAdapter', 'const', '@punica/request-http'],
    ['tokenAuth', 'const', '@punica/request-middleware'],
    ['cookie', 'const', '@punica/request-middleware'],
    ['cancel', 'const', '@punica/request-middleware'],
    ['cache', 'const', '@punica/request-middleware'],
    ['refreshToken', 'const', '@punica/request-middleware'],
    ['onError', 'const', '@punica/request-middleware'],
    ['StorageIndexedDB', 'class', '@punica/request-middleware'],
    ['IStorage', 'interface', '@punica/request-middleware'],
    ['CacheEntry', 'interface', '@punica/request-middleware']
  ]) {
    assert.match(
      all,
      new RegExp(`^${name} \\(${kind}, ${pkg.replace('/', '\\/')}\\)`, 'm'),
      name
    );
  }

  // Declared in the packages but not exported from them, and what 2.x had
  for (const name of [
    'createAbort',
    'readResponse',
    'buildURL',
    'RequestAPI',
    'BaseMiddleware',
    'APIFetch'
  ]) {
    assert.doesNotMatch(all, new RegExp(`^${name} \\(`, 'm'), name);
  }

  assert.match(
    await call('search_api', { query: 'cookie header' }),
    /^cookie \(const/m
  );
  // The first line of the documentation, without the stars of its comment
  assert.match(
    all,
    /^fetchAdapter \(const, @punica\/request-fetch\): Sends requests with `fetch`\.$/m
  );
  // A comment of one line, and a sentence that goes over two
  assert.match(
    all,
    /^RefreshTokenOptions \(interface, @punica\/request-middleware\): The options of `refreshToken`\.$/m
  );
  assert.match(
    all,
    /^refreshToken \(const, .*\): Answers a 401 by refreshing the token, once for all the requests that failed meanwhile, and sends the request again\.$/m
  );
  assert.match(
    await call('search_api', { query: 'no-such-thing' }),
    /Nothing matches/
  );
});

test('get_api returns the declaration with its documentation', async () => {
  const { call } = await connect();
  const api = await call('get_api', {
    names: ['createClient', 'ClientConfig', 'RequestAPI']
  });

  assert.match(api, /## createClient \(const, @punica\/request\)/);
  assert.match(api, /\(config: ClientConfig\) => Client/);
  assert.match(api, /baseURL\?: string \| URL;/);
  assert.match(api, /middlewares\?: /);
  assert.match(api, /RequestAPI is not exported by/);

  const options = await call('get_api', {
    names: ['RequestOptions', 'ResponseType']
  });

  for (const name of [
    'query',
    'json',
    'body',
    'headers',
    'responseType',
    'signal',
    'timeout',
    'throwHttpErrors'
  ]) {
    assert.match(options, new RegExp(`\\b${name}\\?: `), name);
  }

  for (const value of [
    'arrayBuffer',
    'blob',
    'formData',
    'json',
    'text',
    'stream'
  ]) {
    assert.match(options, new RegExp(`'${value}'`));
  }

  // The options of a middleware
  const cancel = await call('get_api', {
    names: ['CancelOptions', 'CancelMiddleware']
  });

  assert.match(cancel, /getKey\?: /);
  assert.match(cancel, /cancelAll\(\): void;/);
  assert.match(
    await call('search_api', { query: 'tokenFormat' }),
    /^TokenAuthOptions \(interface/m
  );
  assert.match(
    await call('search_api', { query: 'exclude' }),
    /^RefreshTokenOptions \(interface/m
  );
  assert.match(
    await call('get_api', { names: ['HttpError'] }),
    /readonly status: number;/
  );
});

test('validate_code names the 3.x replacement of every 2.x construct', async () => {
  const { call } = await connect();
  const lines = [
    /* 1 */ 'import { RequestAPI, BaseMiddleware, ProcessData, isHttpStatusOk } from "@punica/request";',
    /* 2 */ 'import { APIFetch } from "@punica/request-fetch";',
    /* 3 */ 'import { TokenAuthMiddleware, CacheMiddleware, StorageSession } from "@punica/request-middleware";',
    /* 4 */ 'const api = new RequestAPI(new APIFetch(), {',
    /* 5 */ '  hostname: "https://api.example.com/",',
    /* 6 */ '  requestInit: { headers: {} },',
    /* 7 */ '  requestMiddlewares: [new TokenAuthMiddleware({ cookieName: "t", headerName: "A" }), new CacheMiddleware({ storage })],',
    /* 8 */ '  responseMiddlewares: [new RefreshTokenMiddleware({ tokenProvider }), new ErrorMiddleware({ contentType: "json", error: {} })]',
    /* 9 */ '});',
    /* 10 */ 'const response = await api.get<void, Item[]>({ path: "items", contentType: "json", cache: { expireTime: 1000 } });',
    /* 11 */ 'await api.post({ path: "items", data: JSON.stringify(item) });',
    /* 12 */ 'if (isHttpStatusOk(response.status)) use(response.payload);',
    /* 13 */ 'class Mine extends BaseMiddleware {',
    /* 14 */ '  process = (processData: ProcessData) => {',
    /* 15 */ '    processData.params.init.headers = {};',
    /* 16 */ '    if (processData.httpResponse) processData.resolve(x); else processData.reject(e);',
    /* 17 */ '    this.next(processData);',
    /* 18 */ '    this.restart(processData);',
    /* 19 */ '  };',
    /* 20 */ '  getActive() { return true; }',
    /* 21 */ '}',
    /* 22 */ 'canceller.cancelAllRequests();'
  ];
  const report = await call('validate_code', { code: lines.join('\n') });
  const expected = [
    [1, 'unknown-export', /does not export RequestAPI\. \[fix: createClient\(/],
    [
      1,
      'unknown-export',
      /does not export BaseMiddleware\. \[fix: Middleware from/
    ],
    [
      1,
      'unknown-export',
      /does not export ProcessData\. \[fix: RequestContext/
    ],
    [
      1,
      'unknown-export',
      /does not export isHttpStatusOk\. \[fix: response\.ok/
    ],
    [2, 'unknown-export', /does not export APIFetch\. \[fix: fetchAdapter\(\)/],
    [
      3,
      'unknown-export',
      /does not export TokenAuthMiddleware\. \[fix: tokenAuth\(/
    ],
    [3, 'unknown-export', /does not export CacheMiddleware\. \[fix: cache\(/],
    [4, 'v2', /RequestAPI is the client of 2\.x\. \[fix: createClient\(/],
    [
      4,
      'v2',
      /APIFetch is the adapter class of 2\.x\. \[fix: fetchAdapter\(\)\]/
    ],
    [5, 'v2', /hostname is the option of 2\.x\. \[fix: baseURL/],
    [6, 'v2', /requestInit is the option of 2\.x/],
    [7, 'v2', /requestMiddlewares is one of the two lists/],
    [7, 'v2', /TokenAuthMiddleware is a class of 2\.x.*\[fix: tokenAuth\(/],
    [
      7,
      'v2',
      /CacheMiddleware is a class of 2\.x.*\[fix: cache\(\{ storage \}\)\]/
    ],
    [8, 'v2', /responseMiddlewares is one of the two lists/],
    [
      8,
      'v2',
      /RefreshTokenMiddleware is a class of 2\.x.*\[fix: refreshToken\(/
    ],
    [8, 'v2', /ErrorMiddleware is a class of 2\.x.*\[fix: onError\(/],
    [8, 'v2', /contentType is the option of 2\.x/],
    [10, 'v2', /The path is not an option any more/],
    [10, 'v2', /one type argument/],
    [10, 'v2', /contentType is the option of 2\.x/],
    [10, 'v2', /expireTime is the option of 2\.x\. \[fix: cache: \{ ttl/],
    [11, 'v2', /The path is not an option any more/],
    [11, 'v2', /data is the option of 2\.x.*\[fix: json: value\]/],
    [12, 'v2', /isHttpStatusOk was removed/],
    [
      12,
      'v2',
      /payload is the body of a response in 2\.x\. \[fix: response\.data\]/
    ],
    [13, 'v2', /BaseMiddleware is the middleware class of 2\.x/],
    [15, 'v2', /not in params\.init any more\. \[fix: context\.headers\.set/],
    [16, 'v2', /gets the response through processData/],
    [
      16,
      'v2',
      /processData\.resolve ends a request in 2\.x\. \[fix: return the response\]/
    ],
    [
      16,
      'v2',
      /processData\.reject ends a request in 2\.x\. \[fix: throw the error\]/
    ],
    [
      17,
      'v2',
      /this\.next\(processData\) continues a request in 2\.x\. \[fix: return next\(\)\]/
    ],
    [18, 'v2', /restart sends a request again in 2\.x/],
    [20, 'v2', /no switch of its own\. \[fix: when\(/],
    [
      22,
      'v2',
      /cancelAllRequests is the method of 2\.x\. \[fix: .*cancelAll\(\)\]/
    ]
  ];

  for (const [line, rule, pattern] of expected) {
    assert.ok(
      report
        .split('\n')
        .some(
          (found) =>
            found.startsWith(`line ${line} ${rule}: `) && pattern.test(found)
        ),
      `line ${line} ${rule} ${pattern}\n${report}`
    );
  }

  assert.match(report, new RegExp(`^${expected.length} problems:`));

  // Every line of the 2.x code that does something is answered
  const reported = new Set(
    [...report.matchAll(/^line (\d+) /gm)].map((match) => Number(match[1]))
  );

  assert.deepEqual(
    lines.map((_, index) => index + 1).filter((line) => !reported.has(line)),
    [9, 14, 19, 21]
  );
});

test('validate_code knows the rules of 3.x', async () => {
  const { call } = await connect();
  const check = (code) => call('validate_code', { code });

  assert.match(
    await check(
      'createClient({ adapter, middlewares: [refreshToken({ refresh }), onError({ 401: go })] });'
    ),
    /^1 problem:\nline 1 middleware-order: onError after refreshToken .*\[fix: put onError before refreshToken/
  );
  assert.match(
    await check(
      'createClient({\n  adapter,\n  middlewares: [\n    tokenAuth({ cookieName: "t" }),\n    refreshToken({ refresh })\n  ]\n});'
    ),
    /^1 problem:\nline 3 middleware-order: refreshToken after tokenAuth \/ cookie .*\[fix: put refreshToken before tokenAuth and cookie\]/
  );
  assert.match(
    await check(
      'createClient({ adapter, middlewares: [cookie({ cookieName: "x", headerName: "X" }), refreshToken({ refresh })] });'
    ),
    /middleware-order: refreshToken after tokenAuth \/ cookie/
  );
  assert.match(
    await check('await api.post("items", { json: item, body: form });'),
    /^1 problem:\nline 1 body: A request has json or body, not both/
  );
  assert.match(
    await check(
      'await api.put<Item>("items/1", {\n  json: JSON.stringify(item)\n});'
    ),
    /^1 problem:\nline 1 body: A body is not serialised by hand: json does it\. \[fix: json: value\]/
  );
  assert.match(
    await check('await api.post("items", { body: JSON.stringify(item) });'),
    /body: A body is not serialised by hand: json does it/
  );
  assert.match(
    await check(
      'const api = createClient({ adapter, headers: { "Content-Type": "application/json" } });'
    ),
    /^1 problem:\nline 1 content-type: A Content-Type of the client goes with every request/
  );
  assert.match(
    await check(
      'const mine = async (context, next) => {\n  context.headers.set("a", "1");\n  await next();\n};'
    ),
    /^1 problem:\nline 3 middleware-return: .*\[fix: return next\(\)\]/
  );
  assert.match(
    await check('const mine = (context, next) => {\n  next();\n}'),
    /line 2 middleware-return/
  );
  assert.match(
    await check('refreshToken({ tokenProvider: provider });'),
    /v2: refreshToken takes a function, not a provider/
  );
  assert.match(
    await check('onError({ contentType: "json", error: { 401: go } });'),
    /v2: onError takes the handlers themselves/
  );
  assert.match(
    await check('import { retry } from "@punica/request-middleware";'),
    /does not export retry\. \[fix: there is no retry middleware/
  );
  assert.match(
    await check('import { createClient } from "@punica/request/client";'),
    /unknown-package: There is no @punica\/request\/client\./
  );
  assert.match(
    await check('import { fetchAdapter } from "@punica/request";'),
    /does not export fetchAdapter\. \[fix: import it from "@punica\/request-fetch"\]/
  );
});

test('validate_code finds what is wrong without a 2.x name in it', async () => {
  const { call } = await connect();
  const check = (code) => call('validate_code', { code });

  assert.match(
    await check('const api = createClient({ baseURL: "https://x" });'),
    /^1 problem:\nline 1 adapter: A client needs an adapter/
  );
  assert.match(
    await check(
      'createClient({\n  adapter: fetchAdapter,\n  middlewares: [tokenAuth, cancel]\n});'
    ),
    /^3 problems:\nline 2 adapter: fetchAdapter makes the adapter.*\nline 3 middleware-call: tokenAuth makes the middleware.*\nline 3 middleware-call: cancel makes the middleware.*\[fix: call it with its options: cancel\(\)\]$/
  );
  assert.match(
    await check('await api.get("items", { json: { a: 1 } });'),
    /^1 problem:\nline 1 body: A GET request has no body/
  );
  assert.match(
    await check('await api.post("items", { data: item });'),
    /^1 problem:\nline 1 v2: data is the option of 2\.x\. \[fix: json: value/
  );
  assert.match(
    await check('use((await api.get("items")).payload);'),
    /v2: payload is the body of a response/
  );
  assert.match(
    await check('const { path, query } = o;\nawait api.get({ path, query });'),
    /line 2 v2: The path is not an option any more/
  );
  assert.match(
    await check('tokenAuth({ cookieName: "t" }, "X-Auth");'),
    /v2: tokenAuth takes one object/
  );
  assert.match(
    await check('const m = async (context, next) => { await next(); };'),
    /^1 problem:\nline 1 middleware-return/
  );
  assert.match(
    await check(
      'const m = async (context, next) => {\r\n  await next();\r\n};\r\n'
    ),
    /^1 problem:\nline 2 middleware-return/
  );
  assert.match(
    await check(
      'async function m(context: RequestContext, next: Next) {\n  log();\n  next();\n}'
    ),
    /line 3 middleware-return/
  );
  assert.match(
    await check('const m = (context, next) => next(context);'),
    /^1 problem:\nline 1 next: next takes no argument/
  );
  // Other ways of taking a name from a package
  assert.match(
    await check(
      'import * as P from "@punica/request";\nconst api = new P.RequestAPI(adapter, {});\nP.createClient({ adapter });'
    ),
    /line 1 unknown-export: @punica\/request does not export RequestAPI\. \[fix: createClient/
  );
  assert.match(
    await check('import RequestAPI from "@punica/request";'),
    /unknown-export: @punica\/request has no default export/
  );
  assert.match(
    await check('export { RequestAPI } from "@punica/request";'),
    /does not export RequestAPI/
  );
  assert.match(
    await check('const { APIFetch } = require("@punica/request-fetch");'),
    /does not export APIFetch\. \[fix: fetchAdapter\(\)/
  );
  assert.match(
    await check('const { nope: x } = await import("@punica/request");'),
    /does not export nope/
  );
  assert.match(
    await check('import { x } from "@punica/request-axios";'),
    /unknown-package: There is no @punica\/request-axios/
  );
});

test('validate_code leaves correct code and the code of other libraries alone', async () => {
  const { call } = await connect();

  for (const code of [
    // Keys of what is sent are not options of the request
    'await api.post("posts", { json: { title: "a", body: "text", data: 1, hostname: "x" } });',
    // One type argument, whatever it holds
    'await api.get<{ id: number, name: string }>("items/1");\nawait api.get<[number, string]>("pair");\nawait api.get<Map<string, (a: number, b: number) => void>>("m");',
    // hostname of something else, in a file with a client
    'const api = createClient({ adapter: httpAdapter({ requestOptions: { hostname: "x" } }) });\nconst h = { hostname: u.hostname };',
    // Comments and texts are not code
    'createClient({\n  adapter,\n  middlewares: [\n    // tokenAuth() reads the cookie, refreshToken() after it would be wrong\n    onError({}),\n    refreshToken({ refresh }),\n    tokenAuth({ cookieName: "t" })\n  ]\n});',
    'const a = createClient({ adapter, middlewares: [tokenAuth({ cookieName: "[" })] });\nconst b = createClient({ adapter, middlewares: [refreshToken({ refresh })] });',
    '// new RequestAPI(new APIFetch(), { hostname }) is how 2.x did it\nconst text = "response.payload and requestMiddlewares";',
    // next() that is not the end of the middleware
    'const m = async (context, next) => {\n  if (skip(context)) {\n    await next();\n  }\n\n  return next();\n};',
    'const m = (context, next) => next();',
    'const m = async (context, next) => {\n  const response = await next();\n  return response;\n};',
    // Middlewares kept in variables, a client made from a spread configuration
    'const latest = cancel();\ncreateClient({ adapter, middlewares: [latest, when((c) => c.method === "GET", cache({ storage }))] });\ncreateClient({ ...shared });\ncreateClient(config);',
    // A storage of one's own, a handler named like a middleware
    'const cache = new Map();\nprops.onError({ error: err });\nconst getActive = 1;',
    // Other libraries: nothing here is taken from Punica Request
    'import express from "express";\napp.use((req, res, next) => {\n  next();\n});\napp.post("/x", (req, res) => { const body: Body = req.body; res.json({ json: true }); });',
    'import { createClient } from "@supabase/supabase-js";\ncreateClient(url, key, { headers: { "Content-Type": "application/json" } });\nconst { payload } = await dispatch(load());',
    'import axios from "axios";\nawait axios.post<User, Result>("/x", { data: 1 });\nrouter.get({ path: "/x" });\ns3.putObject({ contentType: "x" });',
    'import { x } from "@punica/requestor";',
    // A file with nothing to do with requests
    'const step = () => {\n  next();\n}'
  ]) {
    assert.match(await call('validate_code', { code }), /^No problems/, code);
  }
});

test('validate_code answers at once, whatever it is given', async () => {
  const { call } = await connect();
  const within = async (code, limit = 1500) => {
    const started = Date.now();
    const report = await call('validate_code', { code });

    assert.ok(
      Date.now() - started < limit,
      `${Date.now() - started} ms for ${JSON.stringify(code.slice(0, 30))}…`
    );

    return report;
  };
  const fill = (piece) => piece.repeat(Math.floor(199_000 / piece.length));

  for (const piece of [
    ' ',
    '\n',
    'next() ',
    'next()\n',
    '.post(',
    'createClient({headers:{',
    'createClient(',
    'middlewares:[',
    'hostname: ',
    '.get<',
    '.get<a,',
    'import{',
    '{payload ',
    'new ErrorMiddleware<',
    '(context, next) => {',
    'tokenAuth({',
    '"',
    '/*',
    '{[('
  ]) {
    await within(fill(piece));
  }

  assert.match(await within('next()' + ' '.repeat(190_000)), /^No problems/);
  // Correct code of that size
  assert.match(
    await within(
      fill('await api.post("items", { json: { a: [1, 2, { b: "c" }] } });\n')
    ),
    /^No problems/
  );
  // Too much to be a file of an application
  assert.match(
    await within('a'.repeat(200_001)),
    /^1 problem:\nline 1 too-large: /
  );
  // Brackets that never close, and nothing at all
  assert.match(
    await within('createClient({ adapter, middlewares: [tokenAuth({'),
    /^No problems/
  );
  assert.match(await within(''), /^No problems/);
});

test('validate_code accepts correct code, the examples of the guide included', async () => {
  const { call } = await connect();
  const examples = [...guide.matchAll(/```ts\n([\s\S]*?)```/g)].map(
    (match) => match[1]
  );

  assert.ok(examples.length >= 6);

  for (const code of examples) {
    assert.match(await call('validate_code', { code }), /^No problems/, code);
  }

  for (const code of [
    // An import list with comments in it
    'import {\n  createClient as c, // the client\n  type ClientConfig,\n  /* a type */ RequestContext\n} from "@punica/request";',
    // The right order, a Content-Type that a middleware or a request sets, values that are returned
    'createClient({ adapter, headers: { Accept: "text/csv" }, middlewares: [onError({}), refreshToken({ refresh }), tokenAuth({ cookieName: "t" }), cookie({ cookieName: "x", headerName: "X" }), (context, next) => { context.headers.set("Content-Type", "text/plain"); return next(); }] });',
    'await api.post("items", { body: text, headers: { "Content-Type": "text/csv" } });',
    'const a = async (context, next) => {\n  const response = await next();\n\n  return response;\n};',
    'const b = async (context, next) => {\n  try {\n    return await next();\n  } finally {\n    done();\n  }\n};',
    // Words of 2.x in code that is not Punica Request
    'const server = http.request({ hostname: "example.com", path: "/" });\nconst jwt = token.payload;'
  ]) {
    assert.match(await call('validate_code', { code }), /^No problems/, code);
  }
});

test('the 2.x examples of the migration guide are all recognised, the 3.x ones accepted', async () => {
  const { call } = await connect();
  const examples = [...migration.matchAll(/```ts\n([\s\S]*?)```/g)].map(
    (match) => match[1]
  );

  assert.ok(examples.length >= 2);

  for (const code of examples) {
    const [old, current] = code.split('// 3.0');

    assert.ok(old.includes('// 2.x') && current, code);
    assert.match(
      await call('validate_code', { code: old }),
      /^\d+ problems?:/,
      old
    );
    assert.match(
      await call('validate_code', { code: current }),
      /^No problems/,
      current
    );
  }

  // Every 2.x name of the table that is an export has a replacement
  const names = [
    'RequestAPI',
    'APIFetch',
    'APIHttp',
    'IRequest',
    'IConfig',
    'RequestParams',
    'ProcessData',
    'ContentType',
    'BaseMiddleware',
    'mergeConfig',
    'cleanNulls',
    'Notifier',
    'isHttpStatusOk'
  ];
  const report = await call('validate_code', {
    code: `import { ${names.join(', ')} } from "@punica/request";`
  });

  for (const name of names) {
    assert.match(
      report,
      new RegExp(`does not export ${name}\\. \\[fix: (?!look the name up)`),
      name
    );
  }
});

test('a project on 2.x is not steered into the 3.x API', async () => {
  const old = packages.map((pkg) => ({
    ...pkg,
    version: '2.6.5',
    installed: true
  }));
  const { client, call } = await connect(old);

  assert.match(
    client.getInstructions(),
    /^This project has @punica\/request 2\.6\.5 installed/
  );
  assert.match(
    client.getInstructions(),
    /Do not rewrite working code to 3\.x unless the user asks to upgrade/
  );
  assert.match(
    await call('get_guide'),
    /^This project has @punica\/request 2\.6\.5 installed/
  );
  // Its own API is not reported
  assert.match(
    await call('validate_code', {
      code: 'const api = new RequestAPI(new APIFetch(), { hostname: "https://x", requestMiddlewares: [] });\nconst r = await api.get({ path: "a", contentType: "json" });\nuse(r.payload);'
    }),
    /^No problems/
  );
  // The migration guide is there for when it is asked for
  assert.match(
    await call('get_migration_guide'),
    /^# Punica Request: from 2\.x to 3\.0/
  );
});

test('the guides and the resources', async () => {
  const { client, call } = await connect();

  assert.match(await call('get_guide'), /^# Punica Request 3/);
  assert.match(
    await call('get_guide'),
    /A response outside 2xx \*\*rejects\*\* with an `HttpError`/
  );
  assert.match(
    await call('get_migration_guide'),
    /\| `response\.payload` +\| `response\.data` +\|/
  );

  const { resources } = await client.listResources();

  assert.ok(
    resources.some(
      (resource) => resource.uri === 'punica-request://api/createClient'
    )
  );
  assert.ok(
    resources.some((resource) => resource.uri === 'punica-request://guide')
  );
  assert.ok(
    resources.some((resource) => resource.uri === 'punica-request://migration')
  );

  const { contents } = await client.readResource({
    uri: 'punica-request://api/cache'
  });

  assert.match(contents[0].text, /## cache \(const/);
  assert.match(
    (await client.readResource({ uri: 'punica-request://migration' }))
      .contents[0].text,
    /from 2\.x to 3\.0/
  );
});

test('loadPackage reads the installed package, or the bundled copy', () => {
  const installed = loadPackage('@punica/request', process.cwd());

  assert.equal(installed.installed, true);
  assert.ok(installed.files.has('index.d.ts'));

  const bundled = loadPackage('@punica/request', '/');

  assert.equal(bundled.installed, false);
  assert.ok(bundled.files.has('index.d.ts'));
});

test('a type that is not exported comes with the exports made of it', () => {
  const files = new Map([
    [
      'index.d.ts',
      [
        '/** What the options hold. */',
        'type Shared = { retries?: number };',
        'export type AOptions = Shared & { a?: string };',
        'export type BOptions = Shared & { b?: string };'
      ].join('\n')
    ]
  ]);
  const knowledge = createKnowledge([
    { name: '@punica/example', version: '1.0.0', files }
  ]);

  assert.match(
    knowledge.formatMarkdown('AOptions'),
    /type Shared = \{ retries/
  );

  const local = knowledge.formatMarkdown('Shared');

  assert.match(local, /## Shared \(not exported, @punica\/example\)/);
  assert.match(local, /part of AOptions, BOptions, which can/);
  assert.match(local, /\/\*\* What the options hold\. \*\/\ntype Shared/);
  assert.match(
    knowledge.formatMarkdown('Missing'),
    /Missing is not exported by/
  );
});
