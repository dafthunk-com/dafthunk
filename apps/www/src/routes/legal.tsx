import { Layout } from "../components/layout";

export function meta() {
  return [
    { title: "Terms of Service & Privacy Policy - Dafthunk" },
    {
      name: "description",
      content:
        "Read our Terms of Service and Privacy Policy. Learn how Dafthunk collects, uses, and protects your personal information and workflow data.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://dafthunk.com/legal" },
    {
      property: "og:title",
      content: "Terms of Service & Privacy Policy - Dafthunk",
    },
    {
      property: "og:description",
      content:
        "Read our Terms of Service and Privacy Policy. Learn how Dafthunk collects, uses, and protects your personal information and workflow data.",
    },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:url", content: "https://dafthunk.com/legal" },
    {
      name: "twitter:title",
      content: "Terms of Service & Privacy Policy - Dafthunk",
    },
    {
      name: "twitter:description",
      content:
        "Read our Terms of Service and Privacy Policy. Learn how Dafthunk collects, uses, and protects your personal information and workflow data.",
    },
    { tagName: "link", rel: "canonical", href: "https://dafthunk.com/legal" },
    { name: "robots", content: "index, follow" },
  ];
}

const navigation = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Overview" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#use-cases", label: "Use Cases" },
  { href: "/#open-source", label: "Open Source" },
  {
    href: "https://github.com/dafthunk-com/dafthunk",
    label: "GitHub",
    external: true,
  },
];

