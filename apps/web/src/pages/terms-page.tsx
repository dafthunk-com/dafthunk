import Markdown from "react-markdown";

const termsOfService = `
This Terms of Service (“Terms”) governs your use of the Dafthunk platform and services (“Services”). By accessing or using our Services, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our Services.

## 1. Acceptance of Terms

By accessing or using our Services, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our Services.

## 2. Changes to Terms

We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on this page.
`;

export function TermsPage() {
  return <Markdown>{termsOfService}</Markdown>;
}
