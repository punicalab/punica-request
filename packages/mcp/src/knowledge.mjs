// What a tool needs to know about the public API of the Punica Request packages,
// read from their type declarations (.d.ts). Pure: it works on file contents,
// so the server, the build and the tests share it.

export const DOCS_URL = 'https://request.punicalab.com';

const DECLARATION =
  /^export (?:declare )?(?:abstract )?(class|const|function|type|interface|enum) (\w+)/gm;

/** The module a relative specifier points to: `./x.d.ts` or `./x/index.d.ts`. */
function resolve(files, from, specifier) {
  const base = new URL(specifier, `file:///${from}`).pathname.slice(1);

  return [`${base}.d.ts`, `${base}/index.d.ts`].find((path) => files.has(path));
}

/** The JSDoc comment that ends right before `index`, if there is one. */
function commentBefore(source, index) {
  const match = /\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*$/.exec(
    source.slice(0, index)
  );

  return match ? match[0].trimEnd() : '';
}

/** The declaration that starts at `index`: up to its closing brace or semicolon. */
function declarationAt(source, index) {
  let depth = 0;

  for (let i = index; i < source.length; i++) {
    const char = source[i];

    // Comments and texts hold brackets and semicolons of their own
    if (source.startsWith('/*', i)) {
      i = source.indexOf('*/', i + 2) + 1 || source.length;
      continue;
    }

    if (source.startsWith('//', i)) {
      i = source.indexOf('\n', i);
      if (i === -1) break;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      for (i++; i < source.length && source[i] !== char; i++) {
        if (source[i] === '\\') i++;
      }
      continue;
    }

    if ('({['.includes(char)) depth++;
    if (')}]'.includes(char)) depth--;
    if (depth === 0 && (char === ';' || char === '}')) {
      return source.slice(index, i + 1);
    }
  }

  return source.slice(index);
}

/**
 * The declarations of a module that are not exported but that `text` names,
 * such as the interface a configuration type is made of: without them the
 * options of a middleware could not be looked up.
 */
function localsOf(source, text, seen = new Set()) {
  const found = [];

  for (const match of source.matchAll(
    /^(?:declare )?(?:interface|type) (\w+)/gm
  )) {
    const name = match[1];

    if (seen.has(name) || !new RegExp(`\\b${name}\\b`).test(text)) continue;
    seen.add(name);

    const declaration = [
      commentBefore(source, match.index),
      declarationAt(source, match.index)
    ]
      .filter(Boolean)
      .join('\n');

    found.push(declaration, ...localsOf(source, declaration, seen));
  }

  return found;
}

function entry(source, index, kind, name) {
  const comment = commentBefore(source, index);
  const declaration = declarationAt(source, index);
  // The first paragraph of the comment, without its stars, up to the end of
  // its first sentence
  const lines = comment
    .replace(/^\s*\/\*+/, '')
    .replace(/\*+\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*+\s?/, '').trim());
  const start = lines.findIndex((line) => line && !line.startsWith('@'));
  const paragraph = [];

  for (let i = start; i >= 0 && i < lines.length; i++) {
    if (!lines[i] || lines[i].startsWith('@') || lines[i].startsWith('```'))
      break;
    paragraph.push(lines[i]);
  }

  const text = paragraph.join(' ');
  const summary = (/^.*?[.:](?=\s|$)/.exec(text)?.[0] ?? text).replace(
    /:$/,
    '.'
  );

  return {
    name,
    kind,
    summary: summary.trim(),
    declaration: [
      comment,
      declaration,
      ...localsOf(source, declaration, new Set([name]))
    ]
      .filter(Boolean)
      .join('\n')
  };
}

