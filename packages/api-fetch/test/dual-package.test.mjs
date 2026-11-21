// The packages load as ES modules and as CommonJS, and a request goes
// through either build. Runs against dist: build first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const builds = {
  esm: {
    core: await import('@punica/request'),
    fetch: await import('@punica/request-fetch')
  },
  cjs: {
    core: require('@punica/request'),
    fetch: require('@punica/request-fetch')
  }
};

for (const [name, { core, fetch: adapter }] of Object.entries(builds)) {
  test(`${name}: a request is sent with fetch and its payload is read`, async (t) => {
    const calls = [];

    t.mock.method(globalThis, 'fetch', async (url, init) => {
      calls.push([url, init.method]);

      return new Response(JSON.stringify({ id: 7 }), { status: 200 });
    });

    const api = new core.RequestAPI(new adapter.APIFetch(), {
      hostname: 'https://api.example.com/'
    });
    const response = await api.get({
      path: 'items',
      query: { page: '2' },
      contentType: 'json'
    });

    assert.deepEqual(calls, [['https://api.example.com/items?page=2', 'GET']]);
    assert.equal(response.status, 200);
    assert.deepEqual(response.payload, { id: 7 });
  });
}

test('both builds export the same names', () => {
  assert.deepEqual(
    Object.keys(builds.esm.core)
      .filter((key) => key !== 'default')
      .sort(),
    Object.keys(builds.cjs.core).sort()
  );
});
