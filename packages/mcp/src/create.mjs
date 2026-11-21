// The MCP server: tools and resources over the public API of Punica Request,
// its rules and the code validator. Transport-free, so tests connect it to
// an in-memory client.
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { createKnowledge } from './knowledge.mjs';
import { createValidator, isLegacy } from './validate.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const text = (value) => ({ content: [{ type: 'text', text: value }] });

/**
 * @param {{ packages: Array<Parameters<typeof createKnowledge>[0][number] & { installed?: boolean }>, guide: string }} options
 *   `installed` says whether the declarations come from the project or from
 *   the copy bundled with the server; the instructions tell the model.
 */
export function createPunicaRequestServer({ packages, guide }) {
  const knowledge = createKnowledge(packages);
  const { validate } = createValidator(knowledge);
  const versions = packages
    .map((pkg) => `${pkg.name} ${pkg.version} (${pkg.installed ? 'installed in this project' : 'not installed, bundled copy'})`)
    .join(', ');

  // The guide describes the current API; a project on an older 2.x has a
  // different configuration and must not be steered into this one
  const core = packages.find((pkg) => pkg.name === '@punica/request');
  const legacyNote = isLegacy(knowledge)
    ? `This project has ${core.name} ${core.version} installed, which is older than the API this server's guide describes (2.4 and later: a flat configuration, responses as { payload, status, response }). search_api and get_api show the installed API and are correct; get_guide applies only after upgrading. Do not rewrite working code to the newer API unless the user asks to upgrade.\n\n`
    : '';

  const server = new McpServer(
    { name: 'punica-request', version },
    {
      instructions: `${legacyNote}${versions}. Punica Request is an HTTP client built around a chain of middlewares and is rarely in training data: never write an import, a middleware name or an option from memory. Read get_guide first, look names up with search_api and get_api, and check the code with validate_code before handing it over.`
    }
  );

  server.registerTool(
    'get_guide',
    {
      title: 'How to use Punica Request',
      description:
        'The rules of Punica Request: the packages and what each exports, how a request is configured and sent, what it resolves and rejects with, the middlewares and the list each belongs in, how to write a middleware or an adapter, and a complete working example.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () => text(legacyNote + guide)
  );

  server.registerTool(
    'search_api',
    {
      title: 'Find Punica Request exports',
      description:
        'Finds exports of the Punica Request packages (@punica/request, @punica/request-fetch, @punica/request-http, @punica/request-middleware) by name or by words in their documentation ("cache", "cookie", "abort"). Without a query: every export.',
      inputSchema: { query: z.string().optional().describe('Words to look for') },
      annotations: { readOnlyHint: true }
    },
    async ({ query }) => {
      const results = knowledge.search(query || '');

      if (!results.length) {
        return text(`Nothing matches "${query}". Exports: ${knowledge.names.join(', ')}`);
      }

      return text(
        results
          .map((item) => `${item.name} (${item.kind}, ${item.package})${item.summary ? `: ${item.summary}` : ''}`)
          .join('\n')
      );
    }
  );

  server.registerTool(
    'get_api',
    {
      title: 'The declaration of an export',
      description:
        'The exact TypeScript declaration and documentation of one or more exports, such as RequestAPI, IConfig, RequestParams, CacheMiddleware or BaseMiddleware, read from the installed packages.',
      inputSchema: { names: z.array(z.string()).min(1).max(12).describe('Export names') },
      annotations: { readOnlyHint: true }
    },
    async ({ names }) => text(names.map((name) => knowledge.formatMarkdown(name)).join('\n\n'))
  );

  server.registerTool(
    'validate_code',
    {
      title: 'Check code that uses Punica Request',
      description:
        'Checks TypeScript or JavaScript that uses Punica Request: imports the packages do not export, names from older versions, options that do not exist and middlewares in the wrong list. Returns each problem with its line and a fix.',
      inputSchema: { code: z.string().describe('The code to check') },
      annotations: { readOnlyHint: true }
    },
    async ({ code }) => {
      const findings = validate(code);

      if (!findings.length) {
        return text('No problems: every import exists and no known mistake was found.');
      }

      return text(
        [
          `${findings.length} problem${findings.length === 1 ? '' : 's'}:`,
          ...findings.map((f) => `line ${f.line} ${f.rule}: ${f.message} [fix: ${f.fix}]`)
        ].join('\n')
      );
    }
  );

  server.registerResource(
    'guide',
    'punica-request://guide',
    { title: 'The rules of Punica Request', mimeType: 'text/markdown' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: guide }] })
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
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: knowledge.formatMarkdown(String(name)) }]
    })
  );

  return server;
}
