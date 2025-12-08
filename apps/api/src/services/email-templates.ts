/**
 * Email templates for application notifications
 */

export interface InvitationEmailParams {
  inviteeEmail: string;
  organizationName: string;
  inviterName: string;
  role: string;
  expiresAt: Date;
  appUrl: string;
}

/**
 * Generate invitation email content
 */
export function getInvitationEmail(params: InvitationEmailParams): {
  subject: string;
  text: string;
} {
  const { organizationName, inviterName, role, expiresAt, appUrl } = params;
  const invitationsUrl = `${appUrl}/settings/invitations`;
  const expiresFormatted = expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = `${inviterName} invited you to ${organizationName}`;

  const text = `${inviterName} invited you to join ${organizationName} on Dafthunk as a ${role}.

Join here: ${invitationsUrl}

This invite expires on ${expiresFormatted}.

—
Dafthunk · Visual workflow automation
https://dafthunk.com`;

  return { subject, text };
}
