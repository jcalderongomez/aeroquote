export const MemberRole = {
  ADMIN: "ADMIN",
  COMMERCIAL: "COMMERCIAL",
  OPERATOR: "OPERATOR",
} as const;

export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

export const QuoteStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  IN_REVIEW: "IN_REVIEW",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];
