type AnyObj = Record<string, any>;

/**
 * Checks if the provided value is a plain JavaScript object
 * (created via object literal or with a null prototype).
 */
const isPlainObject = (v: any): v is AnyObj => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Checks if the provided value is an AbortSignal instance.
 */
const isAbortSignal = (v: any): boolean => {
  const AS = (globalThis as any).AbortSignal;
  return !!AS && v instanceof AS;
};

/**
 * Safely merges two configuration objects.
 * - Deep-merges only plain objects
 * - Concatenates arrays
 * - Preserves special object types (AbortSignal, Date, FormData, etc.)
 * - Prefers values from the second object when conflicts occur
 */
export const mergeConfig = <T extends AnyObj, U extends AnyObj>(
  conf1: T,
  conf2: U
): T & U => {
  const a: AnyObj = conf1 ? { ...conf1 } : {};
  const b: AnyObj = conf2 ? { ...conf2 } : {};
  const out: AnyObj = { ...a };

  for (const key of Object.keys(b)) {
    const v1 = a[key];
    const v2 = b[key];

    // 1) Preserve AbortSignal instances — never merge them
    if (isAbortSignal(v2)) {
      out[key] = v2; // Always use the second config's signal if present
      continue;
    }
    if (isAbortSignal(v1) && !v2) {
      out[key] = v1; // Keep the first config's signal if the second doesn't override
      continue;
    }

    // 2) Merge arrays — if first value is not an array, treat it as empty
    if (Array.isArray(v2)) {
      const left = Array.isArray(v1) ? v1 : [];
      out[key] = left.concat(v2);
      continue;
    }

    // 3) Deep merge only if both values are plain objects
    if (isPlainObject(v1) && isPlainObject(v2)) {
      out[key] = mergeConfig(v1, v2);
      continue;
    }

    // 4) For primitives or special objects, prefer the second config's value
    out[key] = v2;
  }

  return out as T & U;
};