export default function Legal() {
  return (
    <Layout navigation={navigation}>
      <main className="px-6 py-32">
        <article className="max-w-4xl mx-auto">
          <a
            href="/"
            className="inline-flex items-center text-base text-gray-600 hover:text-gray-900 mb-8"
          >
            ← Back to Home
          </a>
          <h1 className="text-6xl font-light text-gray-900 mb-6">
            Terms of Service & Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 mb-16">
            Effective Date: June 9, 2025
          </p>

          <div className="space-y-16">
            <div>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                These Terms of Service and Privacy Policy explains how we
                collect, use, and share your personal information when you use
                our service, and your rights regarding that information.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                By using Dafthunk, you agree to these Terms of Service and
                Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                1. Alpha Release and AI-Generated Components
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                Dafthunk is currently in an <strong>alpha release stage</strong>{" "}
                and is under active development. Parts of the service, including
                its core functionalities, are developed using{" "}
                <strong>generative AI technologies</strong>. As such:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-6">
                <li>
                  The service may contain bugs, errors, or unexpected behaviors.
                </li>
                <li>
                  We make no guarantees regarding the availability, accuracy,
                  completeness, or suitability of the service for any particular
                  purpose.
                </li>
              </ul>
              <p className="text-xl text-gray-600 leading-relaxed">
                By using Dafthunk, you acknowledge and accept these limitations
                and understand that you are using the service{" "}
                <strong>at your own risk</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                2. Information We Collect
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We collect the following personal information:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-6">
                <li>
                  <strong>Account Information:</strong> Username, email address.
                </li>
                <li>
                  <strong>Authentication Data:</strong> If you choose to sign in
                  via Google or GitHub, we receive your basic profile
                  information from these services (name, email).
                </li>
                <li>
                  <strong>Workflow and Execution Data:</strong> Information
                  related to workflows and their executions, including but not
                  limited to workflow definitions, inputs, outputs, intermediary
                  results, execution metadata, and related data.
                </li>
                <li>
                  <strong>Billing Information:</strong> Collected and processed
                  by Stripe (see Section 5).
                </li>
              </ul>
              <p className="text-xl text-gray-600 leading-relaxed">
                We do not collect sensitive personal data unless it is
                intentionally provided by the user as part of workflow
                executions, in which case the user is solely responsible for
                ensuring that the processing of such data complies with
                applicable data protection laws.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                3. How We Collect Information
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We collect personal information when you:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-6">
                <li>Register for an account.</li>
                <li>Sign in via Google or GitHub.</li>
                <li>Create and execute workflows.</li>
                <li>Subscribe to a paid plan.</li>
                <li>Contact us for support.</li>
              </ul>
              <p className="text-xl text-gray-600 leading-relaxed">
                We may also collect usage data (such as logs and interactions
                within Dafthunk) to improve our service.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                4. How We Use Your Information
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We use your personal information to:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-6">
                <li>Provide, maintain, and improve Dafthunk.</li>
                <li>Process your subscription and payments.</li>
                <li>
                  Communicate with you about your account or updates to our
                  service.
                </li>
                <li>Respond to support requests.</li>
              </ul>
              <p className="text-xl text-gray-600 leading-relaxed">
                We do not use your information for advertising or sell it to
                third parties.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                5. Legal Basis for Processing
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We process your personal information, including Workflow and
                Execution Data, based on the following legal bases:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6">
                <li>
                  <strong>Contractual necessity:</strong> To provide you with
                  access to Dafthunk and its functionalities, including the
                  ability to create and execute workflows.
                </li>
                <li>
                  <strong>Legal obligation:</strong> For compliance with legal
                  requirements.
                </li>
                <li>
                  <strong>Legitimate interests:</strong> To maintain, improve,
                  and secure the service, including managing workflow and
                  execution data to ensure reliable operation.
                </li>
                <li>
                  <strong>Consent:</strong> When required, such as for marketing
                  emails (if implemented).
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                6. Sharing of Information
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We may share your information with:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-6">
                <li>
                  <strong>Stripe:</strong> For payment processing. We do not
                  store your payment information.
                </li>
                <li>
                  <strong>Cloudflare:</strong> For hosting and content delivery.
                </li>
              </ul>
              <p className="text-xl text-gray-600 leading-relaxed">
                We do not share your personal information with any other third
                parties except as required by law.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                7. International Data Transfers
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                As our service is accessible worldwide, your personal
                information may be transferred and stored outside your country
                of residence.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                8. Data Retention
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                We retain your personal information for as long as your account
                is active and as needed to comply with legal obligations or
                resolve disputes. You can request deletion of your account at
                any time (see Section 9).
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                9. Security
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We implement appropriate technical and organizational measures
                to protect your personal information against unauthorized
                access, loss, or misuse.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                However, as Dafthunk is an{" "}
                <strong>alpha-stage service under active development</strong>{" "}
                and leverages <strong>AI-generated components</strong>, you
                acknowledge that there may be inherent risks and limitations in
                the system's security and reliability. We encourage you to avoid
                processing highly sensitive or critical information through the
                service at this stage and to regularly back up important data.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                10. Your Rights
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                Depending on your location, you may have the following rights
                regarding your personal information:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-6">
                <li>Access your data.</li>
                <li>Correct or update inaccurate data.</li>
                <li>Request deletion of your data.</li>
                <li>Object to or restrict processing of your data.</li>
                <li>Data portability.</li>
              </ul>
              <p className="text-xl text-gray-600 leading-relaxed">
                You can exercise these rights by contacting us at{" "}
                <a
                  href="mailto:contact@dafthunk.com"
                  className="text-gray-900 underline hover:no-underline"
                >
                  contact@dafthunk.com
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                11. Children's Privacy
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Dafthunk is not intended for use by children under the age of 13
                (or 16 in the EU). We do not knowingly collect personal
                information from children.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                12. Acceptable Use and Prohibited Activities
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                You agree to use Dafthunk in compliance with all applicable laws
                and regulations and not to engage in any of the following
                prohibited activities:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-6">
                <li>
                  Using the service to create, distribute, or facilitate
                  workflows that expose, misuse, or unlawfully process personal
                  data of third parties without proper consent.
                </li>
                <li>
                  Using the service to generate or distribute illegal content,
                  including but not limited to material that infringes
                  intellectual property rights, incites violence, promotes hate
                  or discrimination, or contains sexually inappropriate content.
                </li>
                <li>
                  Using AI models or any other functionalities of the service to
                  produce content that violates applicable laws or the rights of
                  others.
                </li>
                <li>
                  Engaging in any activity that may harm the service or its
                  users, including but not limited to distributing malware or
                  attempting to gain unauthorized access to the service.
                </li>
                <li>
                  Using the service to send unsolicited messages, spam, or other
                  forms of unauthorized communications.
                </li>
              </ul>
              <p className="text-xl text-gray-600 leading-relaxed">
                We reserve the right to suspend or terminate accounts that
                violate these terms or engage in illegal, unethical, or abusive
                activities.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                13. Business Transfers
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                If we are involved in a merger, acquisition, financing, due
                diligence, reorganization, bankruptcy, receivership, sale of
                assets, or transition of service to another provider, your
                personal information and Workflow and Execution Data may be
                transferred as part of that transaction.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                We will take reasonable steps to ensure that any successor
                entity honors the terms of this Privacy Policy and Terms of
                Service with respect to your personal information. Where
                required by applicable law, we will notify you of any such
                transfer and your related rights.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                14. Changes to This Policy
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We may update this Privacy Policy from time to time. If we make
                material changes, we will notify you through the service or via
                email.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                Please review this policy periodically for updates.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                15. Contact Us
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                If you have any questions about these Terms of Service and
                Privacy Policy or how we handle your personal information,
                please contact us at:
              </p>
              <p className="text-xl text-gray-600 leading-relaxed mb-2">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:contact@dafthunk.com"
                  className="text-gray-900 underline hover:no-underline"
                >
                  contact@dafthunk.com
                </a>
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                <strong>Location:</strong> Switzerland
              </p>
            </div>
          </div>
        </article>
      </main>
    </Layout>
  );
}
