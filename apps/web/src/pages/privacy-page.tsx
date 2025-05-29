import Markdown from "react-markdown";

const privacyPolicy = `
**Effective Date:** May 29, 2025  
**Last Updated:** May 29, 2025

## 1. Introduction

Welcome to Dafthunk ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website [www.dafthunk.com](https://www.dafthunk.com) and use our services.

Dafthunk is an open source platform released under the MIT License. While our source code is publicly available, this Privacy Policy governs how we handle your personal data when you use our hosted services.

## 2. Information We Collect

### 2.1 Personal Information
When you create an account or use our services, we may collect:
- **Authentication Information:** When you sign in using Google or GitHub, we receive your email address, name, and profile information from these providers
- **Account Data:** Username, email address, and profile preferences
- **Usage Data:** Information about how you interact with our platform

### 2.2 Automatically Collected Information
- **Cookies:** We use cookies for authentication and to maintain your session
- **Analytics Data:** Through Cloudflare Analytics, we collect anonymized usage statistics, page views, and performance metrics
- **Technical Information:** IP address, browser type, device information, and access times

## 3. How We Use Your Information

We use your information to:
- Provide and maintain our services
- Authenticate your identity and manage your account
- Improve our platform and user experience
- Analyze usage patterns and optimize performance
- Communicate with you about service updates
- Ensure security and prevent fraud

## 4. Third-Party Services

We use the following third-party services:

### 4.1 Authentication Providers
- **Google OAuth:** For Google account authentication
- **GitHub OAuth:** For GitHub account authentication

### 4.2 Analytics and Infrastructure
- **Cloudflare:** For analytics, performance monitoring, and security
  - Cloudflare may collect anonymized usage data
  - Data is processed according to Cloudflare's privacy policy

## 5. Cookies and Tracking

We use cookies for:
- **Authentication:** To keep you logged in to your account
- **Session Management:** To maintain your preferences during your visit
- **Security:** To protect against unauthorized access

You can control cookies through your browser settings, but disabling cookies may affect the functionality of our services.

## 6. Data Sharing and Disclosure

We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:
- With your explicit consent
- To comply with legal obligations or court orders
- To protect our rights, property, or safety
- In connection with a business transfer or merger

## 7. Your Rights

Under Swiss data protection law and GDPR (where applicable), you have the right to:
- **Access:** Request a copy of your personal data
- **Rectification:** Correct inaccurate or incomplete information
- **Erasure:** Request deletion of your personal data
- **Portability:** Receive your data in a structured, machine-readable format
- **Restriction:** Limit the processing of your data
- **Objection:** Object to certain types of data processing
- **Withdraw Consent:** Withdraw consent at any time where processing is based on consent

To exercise these rights, please contact us using the information provided below.

## 8. Data Retention

We retain your personal information only as long as necessary to:
- Provide our services to you
- Comply with legal obligations
- Resolve disputes and enforce agreements

When you delete your account, we will delete your personal information within 30 days, except where retention is required by law.

## 9. Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.

## 10. International Data Transfers

As we are based in Switzerland, your data is primarily processed within the European Economic Area. Any data transfers to third countries are conducted with appropriate safeguards in accordance with applicable data protection laws.

## 11. Children's Privacy

Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.

## 12. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last Updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.

## 13. Contact Us

If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:

**Dafthunk**  
Email: privacy@dafthunk.com  
Website: [www.dafthunk.com](https://www.dafthunk.com)

For data protection inquiries, you may also contact the Swiss Federal Data Protection and Information Commissioner (FDPIC) if you believe your rights have been violated.
`;

export function PrivacyPage() {
  return <Markdown>{privacyPolicy}</Markdown>;
}
