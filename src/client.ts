import { VERSION } from "./version.js";
import { APIConnectionError, APITimeoutError, makeAPIError } from "./error.js";
import { Contacts } from "./resources/contacts.js";
import { Mandates } from "./resources/mandates.js";
import { Matches } from "./resources/matches.js";

const DEFAULT_BASE_URL = "https://api.openmandate.ai";
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const API_KEY_ENV_VAR = "OPENMANDATE_API_KEY";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 8_000;

export interface OpenMandateOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

export class OpenMandate {
  readonly contacts: Contacts;
  readonly mandates: Mandates;
  readonly matches: Matches;

  private readonly _apiKey: string;
  private readonly _baseURL: string;
  private readonly _timeout: number;
  private readonly _maxRetries: number;

  constructor(options: OpenMandateOptions = {}) {
    this._apiKey =
      options.apiKey ??
      (typeof process !== "undefined" ? process.env?.[API_KEY_ENV_VAR] ?? "" : "");

    if (!this._apiKey) {
      throw new Error(
        `No API key provided. Pass apiKey in options or set the ${API_KEY_ENV_VAR} environment variable.`,
      );
    }

    this._baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this._timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this._maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    this.contacts = new Contacts(this._request.bind(this));
    this.mandates = new Mandates(this._request.bind(this));
    this.matches = new Matches(this._request.bind(this));
  }

  async _request<T = unknown>(
    method: string,
    path: string,
    options?: {
      body?: Record<string, unknown>;
      params?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    let url = `${this._baseURL}${path}`;

    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const reqHeaders: Record<string, string> = {
      Authorization: `Bearer ${this._apiKey}`,
      Accept: "application/json",
      "User-Agent": `openmandate-js/${VERSION}`,
    };

    if (options?.body !== undefined) {
      reqHeaders["Content-Type"] = "application/json";
    }

    const bodyStr = options?.body !== undefined ? JSON.stringify(options.body) : undefined;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this._timeout);

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: reqHeaders,
          body: bodyStr,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          lastError = new APITimeoutError(`Request timed out: ${method} ${path}`);
        } else {
          lastError = new APIConnectionError(
            `Failed to connect: ${method} ${path}${err instanceof Error ? ` — ${err.message}` : ""}`,
          );
        }
        if (attempt < this._maxRetries) {
          await sleep(calculateRetryDelay(attempt));
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timeoutId);
      }

      const responseHeaders = headersToRecord(response.headers);

      if (response.status === 204) {
        return undefined as T;
      }

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < this._maxRetries) {
        const retryAfter = parseRetryAfterHeader(response.headers.get("retry-after"));
        await sleep(retryAfter ?? calculateRetryDelay(attempt));
        continue;
      }

      const text = await response.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw makeAPIError(response.status, null, responseHeaders);
      }

      if (!response.ok) {
        throw makeAPIError(response.status, parsed as Record<string, unknown> | null, responseHeaders);
      }

      return parsed as T;
    }

    throw lastError ?? new APIConnectionError(`Request failed after ${this._maxRetries + 1} attempts: ${method} ${path}`);
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function calculateRetryDelay(attempt: number): number {
  const base = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(base, MAX_RETRY_DELAY_MS);
  const jitter = capped * (1 - Math.random() * 0.25);
  return jitter;
}

function parseRetryAfterHeader(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds <= 60 ? seconds * 1000 : seconds;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
