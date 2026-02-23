/**
 * Shared request function signature used by resource classes.
 */
export type RequestFn = <T = unknown>(
  method: string,
  path: string,
  options?: {
    body?: Record<string, unknown>;
    params?: Record<string, string | number | undefined>;
  },
) => Promise<T>;
