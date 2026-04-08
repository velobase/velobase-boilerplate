export * from "./auth";
export * from "./billing";
export * from "./navigation";

import { AUTH_EVENTS } from "./auth";
import { BILLING_EVENTS } from "./billing";
import { NAVIGATION_EVENTS } from "./navigation";

export const EVENTS = {
  ...AUTH_EVENTS,
  ...BILLING_EVENTS,
  ...NAVIGATION_EVENTS,
} as const;
