// Checks code that uses Punica Request for the mistakes models make: names
// the packages do not export, the API of 2.x written against 3.x, and the
// few rules 3.x has (the order of the middlewares, json or body).

const lineOf = (code, index) => code.slice(0, index).split('\n').length;

const PREFIX = '@punica/request';

/** Names that were removed or never existed, and what to write instead. */
const RENAMED = {
  RequestAPI:
    'createClient({ adapter, baseURL, middlewares }) from "@punica/request"',
  APIFetch: 'fetchAdapter() from "@punica/request-fetch"',
  APIHttp: 'httpAdapter() from "@punica/request-http"',
  APIHTTP: 'httpAdapter() from "@punica/request-http"',
  APIXHR:
    'there is no XHR adapter: fetchAdapter() from "@punica/request-fetch"',
  IAdapter: 'Adapter from "@punica/request": (context) => Promise<Response>',
  IRequest: 'Adapter from "@punica/request": (context) => Promise<Response>',
  IConfig: 'ClientConfig from "@punica/request"',
  RequestParams: 'RequestOptions from "@punica/request"',
  ProcessData:
    'RequestContext from "@punica/request": a middleware is (context, next) => Promise<HttpResponse>',
  BaseMiddleware:
    'Middleware from "@punica/request", a function: (context, next) => Promise<HttpResponse>',
  IMiddleware:
    'Middleware from "@punica/request", a function: (context, next) => Promise<HttpResponse>',
  MiddlewareConfig:
    'it was removed: limit a middleware to some requests with when(predicate, middleware)',
  MiddlewareActivityConfig:
    'it was removed: limit a middleware to some requests with when(predicate, middleware)',
  ContentType:
    'ResponseType from "@punica/request"; a response is read by its Content-Type without it',
  RequestMethods: 'HttpMethod from "@punica/request"',
  Notifier:
    'it was removed: the code after `const response = await next()` sees the response',
  Subscriber:
    'it was removed: the code after `const response = await next()` sees the response',
  isHttpStatusOk:
    'response.ok; a response outside 2xx rejects with an HttpError, see isHttpError',
  mergeConfig: 'it was removed: the client merges headers and init itself',
  cleanNulls: 'it was removed: query leaves out null and undefined itself',
  TokenAuthMiddleware:
    'tokenAuth({ cookieName }) from "@punica/request-middleware"',
  AuthMiddleware: 'tokenAuth({ cookieName }) from "@punica/request-middleware"',
  CookieMiddleware:
    'cookie({ cookieName, headerName }) from "@punica/request-middleware"',
  CacheMiddleware: 'cache({ storage }) from "@punica/request-middleware"',
  CacheResponseMiddleware:
    'cache({ storage }) from "@punica/request-middleware"',
  ProxyRequestMiddleware:
    'cache({ storage }) from "@punica/request-middleware"',
  ProxyResponseMiddleware:
    'cache({ storage }) from "@punica/request-middleware"',
  CancelRequestMiddleware: 'cancel() from "@punica/request-middleware"',
  RefreshTokenMiddleware:
    'refreshToken({ refresh }) from "@punica/request-middleware"',
  ErrorMiddleware:
    'onError({ 401: handler }) from "@punica/request-middleware"',
  TokenProvider: 'it was removed: refreshToken({ refresh }) takes a function',
  SessionStorage: 'StorageSession from "@punica/request-middleware"',
  IndexedDBStorage: 'StorageIndexedDB from "@punica/request-middleware"',
  getUrlParam: 'it was removed: give the query to the request as `query`',
  StatusCodes: 'StatusCode from "@punica/request"',
  retry:
    'there is no retry middleware: write one, a middleware may call next() again'
};

