import { Layout } from "../components/layout";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL;

export function meta() {
  return [
    { title: "Terms of Service - Dafthunk" },
    {
      name: "description",
      content:
        "Read our Terms of Service. Learn about the acceptable use, limitations, and conditions for using Dafthunk's workflow automation platform.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${websiteUrl}/terms` },
    {
      property: "og:title",
      content: "Terms of Service - Dafthunk",
    },
    {
      property: "og:description",
      content:
        "Read our Terms of Service. Learn about the acceptable use, limitations, and conditions for using Dafthunk's workflow automation platform.",
    },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:url", content: `${websiteUrl}/terms` },
    {
      name: "twitter:title",
      content: "Terms of Service - Dafthunk",
    },
    {
      name: "twitter:description",
      content:
        "Read our Terms of Service. Learn about the acceptable use, limitations, and conditions for using Dafthunk's workflow automation platform.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: `${websiteUrl}/terms`,
    },
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

export default function Terms() {
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
            Terms of Service
          </h1>
          <p className="text-xl text-gray-600 mb-16">
            Effective Date: June 9, 2025
          </p>

          <div className="space-y-16">
            <div>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                These Terms of Service govern your use of Dafthunk and outline
                the conditions under which we provide our service.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                By using Dafthunk, you agree to these Terms of Service. Please
                also review our{" "}
                <a
                  href="/privacy"
                  className="text-gray-900 underline hover:no-underline"
                >
                  Privacy Policy
                </a>
                .
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
                2. Acceptable Use and Prohibited Activities
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
                3. Business Transfers
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                If we are involved in a merger, acquisition, financing, due
                diligence, reorganization, bankruptcy, receivership, sale of
                assets, or transition of service to another provider, your
                account information and data may be transferred as part of that
                transaction.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                We will take reasonable steps to ensure that any successor
                entity honors the terms of this Terms of Service with respect to
                your account. Where required by applicable law, we will notify
                you of any such transfer and your related rights.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                4. Changes to These Terms
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We may update these Terms of Service from time to time. If we
                make material changes, we will notify you through the service or
                via email.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                Please review these terms periodically for updates.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                5. Contact Us
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                If you have any questions about these Terms of Service, please
                contact us at:
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
