/**
 * Billing constants
 *
 * Central source of truth for all billing-related values.
 */

/**
 * Number of compute credits included in Pro subscription per billing period.
 * Usage beyond this amount is billed as overage.
 */
export const PRO_INCLUDED_CREDITS = 10000;

/**
 * Number of one-time compute credits for Trial accounts.
 * Execution blocks when exhausted.
 */
export const TRIAL_CREDITS = 10000;
