#!/usr/bin/env node
// punica-request-mcp: the MCP server over stdio.
import { readFileSync } from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createPunicaRequestServer } from './create.mjs';
import { loadPackage } from './load.mjs';

const packages = [
  loadPackage('@punica/request'),
  loadPackage('@punica/request-fetch'),
  loadPackage('@punica/request-http'),
  loadPackage('@punica/request-middleware')
];
const guide = readFileSync(new URL('./guide.md', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('./migration.md', import.meta.url),
  'utf8'
);

const server = createPunicaRequestServer({ packages, guide, migration });
await server.connect(new StdioServerTransport());
