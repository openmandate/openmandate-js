# OpenMandate JavaScript SDK

The official TypeScript/JavaScript SDK for [OpenMandate](https://openmandate.ai).
Post mandates, check status, and receive matches through the OpenMandate API.

OpenMandate helps founders find cofounders and early teammates beyond their
network. Describe what you need and what you offer. OpenMandate keeps working
on your behalf and introduces both sides when there is strong mutual fit.

## Installation

```bash
npm install openmandate
```

## Quick Start

```ts
import { OpenMandate } from "openmandate";

const client = new OpenMandate({ apiKey: "om_live_..." });

// Create a mandate with want + offer
const mandate = await client.mandates.create({
  want: "Looking for a UX agency for our B2B dashboard",
  offer: "Series A fintech, $1.8M ARR, two frontend engineers ready",
});
console.log(`Created: ${mandate.id}, status: ${mandate.status}`);

// Answer follow-up questions
let current = mandate;
while (current.pending_questions.length > 0) {
  const answers = current.pending_questions.map((q) => ({
    question_id: q.id,
    value: "I'm a freelance designer looking for small business clients.",
  }));
  current = await client.mandates.submitAnswers(mandate.id, { answers });
}

// Wait for a match (polls until matched or timeout)
const matched = await client.mandates.waitForMatch(mandate.id, { timeout: 600_000 });
console.log(`Matched! Match ID: ${matched.match_id}`);

// View and accept the match
const match = await client.matches.retrieve(matched.match_id!);
console.log(`Grade: ${match.compatibility?.grade_label}`);
await client.matches.accept(match.id);
```

## Authentication

Pass your API key directly or set the `OPENMANDATE_API_KEY` environment variable:

```ts
// Explicit
const client = new OpenMandate({ apiKey: "om_live_..." });

// From environment
const client = new OpenMandate(); // reads OPENMANDATE_API_KEY
```

## Configuration

```ts
const client = new OpenMandate({
  apiKey: "om_live_...",
  baseURL: "https://api.openmandate.ai", // default
  timeout: 120_000,                       // ms, default 60000
  maxRetries: 2,                          // default 2
});
```

## API Reference

### Mandates

#### `client.mandates.create(options)`

Create a new mandate with want and offer.

```ts
const mandate = await client.mandates.create({
  want: "Looking for a UX agency for our B2B dashboard",
  offer: "Series A fintech, $1.8M ARR, two frontend engineers ready",
});
```

**Parameters:**
- `want` (string, required): What you are looking for. Minimum 20 characters.
- `offer` (string, required): What you bring to the table. Minimum 20 characters.

Primary verified contact is auto-selected.

**Returns:** `Mandate` with follow-up questions in `pending_questions`.

---

#### `client.mandates.retrieve(mandateId)`

Get a mandate by ID.

```ts
const mandate = await client.mandates.retrieve("mnd_abc123");
```

**Returns:** `Mandate`

---

#### `client.mandates.list(options?)`

List mandates with optional filtering. Returns open mandates by default (excludes closed). Returns a `PagePromise` — both awaitable and async-iterable.

```ts
// List open mandates (default — excludes closed)
const page = await client.mandates.list();

// List only closed mandates
const closed = await client.mandates.list({ status: "closed" });

// Iterate directly (no double-await needed)
for await (const mandate of client.mandates.list({ status: "active" })) {
  console.log(mandate.id);
}

// Or await to get a Page object
const activePage = await client.mandates.list({ status: "active", limit: 10 });
console.log(activePage.items);
console.log(activePage.hasNextPage());
```

**Parameters:**
- `status` (string, optional): Filter by status (`intake`, `active`, `pending_input`, `matched`, `closed`). Returns open mandates by default.
- `limit` (number, optional): Max items per page.
- `nextToken` (string, optional): Pagination cursor.

**Returns:** `PagePromise<Page<Mandate>, Mandate>`

---

#### `client.mandates.submitAnswers(mandateId, options)`

Submit answers to pending intake questions.

```ts
const mandate = await client.mandates.submitAnswers("mnd_abc123", {
  answers: [
    { question_id: "q_001", value: "Looking for a technical co-founder" },
    { question_id: "q_002", value: "fintech" },
  ],
});
```

**Parameters:**
- `mandateId` (string): The mandate ID.
- `options.answers` (AnswerParam[]): Answers to submit. Each has `question_id` and `value`.
- `options.corrections` (CorrectionParam[], optional): Corrections to previous answers.

**Returns:** `Mandate` (may contain new `pending_questions`)

---

#### `client.mandates.close(mandateId)`

Close a mandate.

```ts
const mandate = await client.mandates.close("mnd_abc123");
```

**Returns:** `Mandate`

---

#### `client.mandates.completeIntake(mandateId, answerFn)`

High-level helper that loops through intake until all questions are answered.

```ts
const mandate = await client.mandates.completeIntake("mnd_abc123", (questions) =>
  questions.map((q) => ({ question_id: q.id, value: `Answer for: ${q.text}` })),
);
```

**Parameters:**
- `mandateId` (string): The mandate ID.
- `answerFn` (function): Receives `Question[]`, returns `AnswerParam[]` (or a Promise of them).

**Returns:** `Mandate` with no remaining `pending_questions`

---

#### `client.mandates.waitForMatch(mandateId, options?)`

Poll a mandate until it reaches `matched` status.

```ts
const mandate = await client.mandates.waitForMatch("mnd_abc123", { timeout: 600_000 });
```

**Parameters:**
- `mandateId` (string): The mandate ID.
- `options.timeout` (number): Max wait in ms. Default 300000 (5 min).
- `options.pollInterval` (number): Ms between polls. Default 5000.

**Returns:** `Mandate` with status `matched`

**Throws:** `APITimeoutError` if timeout elapses

---

### Contacts

#### `client.contacts.list(options?)`

List your verified contacts.

```ts
for await (const contact of client.contacts.list()) {
  console.log(`${contact.contact_value} (${contact.status})`);
}
```

**Returns:** `PagePromise<Page<VerifiedContact>, VerifiedContact>`

---

#### `client.contacts.add(options)`

Add a new contact. Sends a verification code.

```ts
const contact = await client.contacts.add({
  contact_type: "email",
  contact_value: "work@example.com",
  display_label: "Work",
});
// contact.status === "pending" — check email for OTP
```

**Returns:** `VerifiedContact` with `status: "pending"`

---

#### `client.contacts.verify(contactId, options)`

Verify a contact with the OTP code.

```ts
const contact = await client.contacts.verify("vc_abc123", { code: "12345678" });
```

**Returns:** `VerifiedContact` with `status: "verified"`

---

#### `client.contacts.update(contactId, options)`

Update a contact's label or set it as primary.

```ts
await client.contacts.update("vc_abc123", { is_primary: true });
```

**Returns:** `VerifiedContact`

---

#### `client.contacts.delete(contactId)`

Delete a contact. Cannot delete your last verified contact.

```ts
await client.contacts.delete("vc_abc123");
```

**Returns:** `{ deleted: boolean }`

---

#### `client.contacts.resendOtp(contactId)`

Resend the verification code for a pending contact.

```ts
await client.contacts.resendOtp("vc_abc123");
```

**Returns:** `VerifiedContact`

---

### Matches

#### `client.matches.list(options?)`

List matches. Returns a `PagePromise`.

```ts
for await (const match of client.matches.list()) {
  console.log(`${match.id}: ${match.status}`);
}
```

**Parameters:**
- `limit` (number, optional): Max items per page.
- `nextToken` (string, optional): Pagination cursor.

**Returns:** `PagePromise<Page<Match>, Match>`

---

#### `client.matches.retrieve(matchId)`

Get a match by ID.

```ts
const match = await client.matches.retrieve("m_abc123");
console.log(match.compatibility?.grade_label);
```

**Returns:** `Match`

---

#### `client.matches.accept(matchId)`

Accept a match.

```ts
const match = await client.matches.accept("m_abc123");
```

**Returns:** `Match`

---

#### `client.matches.decline(matchId)`

Decline a match.

```ts
const match = await client.matches.decline("m_abc123");
```

**Returns:** `Match`

#### `client.matches.submitOutcome(matchId, outcome)`

Report how a confirmed match went. Available after both parties accepted.

```ts
const match = await client.matches.submitOutcome("m_abc123", "succeeded");
```

| Outcome | Effect |
|---------|--------|
| `"succeeded"` | Found the right person. Mandate closes. |
| `"ongoing"` | Still in conversation. |
| `"failed"` | Didn't work out. Mandate reactivates. |

**Returns:** `Match`

---

## Pagination

List methods return a `PagePromise` — use it directly with `for await` or `await` it to get a `Page`:

```ts
// Auto-paginate across all pages
for await (const mandate of client.mandates.list()) {
  console.log(mandate.id);
}

// Manual page-by-page
let page = await client.mandates.list({ limit: 10 });
console.log(page.items);

while (page.hasNextPage()) {
  page = (await page.getNextPage())!;
  console.log(page.items);
}
```

## Retries

The SDK automatically retries on connection errors, timeouts, rate limits (429), and server errors (5xx) with exponential backoff:

```ts
const client = new OpenMandate({
  maxRetries: 2, // default: 2 (3 total attempts)
});
```

Set `maxRetries: 0` to disable retries. The SDK respects `Retry-After` headers.

## Error Handling

All API errors inherit from `OpenMandateError`. HTTP errors include response `headers` and `requestID` for debugging:

```ts
import {
  OpenMandate,
  APIError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from "openmandate";

const client = new OpenMandate();

try {
  await client.mandates.retrieve("mnd_nonexistent");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Mandate not found");
  } else if (err instanceof AuthenticationError) {
    console.log("Bad API key");
  } else if (err instanceof RateLimitError) {
    console.log("Slow down!");
  } else if (err instanceof APIError) {
    console.log(`API error ${err.statusCode}: ${err.message}`);
    console.log(`Request ID: ${err.requestID}`);
    console.log(`Headers:`, err.headers);
  }
}
```

### Exception Hierarchy

```
OpenMandateError
  APIError (statusCode, code, details, headers, requestID)
    BadRequestError (400)
    AuthenticationError (401)
    PermissionDeniedError (403)
    NotFoundError (404)
    ConflictError (409)
    ValidationError (422)
    RateLimitError (429)
    InternalServerError (5xx)
  APIConnectionError
    APITimeoutError
```

## Requirements

- Any runtime with native `fetch` — Node.js 18+, Deno, Bun, Cloudflare Workers
- TypeScript 5.4+ (optional, for type checking)
