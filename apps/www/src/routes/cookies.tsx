import { Layout } from "../components/layout";

export function meta() {
  return [
    { title: "Cookie Policy - Dafthunk" },
    {
      name: "description",
      content:
        "Learn about how Dafthunk uses cookies, including essential cookies for security and performance, and third-party cookies from Cloudflare and Stripe.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://dafthunk.com/cookies" },
    { property: "og:title", content: "Cookie Policy - Dafthunk" },
    {
      property: "og:description",
      content:
        "Learn about how Dafthunk uses cookies, including essential cookies for security and performance, and third-party cookies from Cloudflare and Stripe.",
    },
    { property: "og:site_name", content: "Dafthunk" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:url", content: "https://dafthunk.com/cookies" },
    { name: "twitter:title", content: "Cookie Policy - Dafthunk" },
    {
      name: "twitter:description",
      content:
        "Learn about how Dafthunk uses cookies, including essential cookies for security and performance, and third-party cookies from Cloudflare and Stripe.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://dafthunk.com/cookies",
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

export default function Cookies() {
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
            Cookie Policy
          </h1>
          <p className="text-xl text-gray-600 mb-16">
            Last Updated: June 9, 2025
          </p>

          <div className="space-y-16">
            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                1. What Are Cookies?
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Cookies are small text files placed on your device when you
                visit a website. They are widely used to make websites work, or
                work more efficiently, as well as to provide information to the
                owners of the site.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                2. How We Use Cookies
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We use the following types of cookies:
              </p>

              <h3 className="text-2xl font-light text-gray-900 mb-4">
                Essential Cookies (Always Active)
              </h3>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                These cookies are necessary for the website to function and
                cannot be switched off. They are set in response to actions made
                by you which amount to a request for services, such as
                acknowledging our cookie notice.
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6 mb-8">
                <li>
                  <strong>Cloudflare</strong> (__cf_bm, __cflb, cf_clearance):
                  Security, bot management, and load balancing
                </li>
                <li>
                  <strong>Cookie Notice</strong> (localStorage): Remembering
                  that you acknowledged our cookie notice
                </li>
              </ul>

              <h3 className="text-2xl font-light text-gray-900 mb-4">
                Payment Cookies (Essential During Checkout)
              </h3>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                When you proceed to checkout, you are redirected to a secure
                page hosted by our payment processor. This service uses its own
                cookies for fraud prevention and payment session management.
              </p>

              <h3 className="text-2xl font-light text-gray-900 mb-4">
                Analytics Cookies (Optional)
              </h3>
              <p className="text-xl text-gray-600 leading-relaxed">
                With your consent, we use Google Analytics to understand how
                visitors interact with our website. These cookies help us
                improve our services by collecting anonymous usage data. You can
                accept or reject analytics cookies using the consent banner that
                appears when you first visit our site.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                3. Third-Party Cookies
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                The following third-party services may set cookies when you use
                our website:
              </p>
              <ul className="list-disc list-outside space-y-3 text-xl text-gray-600 leading-relaxed ml-6">
                <li>
                  <strong>Cloudflare:</strong> Our hosting provider uses cookies
                  for security, bot management, and performance optimization.{" "}
                  <a
                    href="https://www.cloudflare.com/privacypolicy/"
                    className="text-gray-900 underline hover:no-underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cloudflare Privacy Policy
                  </a>
                </li>
                <li>
                  <strong>Stripe:</strong> Our payment processor uses cookies
                  for fraud prevention and secure payment processing.{" "}
                  <a
                    href="https://stripe.com/privacy"
                    className="text-gray-900 underline hover:no-underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Stripe Privacy Policy
                  </a>
                </li>
                <li>
                  <strong>Google Analytics:</strong> With your consent, we use
                  Google Analytics to collect anonymous data about site usage.{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    className="text-gray-900 underline hover:no-underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                4. Your Cookie Choices
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                When you first visit our website, you will see a consent banner
                asking you to accept or reject analytics cookies. Your choice is
                saved and remembered for future visits.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                <strong>Essential cookies</strong> cannot be disabled as they
                are required for security, performance, and payment processing.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                <strong>Analytics cookies</strong> are optional and only
                activated if you click "Accept" on the consent banner. If you
                reject them, no analytics data will be collected.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                5. Browser Controls
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Most web browsers allow you to control cookies through their
                settings. However, if you use your browser settings to block all
                cookies (including essential cookies), you may not be able to
                access all or parts of our website.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                6. Changes to Our Cookie Policy
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect
                changes in our cookie usage or for other operational, legal, or
                regulatory reasons. Please revisit this page regularly to stay
                informed about our use of cookies.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-light text-gray-900 mb-6">
                7. Contact Us
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                If you have any questions about our use of cookies, please
                contact us at:
              </p>
              <p className="text-xl text-gray-600 leading-relaxed">
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:contact@dafthunk.com"
                  className="text-gray-900 underline hover:no-underline"
                >
                  contact@dafthunk.com
                </a>
              </p>
            </div>
          </div>
        </article>
      </main>
    </Layout>
  );
}
