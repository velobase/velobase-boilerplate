/**
 * 用户认证埋点
 *
 * Auth Funnel:
 * 1. modal_open → 2. method_select → 3a. google_redirect / 3b. email_submit
 * → 4b. email_sent → 5. login_success / login_failed
 */

export const AUTH_EVENTS = {
  // Funnel Entry
  LOGIN_MODAL_OPEN: "auth_login_modal_open",
  LOGIN_MODAL_CLOSE: "auth_login_modal_close",

  // Method Selection (replaces LOGIN_CLICK)
  LOGIN_METHOD_SELECT: "auth_login_method_select",

  // Email Flow
  EMAIL_SUBMIT: "auth_email_submit",
  EMAIL_SENT: "auth_email_sent", // Server-side
  EMAIL_LINK_CLICK: "auth_email_link_click", // When user clicks magic link

  // Results
  LOGIN_SUCCESS: "auth_login_success",
  LOGIN_FAILED: "auth_login_failed",

  // Logout
  LOGOUT: "auth_logout",

  // Legacy (kept for backward compatibility)
  LOGIN_CLICK: "auth_login_click",
} as const;

export interface AuthEventProperties {
  [AUTH_EVENTS.LOGIN_MODAL_OPEN]: {
    source: "header" | "generate_gate" | "credits_dialog" | "url";
  };

  [AUTH_EVENTS.LOGIN_MODAL_CLOSE]: {
    at_step: "main" | "email_input" | "email_sent";
  };

  [AUTH_EVENTS.LOGIN_METHOD_SELECT]: {
    method: "google" | "email";
  };

  [AUTH_EVENTS.EMAIL_SUBMIT]: {
    email_domain: string; // e.g., "gmail.com"
  };

  [AUTH_EVENTS.EMAIL_SENT]: {
    success: boolean;
    error_reason?: string;
  };

  [AUTH_EVENTS.EMAIL_LINK_CLICK]: Record<string, never>; // No properties needed

  [AUTH_EVENTS.LOGIN_SUCCESS]: {
    method: "google" | "email";
    is_new_user: boolean;
  };

  [AUTH_EVENTS.LOGIN_FAILED]: {
    method: "google" | "email";
    reason: "rate_limited" | "bounced" | "complained" | "send_failed" | "cancelled" | "disposable_email" | "unknown";
  };

  [AUTH_EVENTS.LOGOUT]: {
    source: "header" | "profile" | "sidebar" | "settings" | "other";
  };

  [AUTH_EVENTS.LOGIN_CLICK]: {
    method: "google" | "github" | "email";
  };
}
