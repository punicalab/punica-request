import { createClient } from '..';
import { recorder } from './support';

const urlOf = async (
  baseURL: string | undefined,
  path: string,
  query?: any
): Promise<string> => {
  const { adapter, sent } = recorder();

  await createClient({ baseURL, adapter }).get(path, { query });

  return sent[0].url;
};

describe('the address of a request', () => {
  it.each([
    ['https://api.example.com/v1', 'items'],
    ['https://api.example.com/v1/', 'items'],
    ['https://api.example.com/v1', '/items'],
    ['https://api.example.com/v1/', '/items'],
    ['https://api.example.com/v1', '//items']
  ])('joins %s and %s whatever their slashes', async (base, path) => {
    expect(await urlOf(base, path)).toBe('https://api.example.com/v1/items');
  });

  it.each([
    ['items:batch', '/v1/items:batch'],
    ['/users:search?q=1', '/v1/users:search?q=1'],
    ['urn:isbn:1', '/v1/urn:isbn:1'],
    ['a/b:c', '/v1/a/b:c'],
    ['javascript:alert(1)', '/v1/javascript:alert(1)'],
    ['?page=2', '/v1/?page=2']
  ])(
    'reads %s as a path under the base, colons included',
    async (path, expected) => {
      const url = new URL(await urlOf('https://api.example.com/v1', path));

      expect(url.origin).toBe('https://api.example.com');
      expect(url.pathname + url.search).toBe(expected);
    }
  );

  it('takes a whole address that is under the base', async () => {
    expect(
      await urlOf(
        'https://api.example.com/v1',
        'https://api.example.com/v1/items'
      )
    ).toBe('https://api.example.com/v1/items');
  });

  it('keeps the port, deeper paths and the query a path brings', async () => {
    expect(await urlOf('http://localhost:3000/api', 'a/b?x=1', { y: 2 })).toBe(
      'http://localhost:3000/api/a/b?x=1&y=2'
    );
  });

  it('is the base itself for an empty path', async () => {
    expect(await urlOf('https://api.example.com/v1', '')).toBe(
      'https://api.example.com/v1/'
    );
  });

  it.each([
    'https://evil.example/steal',
    'HTTPS://evil.example/steal',
    'http://api.example.com/v1/items',
    'https://api.example.com/v2/items',
    'https://user:secret@api.example.com/v1/items',
    '../admin',
    'items/../../admin',
    '/..\\admin'
  ])('refuses %s, which leads away from the base', async (path) => {
    const { adapter, sent } = recorder();
    const api = createClient({
      baseURL: 'https://api.example.com/v1',
      adapter
    });

    await expect(api.get(path)).rejects.toThrow(/leads away from the baseURL/);
    expect(sent).toHaveLength(0);
  });

  it.each([
    '//evil.example/steal',
    '/\\evil.example/steal',
    '\\\\evil.example/steal',
    '\t//evil.example/steal',
    ' https://evil.example/steal',
    'https:/evil.example/steal'
  ])(
    'reads %j as a path under the base, not as another server',
    async (path) => {
      const url = new URL(await urlOf('https://api.example.com/v1', path));

      expect(url.origin).toBe('https://api.example.com');
      expect(url.pathname.startsWith('/v1/')).toBe(true);
    }
  );

  it.each(['https://api.example.com/v1', '../v1', ''])(
    'takes %j, which is the base itself',
    async (path) => {
      expect(await urlOf('https://api.example.com/v1', path)).toMatch(
        /^https:\/\/api\.example\.com\/v1\/?$/
      );
    }
  );

  it.each(['file:///etc/passwd', 'data:text/plain,hi', 'items:batch'])(
    'refuses %s when there is no base: it is no http(s) address',
    async (path) => {
      const { adapter, sent } = recorder();

      await expect(createClient({ adapter }).get(path)).rejects.toThrow(
        /not a whole http\(s\) address/
      );
      expect(sent).toHaveLength(0);
    }
  );

  it('keeps the credentials of the base', async () => {
    expect(await urlOf('http://user:pw@host.example/api', 'items')).toBe(
      'http://user:pw@host.example/api/items'
    );
  });

  it('takes a whole address when the client has no base', async () => {
    expect(await urlOf(undefined, 'https://other.example/x', { a: 1 })).toBe(
      'https://other.example/x?a=1'
    );
  });

  it('refuses a path that is no address when there is no base and no page', async () => {
    const { adapter } = recorder();

    await expect(createClient({ adapter }).get('/items')).rejects.toThrow(
      /not a whole http\(s\) address/
    );
  });

  it('refuses a path that is not a string, as 2.x took an object', async () => {
    const { adapter } = recorder();
    const api = createClient({ baseURL: 'https://api.example.com', adapter });

    await expect(api.get({ path: 'items' } as any)).rejects.toThrow(
      /path of a request is a string/
    );
  });
});

describe('baseURL', () => {
  const { adapter } = recorder();

  it('that is relative is refused where there is no page', () => {
    expect(() => createClient({ baseURL: '/api', adapter })).toThrow(
      /is relative and there is no page/
    );
  });

  it('that is relative is resolved against the page', async () => {
    (globalThis as any).document = { baseURI: 'https://app.example.com/shop/' };

    try {
      expect(await urlOf('/api', 'items')).toBe(
        'https://app.example.com/api/items'
      );
      expect(await urlOf(undefined, 'items')).toBe(
        'https://app.example.com/shop/items'
      );
    } finally {
      delete (globalThis as any).document;
    }
  });

  it.each(['ftp://files.example.com', 'mailto:a@example.com'])(
    'refuses %s',
    (baseURL) => {
      expect(() => createClient({ baseURL, adapter })).toThrow(
        /not an http\(s\) address/
      );
    }
  );

  it('refuses a query or a fragment', () => {
    expect(() =>
      createClient({ baseURL: 'https://api.example.com/v1?key=1', adapter })
    ).toThrow(/query or a fragment/);
  });

  it('may be a URL', async () => {
    const { adapter: own, sent } = recorder();

    await createClient({
      baseURL: new URL('https://api.example.com/v2'),
      adapter: own
    }).get('items');

    expect(sent[0].url).toBe('https://api.example.com/v2/items');
  });
});

describe('query', () => {
  const base = 'https://api.example.com';

  it('leaves out null and undefined', async () => {
    expect(
      await urlOf(base, 'items', {
        a: null,
        b: undefined,
        c: 0,
        d: false,
        e: ''
      })
    ).toBe('https://api.example.com/items?c=0&d=false&e=');
  });

  it('repeats the name for an array, leaving out its empty values', async () => {
    expect(
      await urlOf(base, 'items', { tags: ['a', null, 'b'], none: [] })
    ).toBe('https://api.example.com/items?tags=a&tags=b');
  });

  it('encodes names and values', async () => {
    expect(await urlOf(base, 'items', { 'a b': 'ç&=' })).toBe(
      'https://api.example.com/items?a+b=%C3%A7%26%3D'
    );
  });

  it('writes a date as ISO text', async () => {
    expect(
      await urlOf(base, 'items', { since: new Date('2026-01-02T03:04:05Z') })
    ).toBe('https://api.example.com/items?since=2026-01-02T03%3A04%3A05.000Z');
  });

  it('takes URLSearchParams', async () => {
    expect(
      await urlOf(
        base,
        'items',
        new URLSearchParams([
          ['a', '1'],
          ['a', '2']
        ])
      )
    ).toBe('https://api.example.com/items?a=1&a=2');
  });
});
