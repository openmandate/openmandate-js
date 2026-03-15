import type { RequestFn } from "../core.js";
import type { Match } from "../types.js";
import { Page } from "../pagination.js";
import { PagePromise } from "../page-promise.js";

export class Matches {
  private readonly _request: RequestFn;

  constructor(request: RequestFn) {
    this._request = request;
  }

  /**
   * List matches for the authenticated user.
   *
   * Supports auto-pagination via async iteration:
   * ```ts
   * for await (const match of client.matches.list()) {
   *   console.log(match.id, match.compatibility?.grade_label);
   * }
   * ```
   */
  list(
    options: { limit?: number; nextToken?: string } = {},
  ): PagePromise<Page<Match>, Match> {
    const params: Record<string, string | number | undefined> = {};
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.nextToken !== undefined) params.next_token = options.nextToken;

    return new PagePromise(
      this._request<{ items: Match[]; next_token?: string }>(
        "GET",
        "/v1/matches",
        { params },
      ).then(
        (data) =>
          new Page<Match>(
            data.items,
            data.next_token ?? null,
            (token) => this.list({ ...options, nextToken: token }).then((p) => p),
          ),
      ),
    );
  }

  /**
   * Get a match by ID.
   *
   * @param matchId - The match ID (e.g. "m_xxx").
   */
  async retrieve(matchId: string): Promise<Match> {
    return this._request<Match>("GET", `/v1/matches/${matchId}`);
  }

  /**
   * Accept a match. Both parties must accept for contact info to be revealed.
   *
   * @param matchId - The match ID.
   */
  async accept(matchId: string): Promise<Match> {
    return this._request<Match>("POST", `/v1/matches/${matchId}/accept`);
  }

  /**
   * Decline a match.
   *
   * @param matchId - The match ID.
   */
  async decline(matchId: string): Promise<Match> {
    return this._request<Match>("POST", `/v1/matches/${matchId}/decline`);
  }
}
