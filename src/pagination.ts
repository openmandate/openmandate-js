/**
 * A page of results from a list endpoint.
 *
 * Supports async iteration for auto-pagination across all pages:
 *
 * ```ts
 * for await (const mandate of client.mandates.list()) {
 *   console.log(mandate.id);
 * }
 * ```
 */
export class Page<T> {
  readonly items: T[];
  readonly nextToken: string | null;
  private readonly _fetchNext: ((token: string) => Promise<Page<T>>) | null;

  constructor(
    items: T[],
    nextToken: string | null,
    fetchNext: ((token: string) => Promise<Page<T>>) | null = null,
  ) {
    this.items = items;
    this.nextToken = nextToken;
    this._fetchNext = fetchNext;
  }

  get length(): number {
    return this.items.length;
  }

  hasNextPage(): boolean {
    return this.nextToken !== null;
  }

  async getNextPage(): Promise<Page<T> | null> {
    if (this.nextToken === null || this._fetchNext === null) return null;
    return this._fetchNext(this.nextToken);
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    let page: Page<T> | null = this; // eslint-disable-line @typescript-eslint/no-this-alias
    while (page !== null) {
      for (const item of page.items) {
        yield item;
      }
      page = await page.getNextPage();
    }
  }
}
