export type TouchChannel = "EMAIL" | "SMS" | "PUSH";

export type TouchScheduleStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "CANCELLED"
  | "SUPERSEDED"
  | "FAILED";

export type TouchRecordStatus =
  | "SENT"
  | "DELIVERED"
  | "DELIVERY_DELAYED"
  | "BOUNCED"
  | "COMPLAINED"
  | "OPENED"
  | "CLICKED"
  | "FAILED";

export type TouchReferenceType = "SUBSCRIPTION_CYCLE";


