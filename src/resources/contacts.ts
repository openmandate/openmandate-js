import type { RequestFn } from "../core.js";
import type { VerifiedContact } from "../types.js";
import { Page } from "../pagination.js";
import { PagePromise } from "../page-promise.js";

export class Contacts {
  private readonly _request: RequestFn;

  constructor(request: RequestFn) {
    this._request = request;
  }

  /**
   * List verified contacts for the authenticated user.
   *
   * Supports auto-pagination via async iteration:
   * ```ts
   * for await (const contact of client.contacts.list()) {
   *   console.log(contact.id, contact.contact_value);
   * }
   * ```
   */
  list(
    options: { limit?: number; nextToken?: string } = {},
  ): PagePromise<Page<VerifiedContact>, VerifiedContact> {
    const params: Record<string, string | number | undefined> = {};
    if (options.limit !== undefined) params.limit = options.limit;
    if (options.nextToken !== undefined) params.next_token = options.nextToken;

    return new PagePromise(
      this._request<{ items: VerifiedContact[]; next_token?: string }>(
        "GET",
        "/v1/contacts",
        { params },
      ).then(
        (data) =>
          new Page<VerifiedContact>(
            data.items,
            data.next_token ?? null,
            (token) => this.list({ ...options, nextToken: token }).then((p) => p),
          ),
      ),
    );
  }

  /**
   * Add a new contact. A verification code will be sent to the contact.
   *
   * @param options.contact_type - Type of contact. Currently only "email" is supported.
   * @param options.contact_value - The contact value (e.g. email address).
   * @param options.display_label - Optional human-readable label for this contact.
   */
  async add(options: {
    contact_type: string;
    contact_value: string;
    display_label?: string;
  }): Promise<VerifiedContact> {
    const body: Record<string, unknown> = {
      contact_type: options.contact_type,
      contact_value: options.contact_value,
    };
    if (options.display_label) body.display_label = options.display_label;
    return this._request<VerifiedContact>("POST", "/v1/contacts", { body });
  }

  /**
   * Verify a contact with a verification code.
   *
   * @param contactId - The contact ID.
   * @param options.code - The verification code sent to the contact.
   */
  async verify(
    contactId: string,
    options: { code: string },
  ): Promise<VerifiedContact> {
    const body: Record<string, unknown> = { code: options.code };
    return this._request<VerifiedContact>("POST", `/v1/contacts/${contactId}/verify`, { body });
  }

  /**
   * Delete a contact.
   *
   * @param contactId - The contact ID.
   */
  async delete(contactId: string): Promise<{ deleted: boolean }> {
    return this._request<{ deleted: boolean }>("DELETE", `/v1/contacts/${contactId}`);
  }

  /**
   * Update a contact's display label or primary status.
   *
   * @param contactId - The contact ID.
   * @param options.display_label - New human-readable label for this contact.
   * @param options.is_primary - Whether this contact should be the primary contact.
   */
  async update(
    contactId: string,
    options: { display_label?: string; is_primary?: boolean },
  ): Promise<VerifiedContact> {
    const body: Record<string, unknown> = {};
    if (options.display_label !== undefined) body.display_label = options.display_label;
    if (options.is_primary !== undefined) body.is_primary = options.is_primary;
    return this._request<VerifiedContact>("PATCH", `/v1/contacts/${contactId}`, { body });
  }

  /**
   * Resend the verification code for a pending contact.
   *
   * @param contactId - The contact ID.
   */
  async resendOtp(contactId: string): Promise<VerifiedContact> {
    return this._request<VerifiedContact>("POST", `/v1/contacts/${contactId}/resend`);
  }
}
