import type { RequestFn } from "../core.js";
import type { AnswerParam, ContactParam, CorrectionParam, Mandate, Question } from "../types.js";
import { Page } from "../pagination.js";
import { PagePromise } from "../page-promise.js";
import { APITimeoutError } from "../error.js";

export class Mandates {
  private readonly _request: RequestFn;

  constructor(request: RequestFn) {
    this._request = request;
  }

  /**
   * Create a new mandate.
   *
   * @param options.category - Freeform category hint (e.g. "services", "recruiting").
   * @param options.contact - Contact information (at least one field recommended).
   * @returns The created mandate with initial pending_questions.
   */
  async create(options: { category?: string; contact?: ContactParam } = {}): Promise<Mandate> {
    const body: Record<string, unknown> = {};
    if (options.category) body.category = options.category;
    if (options.contact) body.contact = options.contact;
    return this._request<Mandate>("POST", "/v1/mandates", { body });
  }

  /**
   * Get a mandate by ID.
   *
   * @param mandateId - The mandate ID (e.g. "mnd_xxx").
   */
  async retrieve(mandateId: string): Promise<Mandate> {
    return this._request<Mandate>("GET", `/v1/mandates/${mandateId}`);
  }

  /**
   * List mandates with optional filtering.
   *
   * Supports auto-pagination via async iteration:
   * ```ts
   * for await (const mandate of client.mandates.list({ status: "active" })) {
   *   console.log(mandate.id);
   * }
   * ```
   */
  list(
    options: { status?: string; limit?: number; nextToken?: string } = {},
  ): PagePromise<Page<Mandate>, Mandate> {
    const params: Record<string, string | number | undefined> = {};
    if (options.status !== undefined) params.status = options.status;
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.nextToken !== undefined) params.next_token = options.nextToken;

    return new PagePromise(
      this._request<{ items: Mandate[]; next_token?: string }>(
        "GET",
        "/v1/mandates",
        { params },
      ).then(
        (data) =>
          new Page<Mandate>(
            data.items,
            data.next_token ?? null,
            (token) => this.list({ ...options, nextToken: token }).then((p) => p),
          ),
      ),
    );
  }

  /**
   * Submit answers to pending intake questions.
   *
   * @param mandateId - The mandate ID.
   * @param options.answers - Answers to pending questions.
   * @param options.corrections - Optional corrections to previously submitted answers.
   * @returns The updated mandate (may have new pending_questions).
   */
  async submitAnswers(
    mandateId: string,
    options: { answers: AnswerParam[]; corrections?: CorrectionParam[] },
  ): Promise<Mandate> {
    const body: Record<string, unknown> = { answers: options.answers };
    if (options.corrections?.length) body.corrections = options.corrections;
    return this._request<Mandate>("POST", `/v1/mandates/${mandateId}/answers`, { body });
  }

  /**
   * Close a mandate.
   *
   * @param mandateId - The mandate ID.
   */
  async close(mandateId: string): Promise<Mandate> {
    return this._request<Mandate>("POST", `/v1/mandates/${mandateId}/close`);
  }

  /**
   * Loop through the intake flow until all questions are answered.
   *
   * Repeatedly fetches the mandate, calls `answerFn` with pending questions,
   * submits the answers, and repeats until there are no more pending questions.
   *
   * @param mandateId - The mandate ID.
   * @param answerFn - Receives pending questions, returns answers. May be async.
   * @returns The mandate after intake is complete (status: "active").
   */
  async completeIntake(
    mandateId: string,
    answerFn: (questions: Question[]) => AnswerParam[] | Promise<AnswerParam[]>,
  ): Promise<Mandate> {
    let mandate = await this.retrieve(mandateId);
    while (mandate.pending_questions.length > 0) {
      const answers = await answerFn(mandate.pending_questions);
      mandate = await this.submitAnswers(mandateId, { answers });
    }
    return mandate;
  }

  /**
   * Poll a mandate until its status becomes "matched".
   *
   * @param mandateId - The mandate ID.
   * @param options.timeout - Max wait time in ms. Defaults to 300000 (5 minutes).
   * @param options.pollInterval - Time between polls in ms. Defaults to 5000 (5 seconds).
   * @returns The mandate with status "matched".
   * @throws {APITimeoutError} If the timeout elapses without a match.
   */
  async waitForMatch(
    mandateId: string,
    options: { timeout?: number; pollInterval?: number } = {},
  ): Promise<Mandate> {
    const timeout = options.timeout ?? 300_000;
    const pollInterval = options.pollInterval ?? 5_000;
    const deadline = Date.now() + timeout;

    for (;;) {
      const mandate = await this.retrieve(mandateId);
      if (mandate.status === "matched") return mandate;
      if (Date.now() >= deadline) {
        throw new APITimeoutError(
          `Mandate ${mandateId} did not match within ${timeout}ms. Current status: ${mandate.status}`,
        );
      }
      const remaining = deadline - Date.now();
      await new Promise((resolve) => setTimeout(resolve, Math.min(pollInterval, Math.max(remaining, 0))));
    }
  }
}
