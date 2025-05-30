import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsDevelopersPage() {
  usePageBreadcrumbs([
    { label: "Documentation", to: "/docs" },
    { label: "Developers" },
  ]);

  return (
    <>
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Developers Guide
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Welcome to the Dafthunk developer guide. This guide is designed to
          help you understand our architecture, set up your development
          environment, and start contributing to Dafthunk. Dafthunk is an
          open-source project and you are welcome to contribute to it.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none docs-content">
        <h2 id="getting-started">Getting Started</h2>
        <p>
          To start developing Dafthunk, you'll need to set up the project
          locally. Our codebase is hosted on GitHub. For detailed instructions
          on cloning the repository, installing dependencies (using pnpm), and
          running the development servers for both the web application and the
          API, please refer to the main <code>README.md</code> at the root of
          the project.
        </p>
        <p>In summary, you will typically:</p>
        <ol>
          <li>
            Clone the repository:{" "}
            <code>git clone https://github.com/dafthunk-com/dafthunk.git</code>
          </li>
          <li>
            Install all dependencies: <code>pnpm install</code>
          </li>
          <li>
            Run the application: <code>pnpm dev</code>
          </li>
        </ol>

        <h2 id="how-to-contribute">How to Contribute</h2>
        <p>We welcome contributions of all kinds! Here's how you can help:</p>
        <h3>Reporting Bugs</h3>
        <p>
          If you find a bug, please{" "}
          <a
            href="https://github.com/dafthunk-com/dafthunk/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            open an issue
          </a>{" "}
          on GitHub. Include as much detail as possible: steps to reproduce,
          expected behavior, and actual behavior. Screenshots or code snippets
          are also helpful.
        </p>
        <h3>Suggesting Enhancements</h3>
        <p>
          Have an idea for a new feature or an improvement to an existing one?
          Feel free to{" "}
          <a
            href="https://github.com/dafthunk-com/dafthunk/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            open an issue
          </a>{" "}
          to discuss it. If GitHub Discussions are enabled for the repository,
          that would also be an excellent place for broader ideas.
        </p>
        <h3>Pull Requests</h3>
        <p>We use the standard GitHub flow for pull requests:</p>
        <ol>
          <li>Fork the repository.</li>
          <li>Create a new branch for your feature or bug fix.</li>
          <li>Make your changes, adhering to our coding standards.</li>
          <li>Commit your changes with clear and descriptive messages.</li>
          <li>Push your branch to your fork.</li>
          <li>Open a pull request against the Dafthunk repository.</li>
        </ol>
        <p>
          Please ensure your PR description clearly explains the changes and why
          they are needed.
        </p>

        <h2 id="technology-stack">Technology Stack</h2>
        <p>
          Dafthunk leverages a modern technology stack to deliver a high-quality
          experience. Here's an overview:
        </p>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Technologies</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Frontend</strong>
              </td>
              <td>React 19, TypeScript, TailwindCSS, Shadcn UI</td>
            </tr>
            <tr>
              <td>
                <strong>Backend</strong>
              </td>
              <td>
                Hono, Cloudflare Workers, Cloudflare Workflow, D1 Database
              </td>
            </tr>
            <tr>
              <td>
                <strong>Workflow Editor</strong>
              </td>
              <td>React Flow, Custom Components</td>
            </tr>
            <tr>
              <td>
                <strong>AI/ML</strong>
              </td>
              <td>Cloudflare AI, Workers AI</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
