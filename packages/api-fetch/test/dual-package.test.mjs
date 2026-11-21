// The packages load as ES modules and as CommonJS, a request goes through
// either build, and the errors of one build are recognised by the other.
// Runs against dist: build first.
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

const answer = (t, status, data) =>
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json' }
      })
  );

for (const [name, { core, fetch: adapter }] of Object.entries(builds)) {
  test(`${name}: a request is sent with fetch and its body is read`, async (t) => {
    const mock = answer(t, 200, { id: 7 });
    const api = core.createClient({
      baseURL: 'https://api.example.com/v1',
      adapter: adapter.fetchAdapter()
    });
    const response = await api.get('items', { query: { page: 2 } });

    assert.equal(
      mock.mock.calls[0].arguments[0],
      'https://api.example.com/v1/items?page=2'
    );
    assert.equal(mock.mock.calls[0].arguments[1].method, 'GET');
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { id: 7 });
  });
}

test('the two builds are two copies of the package', () => {
  assert.notEqual(builds.esm.core.HttpError, builds.cjs.core.HttpError);
});

for (const [from, to] of [
  ['cjs', 'esm'],
  ['esm', 'cjs']
]) {
  test(`an HttpError of the ${from} build is recognised by the ${to} build`, async (t) => {
    answer(t, 404, { message: 'Not here' });

    const api = builds[from].core.createClient({
      baseURL: 'https://api.example.com',
      adapter: builds[from].fetch.fetchAdapter()
    });
    const error = await api.get('items/9').catch((e) => e);

    assert.equal(error instanceof builds[to].core.HttpError, false);
    assert.equal(builds[to].core.isHttpError(error), true);
    assert.equal(builds[to].core.isRequestError(error), false);
    assert.equal(error.status, 404);
  });

  test(`a RequestError of the ${from} build is recognised by the ${to} build`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
      throw new TypeError('fetch failed');
    });

    const api = builds[from].core.createClient({
      baseURL: 'https://api.example.com',
      adapter: builds[from].fetch.fetchAdapter()
    });
    const error = await api.get('items').catch((e) => e);

    assert.equal(builds[to].core.isRequestError(error), true);
    assert.equal(error.reason, 'network');
  });
}

test('both builds export the same names', () => {
  for (const name of ['core', 'fetch']) {
    assert.deepEqual(
      Object.keys(builds.esm[name])
        .filter((key) => key !== 'default')
        .sort(),
      Object.keys(builds.cjs[name]).sort()
    );
  }
});
