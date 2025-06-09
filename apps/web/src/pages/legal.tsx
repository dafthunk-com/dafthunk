import Markdown from "react-markdown";

export function LegalPage() {
  const legal = `
**Effective Date:** June 9, 2025

These Terms of Service and Privacy Policy explains how we collect, use, and share your personal information when you use our service, and your rights regarding that information.

By using Dafthunk, you agree to these Terms of Service and Privacy Policy.

## 1. Alpha Release and AI-Generated Components

Dafthunk is currently in an **alpha release stage** and is under active development. Parts of the service, including its core functionalities, are developed using **generative AI technologies**. As such:

* The service may contain bugs, errors, or unexpected behaviors.
* We make no guarantees regarding the availability, accuracy, completeness, or suitability of the service for any particular purpose.

By using Dafthunk, you acknowledge and accept these limitations and understand that you are using the service **at your own risk**.

## 2. Information We Collect

We collect the following personal information:

* **Account Information:** Username, email address.
* **Authentication Data:** If you choose to sign in via Google or GitHub, we receive your basic profile information from these services (name, email).
* **Workflow and Execution Data:** Information related to workflows and their executions, including but not limited to workflow definitions, inputs, outputs, intermediary results, execution metadata, and related data.
* **Billing Information:** Collected and processed by Stripe (see Section 5).

We do not collect sensitive personal data unless it is intentionally provided by the user as part of workflow executions, in which case the user is solely responsible for ensuring that the processing of such data complies with applicable data protection laws.

## 3. How We Collect Information

We collect personal information when you:

* Register for an account.
* Sign in via Google or GitHub.
* Create and execute workflows.
* Subscribe to a paid plan.
* Contact us for support.

We may also collect usage data (such as logs and interactions within Dafthunk) to improve our service.

## 4. How We Use Your Information

We use your personal information to:

* Provide, maintain, and improve Dafthunk.
* Process your subscription and payments.
* Communicate with you about your account or updates to our service.
* Respond to support requests.

We do not use your information for advertising or sell it to third parties.

## 5. Legal Basis for Processing

We process your personal information, including Workflow and Execution Data, based on the following legal bases:

* **Contractual necessity:** To provide you with access to Dafthunk and its functionalities, including the ability to create and execute workflows.
* **Legal obligation:** For compliance with legal requirements.
* **Legitimate interests:** To maintain, improve, and secure the service, including managing workflow and execution data to ensure reliable operation.
* **Consent:** When required, such as for marketing emails (if implemented).

## 6. Sharing of Information

We may share your information with:

* **Stripe:** For payment processing. We do not store your payment information.
* **Cloudflare:** For hosting and content delivery.

We do not share your personal information with any other third parties except as required by law.

## 7. International Data Transfers

As our service is accessible worldwide, your personal information may be transferred and stored outside your country of residence.

## 8. Data Retention

We retain your personal information for as long as your account is active and as needed to comply with legal obligations or resolve disputes.
You can request deletion of your account at any time (see Section 9).

## 9. Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, loss, or misuse.

However, as Dafthunk is an **alpha-stage service under active development** and leverages **AI-generated components**, you acknowledge that there may be inherent risks and limitations in the system’s security and reliability. We encourage you to avoid processing highly sensitive or critical information through the service at this stage and to regularly back up important data.

## 10. Your Rights

Depending on your location, you may have the following rights regarding your personal information:

* Access your data.
* Correct or update inaccurate data.
* Request deletion of your data.
* Object to or restrict processing of your data.
* Data portability.

You can exercise these rights by contacting us at [${import.meta.env.VITE_CONTACT_EMAIL}](mailto:${import.meta.env.VITE_CONTACT_EMAIL}).

## 11. Children's Privacy

Dafthunk is not intended for use by children under the age of 13 (or 16 in the EU).
We do not knowingly collect personal information from children.

## 12. Acceptable Use and Prohibited Activities

You agree to use Dafthunk in compliance with all applicable laws and regulations and not to engage in any of the following prohibited activities:

* Using the service to create, distribute, or facilitate workflows that expose, misuse, or unlawfully process personal data of third parties without proper consent.
* Using the service to generate or distribute illegal content, including but not limited to material that infringes intellectual property rights, incites violence, promotes hate or discrimination, or contains sexually inappropriate content.
* Using AI models or any other functionalities of the service to produce content that violates applicable laws or the rights of others.
* Engaging in any activity that may harm the service or its users, including but not limited to distributing malware or attempting to gain unauthorized access to the service.
* Using the service to send unsolicited messages, spam, or other forms of unauthorized communications.

We reserve the right to suspend or terminate accounts that violate these terms or engage in illegal, unethical, or abusive activities.

## 13. Business Transfers

If we are involved in a merger, acquisition, financing, due diligence, reorganization, bankruptcy, receivership, sale of assets, or transition of service to another provider, your personal information and Workflow and Execution Data may be transferred as part of that transaction.

We will take reasonable steps to ensure that any successor entity honors the terms of this Privacy Policy and Terms of Service with respect to your personal information. Where required by applicable law, we will notify you of any such transfer and your related rights.

## 14. Changes to This Policy

We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the service or via email.

Please review this policy periodically for updates.

## 15. Contact Us

If you have any questions about these Terms of Service and Privacy Policy or how we handle your personal information, please contact us at:

**Email:** [${import.meta.env.VITE_CONTACT_EMAIL}](mailto:${import.meta.env.VITE_CONTACT_EMAIL})

**Location:** Switzerland
`;
  return <Markdown>{legal}</Markdown>;
}
