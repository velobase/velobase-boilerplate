/**
 * Email Service Module
 *
 * Provides email sending functionality using Resend.
 * Used primarily for authentication (Magic Link) emails.
 */

export { resend, sendMagicLinkEmail } from "./resend";
export { MagicLinkEmailTemplate } from "./templates/magic-link";

