import Markdown from "react-markdown";

import { CONTACT_EMAIL, WEBSITE_URL } from "@/utils/constants";

const termsOfService = `
**Effective Date:** May 29, 2025  
**Last Updated:** May 29, 2025

## 1. Acceptance of Terms

Welcome to Dafthunk. These Terms of Service ("Terms") govern your use of the Dafthunk website located at [${WEBSITE_URL}](${WEBSITE_URL}) and any related services provided by Dafthunk ("we," "us," or "our").

By accessing or using our service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the service.

## 2. Description of Service

Dafthunk is an open source web-based platform that provides workflow automation and data processing tools. Our service allows users to create, manage, and execute automated workflows through an intuitive interface. The Dafthunk platform is released under the MIT License and the source code is publicly available.

## 3. User Accounts

### 3.1 Account Creation
- You must create an account to access certain features of our service
- You can register using your Google or GitHub account
- You must provide accurate and complete information during registration
- You are responsible for maintaining the confidentiality of your account credentials

### 3.2 Account Responsibilities
- You are responsible for all activities that occur under your account
- You must notify us immediately of any unauthorized use of your account
- We reserve the right to suspend or terminate accounts that violate these Terms

## 4. Acceptable Use

### 4.1 Permitted Uses
You may use our service to:
- Create and manage automated workflows
- Process data within the bounds of our platform capabilities
- Collaborate with team members on workflow projects
- Access educational and documentation resources

### 4.2 Prohibited Uses
You may not use our service to:
- Violate any applicable laws or regulations
- Infringe upon intellectual property rights of others
- Upload or transmit malicious code, viruses, or harmful content
- Attempt to gain unauthorized access to our systems
- Use the service for illegal data processing or privacy violations
- Engage in activities that could harm or disrupt our service
- Create accounts using false or misleading information
- Reverse engineer, decompile, or attempt to extract source code

## 5. Intellectual Property

### 5.1 Open Source Software
- The Dafthunk platform source code is licensed under the MIT License
- You are free to use, modify, and distribute the source code in accordance with the MIT License terms
- The MIT License grants you broad permissions while requiring only attribution

### 5.2 Trademarks and Branding
- The "Dafthunk" name, logo, and associated trademarks remain our property
- You may not use our trademarks without express written permission
- When redistributing the software, you may need to remove or replace our branding elements

### 5.3 Your Content
- You retain ownership of any data, workflows, or content you create using our service
- By using our hosted service, you grant us a license to host, store, and process your content solely to provide the service
- You are responsible for ensuring you have the right to use any data you process through our platform

### 5.4 Third-Party Components
- The Dafthunk platform may include third-party open source components
- These components are governed by their respective licenses
- A full list of third-party licenses is available in our source code repository

## 6. Privacy and Data Protection

Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our service, you consent to the collection and use of information as outlined in our Privacy Policy.

## 7. Service Availability

- We strive to maintain high service availability but cannot guarantee uninterrupted access
- We may temporarily suspend the service for maintenance, updates, or security reasons
- We will provide reasonable notice of planned maintenance when possible

## 8. Modification of Service

We reserve the right to:
- Modify, suspend, or discontinue any part of our service at any time
- Update these Terms as necessary
- Change our pricing or introduce new features

Material changes to these Terms will be communicated through our website or by email.

## 9. Termination

### 9.1 Termination by You
- You may terminate your account at any time by contacting us
- Upon termination, your access to the service will cease

### 9.2 Termination by Us
We may suspend or terminate your account if you:
- Violate these Terms
- Engage in fraudulent or illegal activities
- Abuse our service or harm other users

## 10. Disclaimers

- Our service is provided "as is" without warranties of any kind
- We do not guarantee that our service will meet your specific requirements
- We are not responsible for any data loss or corruption
- Use of our service is at your own risk

## 11. Limitation of Liability

To the maximum extent permitted by Swiss law:
- We shall not be liable for any indirect, incidental, or consequential damages
- Our total liability shall not exceed the amount you paid for the service in the preceding 12 months
- We are not liable for damages caused by third-party services or force majeure events

## 12. Indemnification

You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from:
- Your use of our service
- Your violation of these Terms
- Your violation of any third-party rights

## 13. Governing Law and Jurisdiction

These Terms are governed by the laws of Switzerland. Any disputes arising from these Terms or your use of our service shall be subject to the exclusive jurisdiction of the courts of Switzerland.

## 14. Severability

If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.

## 15. Entire Agreement

These Terms, together with our Privacy Policy, constitute the entire agreement between you and Dafthunk regarding the use of our service.

## 16. Contact Information

If you have any questions about these Terms of Service, please contact us at:

**Dafthunk**  
Email: ${CONTACT_EMAIL}  
Website: [${WEBSITE_URL}](${WEBSITE_URL})

## 17. Changes to Terms

We reserve the right to update these Terms at any time. When we do, we will post the updated Terms on this page and update the "Last Updated" date. Your continued use of our service after any changes indicates your acceptance of the new Terms.
`;

export function TermsPage() {
  return <Markdown>{termsOfService}</Markdown>;
}
