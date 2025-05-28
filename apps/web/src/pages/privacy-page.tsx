import Markdown from "react-markdown";

const privacyPolicy = `
This Privacy Policy explains how we collect, use, and share your personal information when you use our website and services.

## Information We Collect

We collect information from you when you register on our site, place an order, subscribe to our newsletter, respond to a survey or fill out a form.
`;

export function PrivacyPage() {
  return <Markdown>{privacyPolicy}</Markdown>;
}
