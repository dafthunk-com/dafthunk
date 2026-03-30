/**
 * Email templates for application notifications
 */

export interface WelcomeEmailParams {
  userName: string;
  appUrl: string;
  websiteUrl: string;
  onboardingUrl?: string;
}

/**
 * Generate welcome email content for new users
 */
export function getWelcomeEmail(params: WelcomeEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const { userName, appUrl, websiteUrl, onboardingUrl } = params;
  const docsUrl = `${appUrl}/docs/concepts`;

  const subject = "Welcome to Dafthunk";

  const text = `Let's automate something${userName ? `, ${userName}` : ""}.

Dafthunk is a visual way to build serverless workflows on Cloudflare. Drag nodes, connect them, deploy to the edge.

Here are some quick tips:
• Start from a use case template to see how nodes wire together
• Experiment with AI nodes (Claude, GPT, Gemini, Replicate) in the playground
• Add a trigger: webhooks, requests, email, cron, queues, or bots
• Connect integrations like GitHub, Discord, Telegram or Gmail
• Browse the Nodes Reference to see all 400+ available nodes
• Bonus: it's open source (MIT). Self-host it and contribute

${onboardingUrl ? `Want a walkthrough? Book an onboarding session: ${onboardingUrl}\n\n` : ""}Docs: ${docsUrl}
Questions? GitHub issues or Discord.

Happy automating,
Bertil Chapuis

—
Dafthunk · Visual workflow automation
${websiteUrl}`;

  const html = `<p>Let's automate something${userName ? `, ${userName}` : ""}.</p>
<p>Dafthunk is a visual way to build serverless workflows on Cloudflare. Drag nodes, connect them, deploy to the edge.</p>
<p>Here are some quick tips:</p>
<ul>
<li>Start from a use case template to see how nodes wire together</li>
<li>Experiment with AI nodes (Claude, GPT, Gemini, Replicate) in the playground</li>
<li>Add a trigger: webhooks, requests, email, cron, queues, or bots</li>
<li>Connect integrations like GitHub, Discord, Telegram or Gmail</li>
<li>Browse the Nodes Reference to see all 400+ available nodes</li>
<li>Bonus: it's open source (MIT). Self-host it and contribute</li>
</ul>
${onboardingUrl ? `<p>Want a walkthrough? <a href="${onboardingUrl}">Book an onboarding session</a></p>\n` : ""}<p><a href="${docsUrl}">Docs</a></p>
<p>Questions? GitHub issues or Discord.</p>
<p>Happy automating,<br>Bertil Chapuis</p>
<p>—<br>Dafthunk · Visual workflow automation<br><a href="${websiteUrl}">${websiteUrl}</a></p>`;

  return { subject, text, html };
}

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
<p>This invite expires on ${expiresFormatted}.</p>
<p>—<br>Dafthunk · Visual workflow automation<br><a href="${websiteUrl}">${websiteUrl}</a></p>`;

  return { subject, text, html };
}
