// Checks code that uses Punica Request for the mistakes models make: names
// the packages do not export, the API of 2.x written against 3.x, and the
// few rules 3.x has (the order of the middlewares, json or body).

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

/** More than any file of an application; the checks are not for bundles. */
const MAX_LENGTH = 200_000;

/** The API of 2.x, and what 3.x has instead. Patterns are bounded: no run of them is longer than a line or two. */
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
      /\bnew\s+(TokenAuth|Cookie|Cache|CancelRequest|RefreshToken|Error)Middleware\b/g,
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
    pattern: /\brequestInit\s*:/g,
    message: 'requestInit is the option of 2.x.',
    fix: () =>
      '`headers` for the headers, `init` for the rest (credentials, mode, …)'
  },
  {
    pattern:
      /\.(?:get|post|put|patch|delete)\s*(?:<[^()]{0,200}>)?\s*\(\s*\{\s*path\b/g,
    message: 'The path is not an option any more.',
    fix: () => `the path is the first argument: api.get('items', { query })`
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
      /(?:\b(?:response|res|result|httpResponse)|\))\.payload\b|\{\s*payload\b[^}\n]{0,200}\}\s*=\s*await\b/g,
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
    pattern: /\b(?:getActive|getAvailableMethods|availableMethods)\s*[(:]/g,
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
    pattern: /\brefreshToken\s*\(\s*\{\s*tokenProvider\b/g,
    message: 'refreshToken takes a function, not a provider.',
    fix: () => 'refreshToken({ refresh: () => tokenProvider.refreshToken() })'
  },
  {
    pattern: /(?<![.\w])onError\s*\(\s*\{\s*(?:contentType|error)\s*:/g,
    message: 'onError takes the handlers themselves.',
    fix: () => 'onError({ 401: (response, context) => { … }, default: … })'
  },
  {
    pattern: /\btokenAuth\s*\(\s*\{[^{}]{0,300}\}\s*,\s*[^)\s]/g,
    message: 'tokenAuth takes one object.',
    fix: () =>
      `tokenAuth({ cookieName: 'token', headerName: 'X-Auth', tokenFormat: '\${token}' })`
  }
];

const FACTORIES = 'tokenAuth|cookie|cancel|cache|refreshToken|onError';

/** Calls looked into, per rule: more than any file has, few enough to stay quick. */
const MAX_CALLS = 400;

/** The first matches of a pattern. */
function* first(text, pattern, limit = MAX_CALLS) {
  let count = 0;

  for (const match of text.matchAll(pattern)) {
    if (++count > limit) return;
    yield match;
  }
}

/**
 * The code with its comments blanked and, in the second copy, the contents
 * of its texts as well: what is left has the same length and the same line
 * breaks, and its brackets are all real ones.
 */
function blank(code) {
  const noComments = code.split('');
  const bare = code.split('');
  const wipe = (target, from, to) => {
    for (let i = from; i < to; i++) if (target[i] !== '\n') target[i] = ' ';
  };

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    if (char === '/' && code[i + 1] === '/') {
      let end = code.indexOf('\n', i);

      if (end === -1) end = code.length;
      wipe(noComments, i, end);
      wipe(bare, i, end);
      i = end;
    } else if (char === '/' && code[i + 1] === '*') {
      let end = code.indexOf('*/', i + 2);

      end = end === -1 ? code.length : end + 2;
      wipe(noComments, i, end);
      wipe(bare, i, end);
      i = end - 1;
    } else if (char === "'" || char === '"' || char === '`') {
      let end = i + 1;

      while (end < code.length && code[end] !== char) {
        // A text of one line ends with its line
        if (code[end] === '\n' && char !== '`') break;
        if (code[end] === '\\') end++;
        end++;
      }

      wipe(bare, i + 1, end);
      i = end;
    }
  }

  return { code: noComments.join(''), bare: bare.join('') };
}

const PAIRS = { '[': ']', '(': ')', '{': '}' };
const OPENING = '([{';
const CLOSING = ')]}';

/** Where the bracket at `open` closes; not looked for further than `limit`. */
function closeOf(bare, open, limit = 10_000) {
  const end = Math.min(bare.length, open + limit);
  let depth = 0;

  for (let i = open; i < end; i++) {
    if (bare[i] === bare[open]) depth++;
    else if (bare[i] === PAIRS[bare[open]] && --depth === 0) return i;
  }

  return end;
}

/** The text between two positions, with what is inside its own brackets blanked. */
function shallow(bare, from, to) {
  let depth = 0;
  let out = '';

  for (let i = from; i < to; i++) {
    const char = bare[i];

    if (CLOSING.includes(char)) depth = Math.max(0, depth - 1);
    out += depth === 0 || char === '\n' ? char : ' ';
    if (OPENING.includes(char)) depth++;
  }

  return out;
}

/**
 * The object literals among the arguments of the call whose parenthesis is
 * at `open`: `[from, to]` of what is between their braces.
 */
function objectArguments(bare, open) {
  const close = closeOf(bare, open);
  const top = shallow(bare, open + 1, close);
  const found = [];

  for (const match of top.matchAll(/(^|,)\s*\{/g)) {
    const brace = open + 1 + match.index + match[0].length - 1;

    found.push([brace + 1, closeOf(bare, brace)]);
  }

  return found;
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
   * @param {string} source
   * @returns {Array<{ line: number, rule: string, message: string, fix: string }>}
   */
  function validate(source) {
    if (source.length > MAX_LENGTH) {
      return [
        {
          line: 1,
          rule: 'too-large',
          message: `The code is ${source.length} characters long; the checker reads up to ${MAX_LENGTH}.`,
          fix: 'check the files that use Punica Request one by one'
        }
      ];
    }

    const { code, bare } = blank(source.replace(/\r\n?/g, '\n'));
    const starts = [0];

    for (let i = code.indexOf('\n'); i !== -1; i = code.indexOf('\n', i + 1))
      starts.push(i + 1);

    /** The line of a position, by bisection. */
    const lineOf = (index) => {
      let low = 0;
      let high = starts.length - 1;

      while (low < high) {
        const middle = (low + high + 1) >> 1;

        if (starts[middle] <= index) low = middle;
        else high = middle - 1;
      }

      return low + 1;
    };
    const findings = [];
    const add = (index, rule, message, fix) =>
      findings.push({ line: lineOf(index), rule, message, fix });
    const sorted = () => findings.sort((a, b) => a.line - b.line);
    const isOurs = (name) =>
      name === PREFIX ||
      name.startsWith(`${PREFIX}/`) ||
      name.startsWith(`${PREFIX}-`);
    let imports = 0;
    let ours = 0;

    /** Checks the names taken from a package. */
    const checkNames = (index, from, names) => {
      if (!packageNames.includes(from)) {
        add(
          index,
          'unknown-package',
          `There is no ${from}.`,
          `the packages are ${packageNames.join(', ')}; a package has one entry point`
        );

        return;
      }

      for (const name of names) {
        const item = knowledge.get(name);

        if (!name || item?.package === from) continue;

        add(
          index,
          'unknown-export',
          `${from} does not export ${name}.`,
          item
            ? `import it from "${item.package}"`
            : (!legacy && RENAMED[name]) || 'look the name up with search_api'
        );
      }
    };
    const listed = (list) =>
      list.split(',').map(
        (part) =>
          part
            .replace(/^\s*type\s+/, '')
            .trim()
            .split(/\s*(?:\bas\b|:)\s*/)[0]
      );

    // import { a, type b as c } from, export { a } from
    for (const match of code.matchAll(
      /\b(?:import|export)\s*(?:type\s*)?\{([^{}]{0,2000})\}\s*from\s*['"]([^'"\n]{1,200})['"]/g
    )) {
      imports++;
      if (!isOurs(match[2])) continue;
      ours++;
      checkNames(match.index, match[2], listed(match[1]));
    }

    // const { a, b: c } = require(), = await import()
    for (const match of code.matchAll(
      /\{([^{}]{0,2000})\}\s*=\s*(?:await\s+)?(?:require|import)\s*\(\s*['"]([^'"\n]{1,200})['"]/g
    )) {
      imports++;
      if (!isOurs(match[2])) continue;
      ours++;
      checkNames(match.index, match[2], listed(match[1]));
    }

    // import * as P from: what is taken from P
    for (const match of code.matchAll(
      /\bimport\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"\n]{1,200})['"]/g
    )) {
      imports++;
      if (!isOurs(match[2])) continue;
      ours++;

      const used = new Set(
        [...code.matchAll(new RegExp(`\\b${match[1]}\\.(\\w+)`, 'g'))].map(
          (found) => found[1]
        )
      );

      checkNames(match.index, match[2], [...used]);
    }

    // import P from
    for (const match of code.matchAll(
      /\bimport\s+(?:type\s+)?(\w+)\s+from\s*['"]([^'"\n]{1,200})['"]/g
    )) {
      imports++;
      if (!isOurs(match[2])) continue;
      ours++;
      add(
        match.index,
        'unknown-export',
        `${match[2]} has no default export.`,
        `import { ${RENAMED[match[1]] ? 'createClient' : match[1]} } from "${match[2]}"; look names up with search_api`
      );
    }

    if (legacy) return sorted();

    // A file that takes what it uses from elsewhere is not ours to judge:
    // `next()`, `payload` and `createClient` mean other things there
    if (imports > 0 && ours === 0) return sorted();

    for (const { pattern, message, fix } of LEGACY_RULES) {
      for (const match of bare.matchAll(pattern)) {
        add(
          match.index,
          'v2',
          typeof message === 'string' ? message : message(match),
          fix(match)
        );
      }
    }

    const oldClient = /\bRequestAPI\b/.test(bare);

    if (oldClient) {
      for (const match of bare.matchAll(/\bhostname\s*:/g)) {
        add(
          match.index,
          'v2',
          'hostname is the option of 2.x.',
          'baseURL; it is joined with the path whatever their slashes'
        );
      }
    }

    // Two type arguments: api.get<Sent, Received>()
    for (const match of first(bare, /\.(?:get|post|put|patch|delete)\s*</g)) {
      const open = match.index + match[0].length - 1;
      let depth = 0;
      let commas = 0;
      let close = -1;

      for (let i = open; i < Math.min(bare.length, open + 400); i++) {
        const char = bare[i];

        if (char === '<' || OPENING.includes(char)) depth++;
        else if (CLOSING.includes(char)) depth--;
        else if (char === '>' && bare[i - 1] !== '=') {
          if (--depth === 0) {
            close = i;
            break;
          }
        } else if (char === ',' && depth === 1) commas++;
      }

      if (
        close !== -1 &&
        commas > 0 &&
        /^\s*\(/.test(bare.slice(close + 1, close + 20))
      ) {
        add(
          match.index,
          'v2',
          'A request has one type argument, the type of the data it brings.',
          'api.post<Received>(path, { json })'
        );
      }
    }

    // The client
    for (const match of first(bare, /\bcreateClient\s*\(/g)) {
      const open = match.index + match[0].length - 1;

      for (const [from, to] of objectArguments(bare, open)) {
        const keys = shallow(bare, from, to);

        if (!oldClient) {
          const hostname = /\bhostname\s*:/.exec(keys);

          if (hostname) {
            add(
              from + hostname.index,
              'v2',
              'hostname is the option of 2.x.',
              'baseURL; it is joined with the path whatever their slashes'
            );
          }
        }

        if (!/\badapter\b/.test(keys) && !keys.includes('...')) {
          add(
            match.index,
            'adapter',
            'A client needs an adapter; the core sends nothing by itself.',
            'createClient({ adapter: fetchAdapter(), … }), with fetchAdapter from "@punica/request-fetch"'
          );
        }

        const uncalled =
          /\badapter\s*:\s*(fetchAdapter|httpAdapter)\b(?!\s*\()/.exec(keys);

        if (uncalled) {
          add(
            from + uncalled.index,
            'adapter',
            `${uncalled[1]} makes the adapter; it is not the adapter.`,
            `adapter: ${uncalled[1]}()`
          );
        }

        // A Content-Type for every request
        const headers = /\bheaders\s*:\s*\{/.exec(keys);

        if (headers) {
          const brace = from + headers.index + headers[0].length - 1;

          if (/content-type/i.test(code.slice(brace, closeOf(bare, brace)))) {
            add(
              match.index,
              'content-type',
              'A Content-Type of the client goes with every request, those without a body included; json sets it for the requests that need it.',
              'remove it from the headers of the client; use Accept to say what the client reads'
            );
          }
        }
      }
    }

    // The order of the middlewares, and middlewares that were not made
    for (const match of first(bare, /\bmiddlewares\s*:\s*\[/g)) {
      const open = match.index + match[0].length - 1;
      const close = closeOf(bare, open);
      const list = bare.slice(open + 1, close);
      const position = (name) => {
        const found = new RegExp(`(?<![.\\w])${name}\\s*\\(`).exec(list);

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

      const items = shallow(bare, open + 1, close);

      for (const found of items.matchAll(
        new RegExp(`(?<![.\\w])(${FACTORIES})\\b(?!\\s*\\()`, 'g')
      )) {
        add(
          open + 1 + found.index,
          'middleware-call',
          `${found[1]} makes the middleware; it is not the middleware.`,
          `call it with its options: ${found[1]}(${found[1] === 'cancel' ? '' : '{ … }'})`
        );
      }
    }

    // The body of a request
    for (const match of first(
      bare,
      /\.(get|head|post|put|patch|delete|request)\s*(?:<[^()]{0,200}>)?\s*\(/g
    )) {
      const open = match.index + match[0].length - 1;
      const method = match[1];

      for (const [from, to] of objectArguments(bare, open)) {
        const keys = shallow(bare, from, to);
        const json =
          /\bjson\s*:/.test(keys) || /(^|[{,]\s*)json\s*(,|$)/.test(keys);
        const body =
          /\bbody\s*:/.test(keys) || /(^|[{,]\s*)body\s*(,|$)/.test(keys);

        if (json && body) {
          add(
            match.index,
            'body',
            'A request has json or body, not both.',
            'json for a value that is sent as JSON, body for anything else'
          );
        }

        if ((json || body) && (method === 'get' || method === 'head')) {
          add(
            match.index,
            'body',
            `A ${method.toUpperCase()} request has no body.`,
            'send what it needs in query, or use post'
          );
        }

        if (/\b(?:json|body)\s*:\s*JSON\.stringify\b/.test(keys)) {
          add(
            match.index,
            'body',
            'A body is not serialised by hand: json does it.',
            'json: value'
          );
        }

        if (
          /^(?:post|put|patch)$/.test(method) &&
          !json &&
          !body &&
          /\bdata\s*:(?!\s*JSON\.stringify\b)/.test(keys)
        ) {
          add(
            match.index,
            'v2',
            'data is the option of 2.x.',
            'json: value for JSON, body: value for anything else'
          );
        }
      }
    }

    // A middleware that does not return what next() gives
    for (const match of first(
      bare,
      /\(\s*\w+\s*(?::[^,()]{0,80})?,\s*next\s*(?::[^,()]{0,80})?\)\s*(?::[^=]{0,120})?=>\s*\{|\bfunction\b[^(){}]{0,80}\(\s*\w+\s*(?::[^,()]{0,80})?,\s*next\s*(?::[^,()]{0,80})?\)\s*(?::[^{]{0,120})?\{/g
    )) {
      const open = match.index + match[0].length - 1;
      const close = closeOf(bare, open);
      const statements = shallow(bare, open + 1, close);
      const last =
        /(?:^|[;{}\n])[ \t]*(?:await[ \t]+)?next[ \t]*\([^()\n]{0,80}\)[ \t]*;?[ \t\n]{0,200}$/.exec(
          statements
        );

      if (last && !/\breturn\b[^;\n]{0,200}$/.test(statements.trimEnd())) {
        add(
          open + 1 + last.index + last[0].search(/\S/),
          'middleware-return',
          'A middleware returns a response; this one calls next() and returns nothing, which rejects the request.',
          'return next()'
        );
      }
    }

    // next() takes nothing
    for (const match of bare.matchAll(
      /(?<![.\w])next\s*\(\s*(?:context|ctx|processData)\b/g
    )) {
      add(
        match.index,
        'next',
        'next takes no argument: the request is the context every middleware shares.',
        'next()'
      );
    }

    return sorted();
  }

  return { validate };
}
