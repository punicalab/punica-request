// Checks code that uses Punica Request for the mistakes found in its own
// documentation and in what models write: names the packages do not export,
// options that do not exist and middlewares in the list they cannot work in.

const lineOf = (code, index) => code.slice(0, index).split('\n').length;

const PREFIX = '@punica/request';

/** Names that never existed or were removed, and what to write instead. */
const RENAMED = {
  APIXHR: 'there is no XHR adapter: APIFetch from "@punica/request-fetch", or APIHttp from "@punica/request-http" for Node',
  APIHTTP: 'APIHttp from "@punica/request-http"',
  IAdapter: 'IRequest from "@punica/request" is the interface of an adapter',
  CacheResponseMiddleware: 'CacheMiddleware from "@punica/request-middleware", in requestMiddlewares',
  AuthMiddleware: 'TokenAuthMiddleware from "@punica/request-middleware"',
  SessionStorage: 'StorageSession from "@punica/request-middleware"',
  IndexedDBStorage: 'StorageIndexedDB from "@punica/request-middleware"',
  ProxyRequestMiddleware: 'CacheMiddleware from "@punica/request-middleware", in requestMiddlewares',
  ProxyResponseMiddleware: 'CacheMiddleware from "@punica/request-middleware", in requestMiddlewares',
  getUrlParam: 'it was removed: give the query to the request as `query`',
  StatusCodes: 'StatusCode from "@punica/request"',
  TokenProvider: 'it is not exported: an object with refreshToken(): Promise<boolean>'
};

/** The list a middleware of the package works in. */
const LISTS = {
  TokenAuthMiddleware: 'requestMiddlewares',
  CookieMiddleware: 'requestMiddlewares',
  CancelRequestMiddleware: 'requestMiddlewares',
  CacheMiddleware: 'requestMiddlewares',
  RefreshTokenMiddleware: 'responseMiddlewares',
  ErrorMiddleware: 'responseMiddlewares'
};

const WHY = {
  TokenAuthMiddleware: 'it sets a header of the request',
  CookieMiddleware: 'it sets a header of the request',
  CancelRequestMiddleware: 'it gives the request its signal before it is sent',
  CacheMiddleware: 'it answers from the cache before the request is sent; in responseMiddlewares it never caches',
  RefreshTokenMiddleware: 'it reads the status of the response, which a request middleware does not have',
  ErrorMiddleware: 'it reads the status of the response'
};

