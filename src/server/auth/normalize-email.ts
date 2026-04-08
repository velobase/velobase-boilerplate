/**
 * Email Normalization for Identity Deduplication
 * 
 * Gmail allows various aliases that all route to the same mailbox:
 * - Dots are ignored: john.doe@gmail.com = johndoe@gmail.com
 * - Plus addressing: johndoe+tag@gmail.com = johndoe@gmail.com
 * - googlemail.com = gmail.com
 * 
 * This module normalizes emails to prevent users from creating
 * multiple accounts with Gmail aliases to abuse free quotas.
 */

const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];

/**
 * Normalize email address for identity deduplication
 * 
 * Only Gmail addresses are normalized (other providers are left as-is)
 * 
 * @param email - Raw email address
 * @returns Normalized email (lowercase, Gmail-specific rules applied)
 * 
 * @example
 * normalizeEmail('John.Doe@Gmail.com') // 'johndoe@gmail.com'
 * normalizeEmail('john.doe+newsletter@gmail.com') // 'johndoe@gmail.com'
 * normalizeEmail('user@company.com') // 'user@company.com' (unchanged)
 */
export function normalizeEmail(email: string): string {
  if (!email?.includes('@')) {
    return email?.toLowerCase() ?? '';
  }

  const [localPart, domain] = email.toLowerCase().split('@');
  
  if (!localPart || !domain) {
    return email.toLowerCase();
  }

  // Only normalize Gmail addresses
  if (!GMAIL_DOMAINS.includes(domain)) {
    return email.toLowerCase();
  }

  // Gmail normalization rules:
  // 1. Remove all dots from local part
  // 2. Remove everything after + (plus addressing)
  // 3. Normalize googlemail.com to gmail.com
  
  let normalized = localPart.replace(/\./g, '');
  
  const plusIndex = normalized.indexOf('+');
  if (plusIndex !== -1) {
    normalized = normalized.substring(0, plusIndex);
  }

  return `${normalized}@gmail.com`;
}

/**
 * Check if two emails resolve to the same identity
 * 
 * @example
 * isSameEmail('john.doe@gmail.com', 'johndoe@gmail.com') // true
 * isSameEmail('john@gmail.com', 'john@yahoo.com') // false
 */
export function isSameEmail(email1: string, email2: string): boolean {
  return normalizeEmail(email1) === normalizeEmail(email2);
}

/**
 * Check if email is a Gmail address (including googlemail.com)
 */
export function isGmailAddress(email: string): boolean {
  if (!email?.includes('@')) {
    return false;
  }
  const domain = email.toLowerCase().split('@')[1];
  return GMAIL_DOMAINS.includes(domain ?? '');
}

