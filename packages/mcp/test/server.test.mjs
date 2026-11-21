import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createPunicaRequestServer } from '../src/create.mjs';
import { loadPackage, readTypes } from '../src/load.mjs';

// The type declarations the packages of this repository were built with
const types = (path) => readTypes(fileURLToPath(new URL(path, import.meta.url)));
const packages = [
  { name: '@punica/request', version: '2.7.0', files: types('../../api/dist/') },
  { name: '@punica/request-fetch', version: '2.7.0', files: types('../../api-fetch/dist/') },
  { name: '@punica/request-http', version: '1.3.0', files: types('../../api-http/dist/') },
  { name: '@punica/request-middleware', version: '2.7.0', files: types('../../middleware/dist/') }
];
const guide = readFileSync(new URL('../src/guide.md', import.meta.url), 'utf8');

async function connect(given = packages) {
  const server = createPunicaRequestServer({ packages: given, guide });
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

  assert.deepEqual(tools.map((tool) => tool.name).sort(), ['get_api', 'get_guide', 'search_api', 'validate_code']);
  assert.match(client.getInstructions(), /never write an import/);
});

test('search_api lists exactly the public exports', async () => {
  const { call } = await connect();
  const all = await call('search_api');

  for (const [name, kind, pkg] of [
    ['RequestAPI', 'class', '@punica/request'],
    ['BaseMiddleware', 'class', '@punica/request'],
    ['IConfig', 'interface', '@punica/request'],
    ['APIFetch', 'class', '@punica/request-fetch'],
    ['APIHttp', 'class', '@punica/request-http'],
    ['CacheMiddleware', 'class', '@punica/request-middleware'],
    ['StorageIndexedDB', 'class', '@punica/request-middleware'],
    ['IStorage', 'interface', '@punica/request-middleware']
  ]) {
    assert.match(all, new RegExp(`^${name} \\(${kind}, ${pkg.replace('/', '\\/')}\\)`, 'm'));
  }

  // Declared in the packages but not exported from them
  for (const name of ['OperationDatabase', 'getOperation', 'Singleton']) {
    assert.doesNotMatch(all, new RegExp(`^${name} \\(`, 'm'));
  }

  assert.match(await call('search_api', { query: 'cookie middleware' }), /^CookieMiddleware \(class/m);
  // The first line of the documentation, without the stars of its comment
  assert.match(all, /^APIFetch \(class, @punica\/request-fetch\): APIFetch class implements/m);
  assert.match(await call('search_api', { query: 'no-such-thing' }), /Nothing matches/);
});

test('get_api returns the declaration with its documentation', async () => {
  const { call } = await connect();
  const api = await call('get_api', { names: ['RequestAPI', 'IConfig', 'APIXHR'] });

  assert.match(api, /## RequestAPI \(class, @punica\/request\)/);
  assert.match(api, /patch<T = /);
  assert.match(api, /hostname: string;/);
  assert.match(api, /responseMiddlewares\?: /);
  assert.match(api, /APIXHR is not exported by/);
});

test('validate_code finds the mistakes of the old documentation', async () => {
  const { call } = await connect();
  const report = await call('validate_code', {
    code: [
      'import { RequestAPI, APIXHR, CacheMiddleware, ContentType } from "@punica/request";',
      'import { SessionStorage } from "@punica/request/storage";',
      'import { AuthMiddleware } from "@punica/request-middleware";',
      'const config = {',
      '  hostname: "https://api.example.com",',
      '  requestMiddlewares: [new RefreshTokenMiddleware({ tokenProvider })],',
      '  responseMiddlewares: [new ErrorMiddleware({ 400: handler }), new CacheMiddleware<Item>({ storage })]',
      '};',
      'await api.get({ path: "items", contentType: ContentType.JSON, cache: true });',
      'await api.post({ path: "items", contentType: "application/json" });',
      'const data = new ProcessData();'
    ].join('\n')
  });

  assert.match(report, /^13 problems:/);
  assert.match(report, /line 1 unknown-export: @punica\/request does not export APIXHR\. \[fix: there is no XHR adapter/);
  assert.match(report, /line 1 unknown-export: @punica\/request does not export CacheMiddleware\. \[fix: import it from "@punica\/request-middleware"\]/);
  assert.match(report, /line 2 unknown-package: There is no @punica\/request\/storage\./);
  assert.match(report, /line 3 unknown-export: .* AuthMiddleware\. \[fix: TokenAuthMiddleware/);
  assert.match(report, /line 5 url: hostname and path are joined/);
  assert.match(report, /line 6 middleware-list: RefreshTokenMiddleware does not work in requestMiddlewares/);
  assert.match(report, /line 7 error-middleware: /);
  assert.match(report, /line 7 generic: CacheMiddleware takes no type argument/);
  assert.match(report, /line 7 middleware-list: CacheMiddleware does not work in responseMiddlewares/);
  assert.match(report, /line 9 content-type: ContentType is a type, not a value/);
  assert.match(report, /line 9 cache: cache is an object/);
  assert.match(report, /line 10 content-type: contentType is not a MIME type/);
  assert.match(report, /line 11 type-as-value: ProcessData is a type/);
});

test('validate_code tells the order of the response middlewares', async () => {
  const { call } = await connect();

  assert.match(
    await call('validate_code', {
      code: 'const c = { responseMiddlewares: [new ErrorMiddleware({ contentType: "json", error: {} }), new RefreshTokenMiddleware({ tokenProvider })] };'
    }),
    /line 1 middleware-order: .*\[fix: put RefreshTokenMiddleware before ErrorMiddleware\]/
  );
});

test('validate_code accepts correct code, the example of the guide included', async () => {
  const { call } = await connect();
  const examples = [...guide.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]);

  assert.ok(examples.length >= 3);

  for (const code of examples) {
    assert.match(await call('validate_code', { code }), /^No problems/, code);
  }

  assert.match(
    await call('validate_code', {
      code: [
        'import { RequestAPI, type IConfig, type ProcessData } from "@punica/request";',
        'import { APIFetch } from "@punica/request-fetch";',
        'const api = new RequestAPI(new APIFetch(), { hostname: "https://api.example.com/" });',
        'await api.get({ path: "items", contentType: "json", cache: { expireTime: 1000 } });'
      ].join('\n')
    }),
    /^No problems/
  );
});

test('a project on an older version is not steered into the current API', async () => {
  const old = packages.map((pkg) => ({ ...pkg, version: '2.0.0', installed: true }));
  const { client, call } = await connect(old);

  assert.match(client.getInstructions(), /older than the API this server's guide describes/);
  assert.match(await call('get_guide'), /^This project has @punica\/request 2\.0\.0 installed/);
  // Its own configuration is not reported
  assert.match(
    await call('validate_code', { code: 'const config = { request: { hostname: "https://x" }, middleware: { request: [] } };' }),
    /^No problems/
  );
});

test('the guide and the resources', async () => {
  const { client, call } = await connect();

  assert.match(await call('get_guide'), /A response that is not 2xx resolves/);

  const { resources } = await client.listResources();
  assert.ok(resources.some((resource) => resource.uri === 'punica-request://api/RequestAPI'));

  const { contents } = await client.readResource({ uri: 'punica-request://api/CacheMiddleware' });
  assert.match(contents[0].text, /## CacheMiddleware \(class/);
});

test('loadPackage reads the installed package, or the bundled copy', () => {
  const installed = loadPackage('@punica/request', process.cwd());

  assert.equal(installed.installed, true);
  assert.ok(installed.files.has('index.d.ts'));

  const bundled = loadPackage('@punica/request', '/');

  assert.equal(bundled.installed, false);
  assert.ok(bundled.files.has('index.d.ts'));
});
