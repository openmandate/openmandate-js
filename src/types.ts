// --- Shared types ---

export type ContactType = "email";

export type VerificationStatus = "pending" | "verified";

export interface VerifiedContact {
  id: string;
  contact_type: ContactType;
  contact_value: string;
  display_label: string;
  status: VerificationStatus;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface Contact {
  email?: string | null;
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionConstraints {
  min_length?: number | null;
  max_length?: number | null;
}

export interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options?: QuestionOption[] | null;
  constraints?: QuestionConstraints | null;
  allow_custom?: boolean;
}

export interface IntakeAnswer {
  question_id: string;
  question_text: string;
  value: string;
  question_type: string;
  question_options?: QuestionOption[] | null;
}

export interface Strength {
  label: string;
  description: string;
}

export interface Concern {
  label: string;
  description: string;
}

export interface Compatibility {
  grade: string;
  grade_label: string;
  summary: string;
  strengths: Strength[];
  concerns: Concern[];
}

// --- Mandate ---

export type MandateStatus =
  | "intake"
  | "processing"
  | "active"
  | "pending_input"
  | "matched"
  | "closed";

export type CloseReason = "user_closed" | "matched";

export interface Mandate {
  id: string;
  status: MandateStatus;
  category?: string | null;
  created_at: string;
  closed_at?: string | null;
  close_reason?: CloseReason | null;
  expires_at?: string | null;
  source?: string | null;
  summary?: string | null;
  match_id?: string | null;
  contact_ids: string[];
  pending_questions: Question[];
  intake_answers: IntakeAnswer[];
}

// --- Match ---

export type MatchStatus =
  | "pending"
  | "accepted"
  | "confirmed"
  | "declined"
  | "closed";

export interface Match {
  id: string;
  status: MatchStatus;
  mandate_id: string;
  created_at: string;
  responded_at?: string | null;
  confirmed_at?: string | null;
  compatibility?: Compatibility | null;
  contact?: Contact | null;
}

// --- Params ---

export interface AnswerParam {
  question_id: string;
  value: string;
}

export interface CorrectionParam {
  question_id: string;
  value: string;
}
