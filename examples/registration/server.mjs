// A stand-in for the API of a registration application, and the page that
// uses it, on two ports: the page and the API are of different origins, so
// every request of the browser is a CORS request.
import http from 'node:http';
import { readFile } from 'node:fs/promises';

const json = (response, status, data, headers = {}) => {
  response.writeHead(status, {
    'content-type': 'application/json',
    ...headers
  });
  response.end(JSON.stringify(data));
};

/** Starts the API. `state` is what the scenarios ask about afterwards. */
export const startApi = async (port = 0) => {
  const state = { hits: {}, validToken: 'token-1', preflights: 0 };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const route = `${request.method} ${url.pathname}`;
    const chunks = [];

    response.setHeader(
      'access-control-allow-origin',
      request.headers.origin ?? '*'
    );
    response.setHeader('access-control-allow-credentials', 'true');
    response.setHeader(
      'access-control-expose-headers',
      'x-total, x-request-language'
    );

    if (request.method === 'OPTIONS') {
      state.preflights += 1;
      response.writeHead(204, {
        'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE',
        'access-control-allow-headers':
          request.headers['access-control-request-headers'] ?? '',
        'access-control-max-age': '0'
      });

      return response.end();
    }

    state.hits[route] = (state.hits[route] ?? 0) + 1;
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      const authorized =
        request.headers.authorization === `Bearer ${state.validToken}`;

      switch (route) {
        case 'GET /v1/state':
          return json(response, 200, state);
        case 'POST /v1/state':
          Object.assign(state, JSON.parse(body.toString() || '{}'));

          return json(response, 200, state);
        case 'GET /v1/pages/7':
          return json(
            response,
            200,
            {
              id: 7,
              title: 'Summit',
              language: request.headers['accept-language'],
              query: url.search
            },
            { 'x-request-language': request.headers['accept-language'] ?? '' }
          );
        case 'POST /v1/registration': {
          const sent = JSON.parse(body.toString() || '{}');

          if (!sent.email) {
            return json(response, 400, {
              errors: { email: ['Email is required'] }
            });
          }

          return json(response, 201, {
            id: 'r-1',
            ...sent,
            contentType: request.headers['content-type'],
            csrf: request.headers['x-xsrf-token'] ?? null
          });
        }
        case 'GET /v1/cart':
          return authorized
            ? json(response, 200, {
                items: 2,
                token: request.headers.authorization
              })
            : json(response, 401, { errors: { error: ['Session is over'] } });
        case 'POST /v1/auth/refresh':
          state.validToken = `token-${Number(state.validToken.split('-')[1]) + 1}`;

          return json(response, 200, { token: state.validToken });
        case 'GET /v1/countries':
          return json(response, 200, ['Türkiye', 'Montenegro'], {
            'x-total': '2'
          });
        case 'GET /v1/search':
          return setTimeout(
            () => json(response, 200, { q: url.searchParams.get('q') }),
            url.searchParams.get('q') === 'paper' ? 20 : 300
          );
        case 'GET /v1/slow':
          return setTimeout(() => json(response, 200, {}), 2000);
        case 'POST /v1/upload':
          return json(response, 200, {
            type: request.headers['content-type'],
            hasFile: body.includes('filename="badge.txt"'),
            size: body.length
          });
        case 'GET /v1/badge':
          response.writeHead(200, { 'content-type': 'image/png' });

          return response.end(Buffer.from([137, 80, 78, 71, 1, 2, 3]));
        case 'GET /v1/export':
          response.writeHead(200, { 'content-type': 'text/csv' });

          return response.end('id,name\n1,Paper\n');
        case 'DELETE /v1/sessions/3':
          response.writeHead(204);

          return response.end();
        case 'PUT /v1/sessions/3':
          return json(response, 409, {
            errors: { error: ['Session is full'] }
          });
        case 'GET /v1/broken':
          return json(response, 500, {
            errors: { error: ['Something went wrong'] }
          });
        case 'GET /v1/events':
          response.writeHead(200, { 'content-type': 'text/event-stream' });
          response.write('data: one\n\n');

          return setTimeout(() => response.end('data: two\n\n'), 30);
        default:
          return json(response, 404, { errors: { error: [`No ${route}`] } });
      }
    });
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  return { server, state, url: `http://127.0.0.1:${server.address().port}/v1` };
};

// Started by itself: the API and the page
if (import.meta.url === `file://${process.argv[1]}`) {
  const api = await startApi(Number(process.env.API_PORT ?? 4401));
  const page = http.createServer(async (request, response) => {
    const file = request.url === '/app.js' ? 'app.js' : 'index.html';
    const text = await readFile(
      new URL(`./public/${file}`, import.meta.url),
      'utf8'
    );

    response.writeHead(200, {
      'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html'
    });
    response.end(text.replace('__API__', api.url));
  });

  page.listen(Number(process.env.PORT ?? 4400), '127.0.0.1', () =>
    console.log(`page http://127.0.0.1:${page.address().port}  api ${api.url}`)
  );
}