/** Every name a module exports, following its re-exports. */
function exportsOf(files, path, seen = new Set()) {
  if (!path || seen.has(path)) return new Map();
  seen.add(path);

  const source = files.get(path);
  const found = new Map();

  for (const match of source.matchAll(DECLARATION)) {
    found.set(match[2], entry(source, match.index, match[1], match[2]));
  }

  // export * from './x';  export type * from './x';
  for (const match of source.matchAll(
    /^export (?:type )?\* from ['"](.+?)['"];/gm
  )) {
    const target = exportsOf(files, resolve(files, path, match[1]), seen);

    for (const [name, value] of target) found.set(name, value);
  }

  // export { a, default as b } from './x';  export type { a } from './x';
  for (const match of source.matchAll(
    /^export (?:type )?\{([^}]+)\} from ['"](.+?)['"];/gm
  )) {
    const targetPath = resolve(files, path, match[2]);
    const target = exportsOf(files, targetPath, new Set(seen));
    const targetSource = files.get(targetPath) || '';

    for (const part of match[1].split(',')) {
      const [original, alias = original] = part.trim().split(/\s+as\s+/);
      let value = target.get(original);

      if (original === 'default') {
        // declare const x: …;  export default x;
        const local = (/^export default (\w+);/m.exec(targetSource) || [])[1];
        const declared = new RegExp(
          `^declare (?:abstract )?(class|const|function) ${local}\\b`,
          'm'
        ).exec(targetSource);

        value =
          declared && entry(targetSource, declared.index, declared[1], alias);
      }

      if (value) found.set(alias, { ...value, name: alias });
    }
  }

  return found;
}

/**
 * @param {Array<{ name: string, version: string, files: Map<string, string> }>} packages
 *   `files` holds the .d.ts files of the package, keyed by their path
 *   relative to its types root (`index.d.ts`, `model/index.d.ts`, …).
 */
export function createKnowledge(packages) {
  const api = new Map();

  for (const pkg of packages) {
    for (const [name, value] of exportsOf(pkg.files, 'index.d.ts')) {
      api.set(name, { ...value, package: pkg.name });
    }
  }

  const names = [...api.keys()].sort();
  const get = (name) => api.get(name);

  /** Names whose own name or documentation holds every word of the query. */
  function search(query) {
    const words = query.toLowerCase().split(/\W+/).filter(Boolean);

    return names
      .map((name) => api.get(name))
      .filter((item) => {
        const text = `${item.name} ${item.declaration}`.toLowerCase();

        return words.every((word) => text.includes(word));
      });
  }

  /**
   * A type the packages declare without exporting it, as the exports that
   * are made of it bring it along: an import of it would fail, but what it
   * holds is part of the API.
   */
  function local(name) {
    const pattern = new RegExp(
      `^(?:declare )?(?:interface|type) ${name}\\b`,
      'm'
    );
    const users = names.filter((other) =>
      pattern.test(api.get(other).declaration)
    );

    if (!users.length) return undefined;

    const source = api.get(users[0]).declaration;
    const index = pattern.exec(source).index;
    const declaration = [
      commentBefore(source, index),
      declarationAt(source, index)
    ]
      .filter(Boolean)
      .join('\n');

    return `## ${name} (not exported, ${api.get(users[0]).package})\n\nIt cannot be imported; it is part of ${users.join(', ')}, which can.\n\n\`\`\`ts\n${declaration}\n\`\`\``;
  }

  function formatMarkdown(name) {
    const item = get(name);

    if (!item && /^\w+$/.test(name) && local(name)) return local(name);

    if (!item) {
      return `${name} is not exported by ${packages.map((p) => p.name).join(' or ')}. Exports: ${names.join(', ')}`;
    }

    return `## ${item.name} (${item.kind}, ${item.package})\n\n\`\`\`ts\n${item.declaration}\n\`\`\``;
  }

  /**
   * The class or type a type guard checks for: `isRequestError` is
   * `error is RequestError`, and its caller wants `reason` next.
   */
  function guardOf(name) {
    const item = get(name);

    if (!item) return null;

    const code = item.declaration.replace(/\/\*\*[\s\S]*?\*\//g, '');
    const target = /\bis\s+([A-Z]\w*)/.exec(code)?.[1];

    return target && target !== name && names.includes(target) ? target : null;
  }

  /**
   * The exported option, configuration and handler types (`…Options`,
   * `…Config`, `…Handlers`, `…Handler`, `…Reason`) that the declaration of
   * `name` names, so that `refreshToken` comes with what
   * `RefreshTokenOptions` holds without a second lookup.
   */
  function optionsOf(name) {
    const item = get(name);

    if (!item) return [];

    // The declaration only: a name in its documentation is not taken
    const code = item.declaration.replace(/\/\*\*[\s\S]*?\*\//g, '');

    return names.filter(
      (other) =>
        other !== name &&
        /(?:Options|Config|Handlers?|Reason)$/.test(other) &&
        ['interface', 'type'].includes(get(other).kind) &&
        new RegExp(`\\b${other}\\b`).test(code)
    );
  }

  /**
   * Each name asked for, then the type a guard among them checks for and the
   * option types they take (and the ones those take) that were not asked
   * for, at most `limit` of them.
   */
  function formatMany(asked, limit = 4) {
    const parts = asked.map((name) => formatMarkdown(name));
    const added = [];
    const queue = asked.map((name) => [name, name]);

    while (queue.length && added.length < limit) {
      const [name, root] = queue.shift();
      const guarded = guardOf(name);
      const related = [
        ...(guarded ? [[guarded, 'checks for']] : []),
        ...optionsOf(name).map((other) => [other, 'takes'])
      ];

      for (const [other, verb] of related) {
        if (asked.includes(other) || added.some(([n]) => n === other)) continue;
        if (added.length >= limit) break;
        added.push([other, name, verb]);
        queue.push([other, root]);
      }
    }

    for (const [other, by, verb] of added) {
      parts.push(
        formatMarkdown(other).replace(
          /^## (\w+) \((\w+), /,
          `## $1 ($2, what ${by} ${verb}, `
        )
      );
    }

    return parts.join('\n\n');
  }

  return {
    packages,
    names,
    get,
    search,
    formatMarkdown,
    optionsOf,
    guardOf,
    formatMany
  };
}
