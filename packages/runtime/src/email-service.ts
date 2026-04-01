/**
 * Abstract email access for workflow nodes.
 *
 * Resolves the sender address for an email, returning the
 * verified custom sender if available, or the internal address.
 */

export interface EmailService {
  resolveSender(email: string): Promise<string>;
}
