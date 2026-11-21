// bundled/: the type declarations of the packages, the fallback for a
// project that has not installed them. Run the packages' build first.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const packages = {
  request: '../api',
  'request-fetch': '../api-fetch',
  'request-http': '../api-http',
  'request-middleware': '../middleware'
};

await rm('bundled', { recursive: true, force: true });

for (const [name, path] of Object.entries(packages)) {
  const { version } = JSON.parse(await readFile(`${path}/package.json`, 'utf8'));

  await mkdir(`bundled/${name}`, { recursive: true });
  await cp(`${path}/dist`, `bundled/${name}`, {
    recursive: true,
    filter: (source) => !/\.m?js$/.test(source)
  });
  await writeFile(`bundled/${name}/package.json`, JSON.stringify({ version }) + '\n');
  console.log(`bundled @punica/${name} ${version}`);
}