/** Calls and options that do not exist, with what to write instead. */
const RULES = [
  {
    rule: 'content-type',
    pattern: /\bContentType\.[A-Za-z_]+/g,
    message: 'ContentType is a type, not a value.',
    fix: () => `contentType: 'json' (or 'text', 'blob', 'arrayBuffer', 'formData')`
  },
  {
    rule: 'content-type',
    pattern: /\bcontentType\s*:\s*['"`][\w.+-]+\/[\w.+-]+['"`]/g,
    message: 'contentType is not a MIME type: it names how the body of the response is read.',
    fix: () => `contentType: 'json' (or 'text', 'blob', 'arrayBuffer', 'formData'); a Content-Type header goes into init.headers`
  },
  {
    rule: 'cache',
    pattern: /\bcache\s*:\s*true\b/g,
    message: 'cache is an object.',
    fix: () => 'cache: {} or cache: { expireTime: 60_000 } (milliseconds)'
  },
  {
    rule: 'type-as-value',
    pattern: /\bnew\s+(ProcessData|HttpResponse|RequestParams)\s*[(<]/g,
    message: (match) => `${match[1]} is a type; there is nothing to construct.`,
    fix: () => 'a middleware receives the ProcessData of a request in process(processData)'
  },
  {
    rule: 'config',
    pattern: /\b(?:request\s*:\s*\{\s*hostname|middleware\s*:\s*\{\s*(?:request|response)\s*:)/g,
    message: 'This is the configuration of versions before 2.4.',
    fix: () => '{ hostname, requestInit, requestMiddlewares: [...], responseMiddlewares: [...] }'
  },
  {
    rule: 'error-middleware',
    pattern: /new\s+ErrorMiddleware\s*\(\s*\{\s*\d{3}\s*:/g,
    message: 'The handlers of ErrorMiddleware go under `error`, next to the content type the error is read as.',
    fix: () => `new ErrorMiddleware({ contentType: 'json', error: { 401: async (processData) => { … } } })`
  },
  {
    rule: 'removed',
    pattern: /\.readResponse\s*\(/g,
    message: 'readResponse is not part of the API.',
    fix: () => `give the request a contentType and read response.payload`
  },
  {
    rule: 'generic',
    pattern: /new\s+(CacheMiddleware|TokenAuthMiddleware|ErrorMiddleware|CookieMiddleware)\s*</g,
    message: (match) => `${match[1]} takes no type argument.`,
    fix: (match) => `new ${match[1]}({ … }); the types of a request are api.get<Sent, Received>(…)`
  }
];

/** The text between the bracket at `open` and the one that closes it. */
function listAt(code, open) {
  let depth = 0;

  for (let i = open; i < code.length; i++) {
    if (code[i] === '[') depth++;
    if (code[i] === ']' && --depth === 0) return code.slice(open + 1, i);
  }

  return code.slice(open + 1);
}

/** Whether the installed core is from before the flat configuration (2.4). */
export function isLegacy(knowledge) {
  const core = knowledge.packages.find((pkg) => pkg.name === PREFIX);
  const [major, minor] = String(core?.version ?? '').split('.').map(Number);

  return Boolean(core) && (major < 2 || (major === 2 && minor < 4));
}

/** @param {ReturnType<typeof import('./knowledge.mjs').createKnowledge>} knowledge */
export function createValidator(knowledge) {
  const packageNames = knowledge.packages.map((pkg) => pkg.name);
  // An older installation has another API; only its imports are checked
  const legacy = isLegacy(knowledge);

  /**
   * @param {string} code
   * @returns {Array<{ line: number, rule: string, message: string, fix: string }>}
   */
  function validate(code) {
    const findings = [];
    const add = (index, rule, message, fix) =>
      findings.push({ line: lineOf(code, index), rule, message, fix });

    for (const match of code.matchAll(
      /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g
    )) {
      const source = match[2];

      if (!source.startsWith(PREFIX)) continue;

      if (!packageNames.includes(source)) {
        add(
          match.index,
          'unknown-package',
          `There is no ${source}.`,
          `the packages are ${packageNames.join(', ')}; a package has one entry point`
        );
        continue;
      }

      for (const part of match[1].split(',')) {
        const name = part.replace(/^\s*type\s+/, '').trim().split(/\s+as\s+/)[0];
        const item = knowledge.get(name);

        if (!name || item?.package === source) continue;

        add(
          match.index,
          'unknown-export',
          `${source} does not export ${name}.`,
          item
            ? `import it from "${item.package}"`
            : (RENAMED[name] ?? 'look the name up with search_api')
        );
      }
    }

    if (legacy) return findings.sort((a, b) => a.line - b.line);

    for (const { rule, pattern, message, fix } of RULES) {
      for (const match of code.matchAll(pattern)) {
        add(match.index, rule, typeof message === 'string' ? message : message(match), fix(match));
      }
    }

    // A middleware in the list it cannot work in
    for (const match of code.matchAll(/\b(requestMiddlewares|responseMiddlewares)\s*:\s*\[/g)) {
      const list = listAt(code, match.index + match[0].length - 1);
      const names = [...list.matchAll(/new\s+(\w+)/g)].map((found) => found[1]);

      for (const name of names) {
        if (LISTS[name] && LISTS[name] !== match[1]) {
          add(
            match.index,
            'middleware-list',
            `${name} does not work in ${match[1]}: ${WHY[name]}.`,
            `move it to ${LISTS[name]}`
          );
        }
      }

      if (
        match[1] === 'responseMiddlewares' &&
        names.includes('ErrorMiddleware') &&
        names.indexOf('RefreshTokenMiddleware') > names.indexOf('ErrorMiddleware')
      ) {
        add(
          match.index,
          'middleware-order',
          'ErrorMiddleware rejects a 401 before RefreshTokenMiddleware sees it.',
          'put RefreshTokenMiddleware before ErrorMiddleware'
        );
      }
    }

    // hostname and path are joined as they are
    const hostname = /\bhostname\s*:\s*(['"`])([^'"`]*[^/'"`])\1/.exec(code);
    const path = /\bpath\s*:\s*(['"`])(?!\/)[\w${]/.exec(code);

    if (hostname && path) {
      add(
        hostname.index,
        'url',
        `hostname and path are joined with nothing between them: "${hostname[2]}" and a path without a leading slash give a wrong address.`,
        'end hostname with a slash, or start every path with one'
      );
    }

    return findings.sort((a, b) => a.line - b.line);
  }

  return { validate };
}
