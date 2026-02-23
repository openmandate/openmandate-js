import type { Page } from "./pagination.js";

/**
 * A promise that resolves to a Page, but can also be used directly as an
 * AsyncIterable. This eliminates the "double await" problem:
 *
 * ```ts
 * // Before: awkward double-await
 * for await (const m of await client.mandates.list()) { ... }
 *
 * // After: clean single expression
 * for await (const m of client.mandates.list()) { ... }
 *
 * // Awaiting still works when you need the Page object
 * const page = await client.mandates.list();
 * ```
 */
export class PagePromise<P extends Page<I>, I>
  implements PromiseLike<P>, AsyncIterable<I>
{
  private readonly _promise: Promise<P>;

  constructor(promise: Promise<P>) {
    this._promise = promise;
  }

  then<T1 = P, T2 = never>(
    onfulfilled?: ((value: P) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return this._promise.then(onfulfilled, onrejected);
  }

  catch<T = never>(
    onrejected?: ((reason: unknown) => T | PromiseLike<T>) | null,
  ): Promise<P | T> {
    return this._promise.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<P> {
    return this._promise.finally(onfinally);
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<I> {
    const page = await this._promise;
    yield* page;
  }
}
