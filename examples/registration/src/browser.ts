import { deleteCookie, getCookie, setCookie } from '@punica/request';
import { fetchAdapter } from '@punica/request-fetch';
import { run, StorageMemory } from './scenarios';

declare global {
  interface Window {
    API: string;
    scenarioResults?: unknown;
  }
}

const COOKIE = 'reg_otp_token';

const results = await run(
  {
    adapter: fetchAdapter(),
    baseURL: window.API,
    storage: new StorageMemory(),
    language: () => 'fr',
    token: {
      cookieName: COOKIE,
      get: () => getCookie(COOKIE),
      set: (value) =>
        value
          ? setCookie(COOKIE, value, { path: '/' })
          : deleteCookie(COOKIE, { path: '/' })
    }
  },
  true
);

const body = document.getElementById('results') as HTMLElement;

for (const { name, ok, detail } of results) {
  const row = document.createElement('tr');

  for (const [text, className] of [
    [name, ''],
    [ok ? 'pass' : 'FAIL', ok ? 'pass' : 'fail'],
    [detail, '']
  ]) {
    const cell = document.createElement('td');

    cell.textContent = text;
    cell.className = className;
    row.append(cell);
  }

  body.append(row);
}

const failed = results.filter((one) => !one.ok).length;

(document.getElementById('summary') as HTMLElement).textContent =
  `${results.length - failed} of ${results.length} scenarios passed.`;
window.scenarioResults = results;
