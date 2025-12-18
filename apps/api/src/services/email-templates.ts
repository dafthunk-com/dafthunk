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
  websiteUrl: string;
}

/**
 * Generate invitation email content
 */
export function getInvitationEmail(params: InvitationEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const { organizationName, inviterName, role, expiresAt, appUrl, websiteUrl } =
    params;
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
${websiteUrl}`;

  const html = `<p>${inviterName} invited you to join ${organizationName} on Dafthunk as a ${role}.</p>
<p><a href="${invitationsUrl}">View Invitation</a></p>
<p>This invite expires on ${expiresFormatted}.</p>`;

  return { subject, text, html };
}
