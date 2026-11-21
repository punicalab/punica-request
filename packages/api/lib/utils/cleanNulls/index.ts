type AnyObj = Record<string, any>;

const isPlainObject = (v: any): v is AnyObj => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const isAbortSignal = (v: any): boolean => {
  const AS = (globalThis as any).AbortSignal;
  return !!AS && v instanceof AS;
};

const isSpecialObject = (v: any): boolean => {
  if (v === null || typeof v !== 'object') return false;
  if (isAbortSignal(v)) return true;

  // Add other non-plain objects that must keep their prototypes/identity
  return (
    v instanceof Date ||
    v instanceof RegExp ||
    v instanceof Map ||
    v instanceof Set ||
    v instanceof URL ||
    v instanceof URLSearchParams ||
    (typeof FormData !== 'undefined' && v instanceof FormData) ||
    (typeof Blob !== 'undefined' && v instanceof Blob) ||
    (typeof File !== 'undefined' && v instanceof File) ||
    (typeof Headers !== 'undefined' && v instanceof Headers) ||
    (typeof Request !== 'undefined' && v instanceof Request) ||
    (typeof Response !== 'undefined' && v instanceof Response) ||
    (typeof Element !== 'undefined' && v instanceof Element) // DOM nodes
  );
};

/**
 * Recursively removes all keys whose values are null or undefined.
 * - Deep-cleans only plain objects
 * - Preserves special objects (AbortSignal, Date, FormData, etc.)
 * - Removes nullish entries from arrays
 */
export const cleanNulls = (obj: any): any => {
  // Primitives and functions are returned as-is
  if (obj == null) return obj;

  if (Array.isArray(obj)) {
    // Clean items and drop null/undefined entries only
    const cleaned = obj.map(cleanNulls).filter((item) => item != null);
    return cleaned;
  }

  // Preserve special objects (including AbortSignal) without touching internals
  if (isSpecialObject(obj)) {
    return obj;
  }

  // Deep-clean only plain objects
  if (isPlainObject(obj)) {
    const out: AnyObj = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue; // drop null/undefined
      const cleaned = cleanNulls(v);
      if (cleaned != null) out[k] = cleaned;
    }
    return out;
  }

  // Non-plain objects (class instances you didn't list) are returned as-is
  return obj;
};
