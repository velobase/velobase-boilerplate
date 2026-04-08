/**
 * Payment-related feature flags / constants.
 *
 * Keep these as compile-time constants so behavior is easy to toggle
 * without touching scattered call-sites.
 */

/**
 * When enabled:
 * - ALL non-subscription purchases will prompt gateway selection
 *   (Telegram Stars vs Crypto) via PaymentSelectionDialog.
 *
 * Note: this is FRONTEND-ONLY; backend behavior is unchanged.
 */
export const FORCE_GATEWAY_SELECTION_FOR_ALL_USERS = false;


