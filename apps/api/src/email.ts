import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export async function handleIncomingEmail(
  message: ForwardableEmailMessage,
  _env: object,
  _ctx: object
): Promise<void> {
  const msg = createMimeMessage();

  msg.setHeader("In-Reply-To", message.headers.get("Message-ID") || "");
  msg.setSender({ name: "Dafthunk", addr: message.to });
  msg.setRecipient(message.from);
  msg.setSubject("Email Routing Auto-reply");

  msg.addMessage({
    contentType: "text/html",
    data: `<html><body><p>We got your message, we will get back to you soon.</p></body></html>`,
  });

  msg.addMessage({
    contentType: "text/plain",
    data: `We got your message, we will get back to you soon.`,
  });

  const replyMessage = new EmailMessage(message.to, message.from, msg.asRaw());

  await message.reply(replyMessage);
}
