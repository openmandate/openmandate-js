export { OpenMandate } from "./client.js";
export type { OpenMandateOptions } from "./client.js";

export {
  OpenMandateError,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APITimeoutError,
} from "./error.js";

export { Page } from "./pagination.js";
export { PagePromise } from "./page-promise.js";

export { Contacts } from "./resources/contacts.js";

export type {
  Mandate,
  MandateStatus,
  CloseReason,
  Match,
  MatchStatus,
  Contact,
  ContactType,
  VerifiedContact,
  VerificationStatus,
  Question,
  QuestionOption,
  QuestionConstraints,
  IntakeAnswer,
  Compatibility,
  Strength,
  Concern,
  AnswerParam,
  CorrectionParam,
} from "./types.js";
