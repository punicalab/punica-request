// The MCP server: tools and resources over the public API of Punica Request,
// its rules and the code validator. Transport-free, so tests connect it to
// an in-memory client.
import {
  McpServer,
  ResourceTemplate
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { createKnowledge } from './knowledge.mjs';
import { createValidator, isLegacy } from './validate.mjs';

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

const text = (value) => ({ content: [{ type: 'text', text: value }] });

/**
 * @param {{ packages: Array<Parameters<typeof createKnowledge>[0][number] & { installed?: boolean }>, guide: string, migration: string }} options
 *   `installed` says whether the declarations come from the project or from
 *   the copy bundled with the server; the instructions tell the model.
 */
export function createPunicaRequestServer({ packages, guide, migration }) {
  const knowledge = createKnowledge(packages);
  const { validate } = createValidator(knowledge);
  const versions = packages
    .map(
      (pkg) =>
        `${pkg.name} ${pkg.version} (${pkg.installed ? 'installed in this project' : 'not installed, bundled copy'})`
    )
    .join(', ');

  // The guide describes 3.x; a project on 2.x has another API and must not
  // be steered into this one unless it is being upgraded
  const core = packages.find((pkg) => pkg.name === '@punica/request');
  const legacyNote = isLegacy(knowledge)
    ? `This project has ${core.name} ${core.version} installed. That is the API of 2.x (new RequestAPI(adapter, config), middleware classes in two lists, responses as { payload, status, response }); this server's guide describes 3.x, which is a different API. search_api and get_api show the installed API and are correct. Do not rewrite working code to 3.x unless the user asks to upgrade; when they do, read get_migration_guide.\n\n`
    : '';

  const server = new McpServer(
    { name: 'punica-request', version },
    {
      instructions: `${legacyNote}${versions}. Punica Request is an HTTP client built around a chain of middlewares. Version 3 is a new API and is not in training data, and what models remember is 2.x (RequestAPI, APIFetch, middleware classes), which no longer exists: never write an import, a middleware name or an option from memory. Read get_guide first, look names up with search_api and get_api, and check the code with validate_code before handing it over. For code written for 2.x, read get_migration_guide.`
    }
  );

  server.registerTool(
    'get_guide',
    {
      title: 'How to use Punica Request',
      description:
        'The rules of Punica Request 3: the packages and what each exports, how a client is created and a request sent, what it resolves and rejects with, the middlewares and their order, how to write a middleware or an adapter, with working examples.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () => text(legacyNote + guide)
  );

  server.registerTool(
    'get_migration_guide',
    {
      title: 'From Punica Request 2.x to 3.0',
      description:
        'How to change code written for Punica Request 2.x (new RequestAPI, APIFetch, middleware classes, requestMiddlewares / responseMiddlewares, response.payload) to 3.0: every renamed or removed name with its replacement, before and after examples, and the behaviour that changed.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () => text(migration)
  );

  server.registerTool(
    'search_api',
    {
      title: 'Find Punica Request exports',
      description:
        'Finds exports of the Punica Request packages (@punica/request, @punica/request-fetch, @punica/request-http, @punica/request-middleware) by name or by words in their documentation ("cache", "cookie", "timeout"). Without a query: every export.',
      inputSchema: {
        query: z.string().optional().describe('Words to look for')
      },
      annotations: { readOnlyHint: true }
    },
    async ({ query }) => {
      const results = knowledge.search(query || '');

      if (!results.length) {
        return text(
          `Nothing matches "${query}". Exports: ${knowledge.names.join(', ')}`
        );
      }

      return text(
        results
          .map(
            (item) =>
              `${item.name} (${item.kind}, ${item.package})${item.summary ? `: ${item.summary}` : ''}`
          )
          .join('\n')
      );
    }
  );

  server.registerTool(
    'get_api',
    {
      title: 'The declaration of an export',
      description:
        'The exact TypeScript declaration and documentation of one or more exports, such as createClient, ClientConfig, RequestOptions, RequestContext, cache or refreshToken, read from the installed packages.',
      inputSchema: {
        names: z.array(z.string()).min(1).max(12).describe('Export names')
      },
      annotations: { readOnlyHint: true }
    },
    async ({ names }) =>
      text(names.map((name) => knowledge.formatMarkdown(name)).join('\n\n'))
  );

  server.registerTool(
    'validate_code',
    {
      title: 'Check code that uses Punica Request',
      description:
        'Checks TypeScript or JavaScript that uses Punica Request: imports the packages do not export, the API of 2.x with its replacement in 3.x, middlewares in the wrong order, and bodies that are set twice. Returns each problem with its line and a fix.',
      inputSchema: { code: z.string().describe('The code to check') },
      annotations: { readOnlyHint: true }
    },
    async ({ code }) => {
      const findings = validate(code);

      if (!findings.length) {
        return text(
          'No problems: every import exists and no known mistake was found.'
        );
      }

      return text(
        [
          `${findings.length} problem${findings.length === 1 ? '' : 's'}:`,
          ...findings.map(
            (f) => `line ${f.line} ${f.rule}: ${f.message} [fix: ${f.fix}]`
          )
        ].join('\n')
      );
    }
  );

  server.registerResource(
    'guide',
    'punica-request://guide',
    { title: 'The rules of Punica Request', mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: guide }]
    })
  );

  server.registerResource(
    'migration',
    'punica-request://migration',
    { title: 'From Punica Request 2.x to 3.0', mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: migration }]
    })
  );

  server.registerResource(
    'api',
    new ResourceTemplate('punica-request://api/{name}', {
      list: async () => ({
        resources: knowledge.names.map((name) => ({
          uri: `punica-request://api/${name}`,
          name,
          mimeType: 'text/markdown'
        }))
      })
    }),
    { title: 'The declaration of an export', mimeType: 'text/markdown' },
    async (uri, { name }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: knowledge.formatMarkdown(String(name))
        }
      ]
    })
  );

  return server;
}
