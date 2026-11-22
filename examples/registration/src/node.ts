// The same scenarios in Node, once with each adapter.
import { fetchAdapter } from '@punica/request-fetch';
import { httpAdapter } from '@punica/request-http';
import { run, StorageMemory } from './scenarios';

// @ts-expect-error a plain module, started here
const { startApi } = await import('../server.mjs');
let failed = 0;

for (const [name, adapter] of [
  ['fetchAdapter', fetchAdapter()],
  ['httpAdapter', httpAdapter()]
] as const) {
  const api = await startApi();
  let token: string | null = null;
  const results = await run(
    {
      adapter,
      baseURL: api.url,
      storage: new StorageMemory(),
      language: () => 'fr',
      token: { get: () => token, set: (value) => (token = value) }
    },
    false
  );

  api.server.closeAllConnections();
  api.server.close();

  console.log(`\n${name} on Node ${process.version}`);

  for (const { name: scenario, ok, detail } of results) {
    if (!ok) failed += 1;

    console.log(
      `${ok ? '  ok  ' : '  FAIL'} ${scenario}${ok ? '' : `\n         ${detail}`}`
    );
  }
}

console.log(failed ? `\n${failed} scenarios failed` : '\nAll scenarios passed');
process.exit(failed ? 1 : 0);