/** The API of 2.x, and what 3.x has instead. */
const LEGACY_RULES = [
  {
    pattern: /\bnew\s+RequestAPI\s*\(/g,
    message: 'RequestAPI is the client of 2.x.',
    fix: () =>
      'createClient({ adapter: fetchAdapter(), baseURL, headers, middlewares })'
  },
  {
    pattern: /\bnew\s+API(Fetch|Http|HTTP)\s*\(/g,
    message: (match) => `API${match[1]} is the adapter class of 2.x.`,
    fix: (match) => (match[1] === 'Fetch' ? 'fetchAdapter()' : 'httpAdapter()')
  },
  {
    pattern:
      /\bnew\s+(TokenAuth|Cookie|Cache|CancelRequest|RefreshToken|Error)Middleware\s*(?:<[^>]*>)?\s*\(/g,
    message: (match) =>
      `${match[1]}Middleware is a class of 2.x; middlewares are made by functions.`,
    fix: (match) =>
      ({
        TokenAuth: 'tokenAuth({ cookieName }) or tokenAuth({ getToken })',
        Cookie: 'cookie({ cookieName, headerName })',
        Cache: 'cache({ storage })',
        CancelRequest:
          'cancel(); a timeout is an option of the client or of a request',
        RefreshToken:
          'refreshToken({ refresh: () => provider.refreshToken(), exclude })',
        Error: 'onError({ 401: (response, context) => { … } })'
      })[match[1]]
  },
  {
    pattern: /\b(requestMiddlewares|responseMiddlewares)\b/g,
    message: (match) => `${match[1]} is one of the two lists of 2.x.`,
    fix: () =>
      'one list, `middlewares`, outermost first: onError, refreshToken, tokenAuth / cookie, cache, cancel'
  },
  {
    pattern: /\bhostname\s*:/g,
    when: (code) => /\b(?:createClient|RequestAPI)\b/.test(code),
    message: 'hostname is the option of 2.x.',
    fix: () => 'baseURL; it is joined with the path whatever their slashes'
  },
  {
    pattern: /\brequestInit\s*:/g,
    message: 'requestInit is the option of 2.x.',
    fix: () =>
      '`headers` for the headers, `init` for the rest (credentials, mode, …)'
  },
  {
    pattern:
      /\.(?:get|post|put|patch|delete)\s*(?:<[^()]*>)?\s*\(\s*\{\s*path\s*:/g,
    message: 'The path is not an option any more.',
    fix: () => `the path is the first argument: api.get('items', { query })`
  },
  {
    pattern: /\.(?:get|post|put|patch|delete)\s*<[^<>()]*,[^<>()]*>\s*\(/g,
    message: 'A request has one type argument, the type of the data it brings.',
    fix: () => 'api.post<Received>(path, { json })'
  },
  {
    pattern: /\bcontentType\s*:/g,
    message: 'contentType is the option of 2.x.',
    fix: () =>
      `leave it out: a response is read by its Content-Type. responseType ('json', 'text', 'blob', 'arrayBuffer', 'formData', 'stream') decides when it has to`
  },
  {
    pattern: /\bdata\s*:\s*JSON\.stringify\s*\(/g,
    message: 'data is the option of 2.x, and a body is not serialised by hand.',
    fix: () => 'json: value'
  },
  {
    pattern:
      /\b(?:response|res|result|httpResponse)\.payload\b|\{\s*payload\b[^}]*\}\s*=\s*await\b/g,
    message: 'payload is the body of a response in 2.x.',
    fix: () => 'response.data'
  },
  {
    pattern: /\bisHttpStatusOk\s*\(/g,
    message: 'isHttpStatusOk was removed: a response outside 2xx rejects.',
    fix: () =>
      'catch the HttpError (isHttpError(error)), or pass throwHttpErrors: false and read response.ok'
  },
  {
    pattern: /\bextends\s+BaseMiddleware\b/g,
    message: 'BaseMiddleware is the middleware class of 2.x.',
    fix: () =>
      'a function: const mine: Middleware = async (context, next) => { …; return next(); }'
  },
  {
    pattern: /\bthis\.next\s*\(/g,
    message: 'this.next(processData) continues a request in 2.x.',
    fix: () => 'return next()'
  },
  {
    pattern: /\bthis\.restart\s*\(/g,
    message: 'restart sends a request again in 2.x.',
    fix: () => 'call next() once more: return next()'
  },
  {
    pattern: /\bprocessData\.(resolve|reject)\s*\(/g,
    message: (match) => `processData.${match[1]} ends a request in 2.x.`,
    fix: (match) =>
      match[1] === 'resolve' ? 'return the response' : 'throw the error'
  },
  {
    pattern: /\.httpResponse\b|\bnotifier\.addSubscriber\s*\(/g,
    message: 'A middleware of 2.x gets the response through processData.',
    fix: () =>
      'const response = await next(); the code after it sees the response'
  },
  {
    pattern: /\bparams\.init\.headers\b/g,
    message: 'The headers of a request are not in params.init any more.',
    fix: () => 'context.headers.set(name, value)'
  },
  {
    pattern: /\b(?:getActive|getAvailableMethods|availableMethods)\b/g,
    message: 'A middleware of 3.x has no switch of its own.',
    fix: () => `when((context) => context.method === 'GET', middleware)`
  },
  {
    pattern: /\bexpireTime\b/g,
    message: 'expireTime is the option of 2.x.',
    fix: () =>
      'cache: { ttl: 60_000 }; in a storage of your own, entry.expiresAt'
  },
  {
    pattern: /\bcancelAllRequests\s*\(/g,
    message: 'cancelAllRequests is the method of 2.x.',
    fix: () => 'const latest = cancel(); latest.cancelAll()'
  },
  {
    pattern: /\btokenProvider\s*:/g,
    when: (code) => /\brefreshToken\s*\(/.test(code),
    message: 'refreshToken takes a function, not a provider.',
    fix: () => 'refreshToken({ refresh: () => tokenProvider.refreshToken() })'
  },
  {
    pattern: /\bonError\s*\(\s*\{\s*(?:contentType|error)\s*:/g,
    message: 'onError takes the handlers themselves.',
    fix: () => 'onError({ 401: (response, context) => { … }, default: … })'
  }
];

/** The text between the bracket at `open` and the one that closes it. */
function enclosed(code, open) {
  const pairs = { '[': ']', '(': ')', '{': '}' };
  const close = pairs[code[open]];
  let depth = 0;

  for (let i = open; i < code.length; i++) {
    if (code[i] === code[open]) depth++;
    if (code[i] === close && --depth === 0) return code.slice(open + 1, i);
  }

  return code.slice(open + 1);
}

/** Whether the installed core is 2.x or older, which has another API. */
export function isLegacy(knowledge) {
  const core = knowledge.packages.find((pkg) => pkg.name === PREFIX);
  const major = Number(String(core?.version ?? '').split('.')[0]);

  return Boolean(core) && major < 3;
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

      // A list may hold comments
      const list = match[1].replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

      for (const part of list.split(',')) {
        const name = part
          .replace(/^\s*type\s+/, '')
          .trim()
          .split(/\s+as\s+/)[0];
        const item = knowledge.get(name);

        if (!name || item?.package === source) continue;

        add(
          match.index,
          'unknown-export',
          `${source} does not export ${name}.`,
          item
            ? `import it from "${item.package}"`
            : legacy
              ? 'look the name up with search_api'
              : (RENAMED[name] ?? 'look the name up with search_api')
        );
      }
    }

    if (legacy) return findings.sort((a, b) => a.line - b.line);

    for (const { pattern, when, message, fix } of LEGACY_RULES) {
      if (when && !when(code)) continue;

      for (const match of code.matchAll(pattern)) {
        add(
          match.index,
          'v2',
          typeof message === 'string' ? message : message(match),
          fix(match)
        );
      }
    }

    // The order of the middlewares
    for (const match of code.matchAll(/\bmiddlewares\s*:\s*\[/g)) {
      const list = enclosed(code, match.index + match[0].length - 1);
      const position = (name) => {
        const found = new RegExp(`\\b${name}\\s*\\(`).exec(list);

        return found ? found.index : -1;
      };
      const [error, refresh] = [position('onError'), position('refreshToken')];
      const auth = [position('tokenAuth'), position('cookie')].filter(
        (at) => at >= 0
      );

      if (error >= 0 && refresh >= 0 && error > refresh) {
        add(
          match.index,
          'middleware-order',
          'onError after refreshToken sees the 401 before the token is refreshed, and reacts to requests that then succeed.',
          'put onError before refreshToken: the first in the list is the outermost'
        );
      }

      if (refresh >= 0 && auth.some((at) => at < refresh)) {
        add(
          match.index,
          'middleware-order',
          'refreshToken after tokenAuth / cookie sends the request again with the old token: the request does not pass them a second time.',
          'put refreshToken before tokenAuth and cookie'
        );
      }
    }

    // json and body in one request
    for (const match of code.matchAll(
      /\.(?:post|put|patch|delete|request)\s*(?:<[^()]*>)?\s*\(/g
    )) {
      const call = enclosed(code, match.index + match[0].length - 1);

      if (/\bjson\s*:/.test(call) && /\bbody\s*:/.test(call)) {
        add(
          match.index,
          'body',
          'A request has json or body, not both.',
          'json for a value that is sent as JSON, body for anything else'
        );
      }

      if (/\b(?:json|body)\s*:\s*JSON\.stringify\s*\(/.test(call)) {
        add(
          match.index,
          'body',
          'A body is not serialised by hand: json does it.',
          'json: value'
        );
      }
    }

    // A Content-Type for every request
    for (const match of code.matchAll(/\bcreateClient\s*\(/g)) {
      const config = enclosed(code, match.index + match[0].length - 1);
      // The headers of the client itself, not those a middleware sets
      const list = /\bmiddlewares\s*:\s*\[/.exec(config);
      const own = list
        ? config.replace(enclosed(config, list.index + list[0].length - 1), '')
        : config;
      const headers = /\bheaders\s*:\s*\{/.exec(own);

      if (
        headers &&
        /content-type/i.test(
          enclosed(own, headers.index + headers[0].length - 1)
        )
      ) {
        add(
          match.index,
          'content-type',
          'A Content-Type of the client goes with every request, those without a body included; json sets it for the requests that need it.',
          'remove it from the headers of the client; use Accept to say what the client reads'
        );
      }
    }

    // A middleware that does not return what next() gives
    for (const match of code.matchAll(
      /^([^\n]*?)\bnext\(\)\s*;?[ \t]*\n\s*\}/gm
    )) {
      const before = match[1].trim();

      if (before === '' || before === 'await') {
        add(
          match.index,
          'middleware-return',
          'A middleware returns a response; this one calls next() and returns nothing, which rejects the request.',
          'return next()'
        );
      }
    }

    return findings.sort((a, b) => a.line - b.line);
  }

  return { validate };
}
