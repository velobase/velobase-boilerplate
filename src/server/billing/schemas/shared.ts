import { z } from "zod";

/**
 * Shared billing enums and types
 */
export const BillingAccountTypeSchema = z.enum(["UNDEFINED", "QUOTA", "CREDIT"]);

export const BillingSubAccountTypeSchema = z.enum([
  "UNDEFINED",
  "DEFAULT",
  "FREE_TRIAL",
  "MEMBERSHIP",
  "ORDER",
  "DAILY_LOGIN",
  "FIRST_LOGIN",
  "PROMO_CODE",
]);

export const BillingBusinessTypeSchema = z.enum([
  "UNDEFINED",
  "TASK",
  "ORDER",
  "MEMBERSHIP",
  "SUBSCRIPTION",
  "FREE_TRIAL",
  "ADMIN_GRANT",
]);

