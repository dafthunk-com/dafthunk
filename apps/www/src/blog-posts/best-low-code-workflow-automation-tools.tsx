import { Link } from "react-router";

import { WorkflowPreview } from "../components/workflow-preview";

interface ToolRow {
  name: string;
  url: string;
  job: string;
  hosting: string;
  terms: string;
  stars: string;
}

// Licenses were read from each project's own LICENSE file on 2026-07-26, not
// from its marketing page. Star counts come from the GitHub API the same day.
// Both drift, so re-check before relying on them.
const tools: ToolRow[] = [
  {
    name: "Zapier",
    url: "https://zapier.com",
    job: "Connecting SaaS apps",
    hosting: "Vendor-hosted only",
    terms: "Proprietary",
    stars: "n/a",
  },
  {
    name: "Power Automate",
    url: "https://www.microsoft.com/power-platform/products/power-automate",
    job: "Automation inside Microsoft 365",
    hosting: "Vendor-hosted only",
    terms: "Proprietary",
    stars: "n/a",
  },
  {
    name: "Make",
    url: "https://www.make.com",
    job: "Visual multi-step scenarios",
    hosting: "Vendor-hosted only",
    terms: "Proprietary",
    stars: "n/a",
  },
  {
    name: "Workato",
    url: "https://www.workato.com",
    job: "Enterprise integration",
    hosting: "Vendor-hosted only",
    terms: "Proprietary",
    stars: "n/a",
  },
  {
    name: "Pipedream",
    url: "https://pipedream.com",
    job: "Code-first event workflows",
    hosting: "Vendor-hosted only",
    terms: "Proprietary",
    stars: "n/a",
  },
  {
    name: "n8n",
    url: "https://github.com/n8n-io/n8n",
    job: "Self-hosted app automation",
    hosting: "Self-host or cloud",
    terms: "Source-available",
    stars: "198k",
  },
  {
    name: "Activepieces",
    url: "https://github.com/activepieces/activepieces",
    job: "Self-hosted app automation",
    hosting: "Self-host or cloud",
    terms: "Open source (MIT)",
    stars: "23k",
  },
  {
    name: "Node-RED",
    url: "https://github.com/node-red/node-red",
    job: "Event and device flows",
    hosting: "Self-host",
    terms: "Open source (Apache-2.0)",
    stars: "23k",
  },
  {
    name: "Langflow",
    url: "https://github.com/langflow-ai/langflow",
    job: "LLM and agent canvas",
    hosting: "Self-host or cloud",
    terms: "Open source (MIT)",
    stars: "152k",
  },
  {
    name: "Dify",
    url: "https://github.com/langgenius/dify",
    job: "LLM app platform",
    hosting: "Self-host or cloud",
    terms: "Source-available",
    stars: "150k",
  },
];

export const bestLowCodeWorkflowAutomationToolsContent = (
  <>
    <p className="lead">
      Most roundups of low-code workflow automation tools compare features and
      skip the question that decides the project: can you run it yourself, and
      on whose terms? Five of the ten tools below run only on the vendor's
      servers. Two ship source you can host but not resell. Three are open
      source. This list groups them by job and says what each license lets you
      do. We read the licenses in the repositories on 26 July 2026.
    </p>

    <p>Short answers first, if that is all you came for.</p>

    <ul>
      <li>
        <strong>Widest app catalog, least effort:</strong> Zapier.
      </li>
      <li>
        <strong>Already paying for Microsoft 365:</strong> Power Automate.
      </li>
      <li>
        <strong>Self-hosted, widest integrations:</strong> n8n, if you can live
        with a source-available license.
      </li>
      <li>
        <strong>Self-hosted and open source:</strong> Activepieces.
      </li>
      <li>
        <strong>LLM agents on a canvas:</strong> Langflow or Dify.
      </li>
      <li>
        <strong>Nothing to keep running:</strong> build on Cloudflare Workflows,
        covered at the end.
      </li>
    </ul>

    <h2 id="comparison">Low-code workflow automation tools compared</h2>

    <p>
      These ten are the ones people shortlist. Star counts give a popularity
      signal for the projects with a public repository. The hosted platforms
      earn their place on market presence, which we cannot measure, so we have
      not ranked the two groups on one scale.
    </p>

    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Job</th>
            <th>Hosting</th>
            <th>Terms</th>
            <th>Stars</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => (
            <tr key={tool.name}>
              <td>
                <a href={tool.url} target="_blank" rel="noopener noreferrer">
                  {tool.name}
                </a>
              </td>
              <td>{tool.job}</td>
              <td>{tool.hosting}</td>
              <td>{tool.terms}</td>
              <td>{tool.stars}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h2 id="terms">Proprietary, source-available, open source</h2>

    <p>Three tiers. The difference shows up after you commit.</p>

    <p>
      <strong>Proprietary</strong> means the vendor runs it and you rent access.
      Zapier, Power Automate, Make, Workato and Pipedream all sit in this tier.
      Renting suits most teams. It also means your automations live somewhere
      you cannot inspect, priced on terms the vendor can change, and moving them
      later means rebuilding them.
    </p>

    <p>
      <strong>Source-available</strong> means you can read and run the code but
      not do as you like with it. n8n ships under the Sustainable Use License,
      which the project calls fair-code: internal use is free, offering n8n as a
      hosted service to third parties is not, and the grant excludes every file
      with <code>.ee.</code> in its name. Dify uses a modified Apache 2.0 that
      forbids running a multi-tenant environment without written permission and
      forbids removing the Dify logo from the console. Most lists call both open
      source. The Open Source Initiative would approve neither license.
    </p>

    <p>
      <strong>Open source</strong> means an{" "}
      <a
        href="https://opensource.org/licenses"
        target="_blank"
        rel="noopener noreferrer"
      >
        OSI-approved license
      </a>
      , unmodified. Activepieces (MIT), Node-RED (Apache 2.0) and Langflow (MIT)
      qualify. Activepieces carves out a <code>packages/ee/</code> directory
      under commercial terms, the open-core pattern: the repository is open, but
      the feature you saw in the demo may sit outside the code you cloned.
    </p>

    <p>
      Ignore all this if it does not affect you. If you plan to host automations
      for your own customers, read that column first. It rules out more of this
      list than the feature comparison will.
    </p>

    <h2 id="hosted">Hosted platforms</h2>

    <h3 id="zapier">Zapier</h3>

    <p>
      The category default, and still the right first answer for most teams. It
      has the largest integration catalog in the industry by a wide margin, the
      editor needs no explanation, and a useful automation takes minutes. The
      limits arrive later: multi-step logic gets awkward, per-task pricing turns
      high-volume work expensive, and nothing runs on your own infrastructure.
    </p>

    <h3 id="power-automate">Microsoft Power Automate</h3>

    <p>
      If your company runs on Microsoft 365, you already pay for this and IT has
      already approved it, which beats most technical arguments. It is strongest
      inside the Microsoft estate: SharePoint, Outlook, Teams, Dataverse, and
      desktop RPA flows for legacy apps with no API. Outside that estate it
      weakens, and the licensing split between seeded and premium connectors is
      the usual Microsoft puzzle.
    </p>

    <h3 id="make">Make</h3>

    <p>
      The most visual of the hosted tools. Make draws a scenario as a branching
      map rather than a linear step list, which makes complex routing and
      iteration easier to follow than the equivalent Zap. Cheaper than Zapier at
      volume, with a steeper first hour. See our{" "}
      <Link to="/alternatives/make">Make comparison</Link> for the details.
    </p>

    <h3 id="workato">Workato</h3>

    <p>
      The enterprise answer: governance, environments, audit trails, SSO, and a
      sales process to match. IT teams integrating systems of record choose it;
      individuals wiring up two SaaS apps do not. Priced accordingly, and not a
      tool you adopt on a Tuesday afternoon.
    </p>

    <h3 id="pipedream">Pipedream</h3>

    <p>
      The developer-shaped member of this tier. Steps are Node.js, Python, Go or
      Bash over a large connector library, so it suits people who would rather
      write ten lines than fill in a form. It handles the plumbing; it will not
      turn a non-developer into an automation builder.
    </p>

    <h2 id="self-hosted">Self-hostable builders</h2>

    <h3 id="n8n">n8n</h3>

    <p>
      The most popular self-hostable option by a distance, at 198k GitHub stars.
      Several hundred integrations, a real visual editor, JavaScript and Python
      code steps, and AI nodes built on LangChain. It runs as a long-lived
      Node.js process, so self-hosting means a VPS, Docker host or Kubernetes
      cluster that stays up, a Postgres instance beside it, and somebody to
      watch both.
    </p>

    <p>
      Pick it when integration breadth matters and the license does not. Skip it
      if you intend to host workflows for customers. Our{" "}
      <Link to="/alternatives/n8n">n8n comparison</Link> covers the license and
      runtime differences in full.
    </p>

    <h3 id="activepieces">Activepieces</h3>

    <p>
      The MIT answer to the same question. Pieces are typed TypeScript packages,
      so writing a connector resembles publishing an npm module more than
      filling in a form, and the project ships MCP servers for agent use. The
      catalog is smaller than n8n's and the enterprise directory sits outside
      the MIT grant, but the core you clone is MIT.
    </p>

    <h3 id="node-red">Node-RED</h3>

    <p>
      Older than most of this list, Apache 2.0, and still the right tool for
      event-driven and device-driven flows. It came out of IBM's IoT work and
      that is where it stays strongest: MQTT, serial, hardware, home automation,
      edge gateways. Ask it to serve as a SaaS integration platform and it will
      disappoint you.
    </p>

    <h2 id="ai-canvases">AI-first canvases</h2>

    <p>
      The fastest-growing branch of the category. Langflow and Dify hold more
      GitHub stars between them than every other project on this list combined,
      and they optimize for prompt chains, retrieval and tool-calling agents
      rather than for SaaS connectors.
    </p>

    <h3 id="langflow">Langflow</h3>

    <p>
      MIT, Python, 152k stars, and a drag-and-drop canvas for LLM chains and
      agents that exports to an API. The more permissive license of the two, and
      the easier one to embed elsewhere. Compare it with{" "}
      <Link to="/alternatives/langflow">Dafthunk</Link> if you want the same
      canvas without a Python service to host.
    </p>

    <h3 id="dify">Dify</h3>

    <p>
      The more complete product: workflows, RAG, datasets, observability and a
      publishable app layer, with 150k stars behind it. Its license repays a
      second reading, since running it multi-tenant is what the added conditions
      forbid. Our <Link to="/alternatives/dify">Dify comparison</Link> covers
      the rest.
    </p>

    <h2 id="serverless">Cloudflare Workflows, the layer underneath</h2>

    <p>
      Every tool above answers one question: which builder should I use? A
      second question underneath decides far more about what the automation
      costs to operate. What engine runs the steps, and what has to stay
      switched on for it to work?
    </p>

    <p>
      The hosted platforms hide that engine and rent it to you. Every
      self-hostable tool on this list answers with a process running around the
      clock, a database beside it, and a person on call. That is the price of
      free software in this category, and it is why "we will just self-host n8n"
      turns into a small infrastructure project.
    </p>

    <p>
      Serverless is the third answer, and serverless durable execution is rarer
      than the word suggests. AWS Step Functions and Azure Logic Apps qualify,
      but both orchestrate calls out to compute you provision and pay for
      somewhere else. We think Cloudflare Workflows is the strongest foundation
      available today. The engine and your own code run in the same runtime.
      Storage, queues and model inference are bindings on that platform rather
      than services you wire together across a network. A workflow can sleep for
      weeks and resume where it stopped, and an idle deployment costs nothing.
      Nothing stays alive between runs: no server, no container, no database.
    </p>

    <p>
      That is the bet <Link to="/">Dafthunk</Link> takes. It puts a visual
      canvas over Cloudflare Workflows: nodes execute as durable steps, state
      lands in D1 and R2, inference goes through Workers AI or your own OpenAI,
      Anthropic and Gemini keys, and you can expose any node as a tool to an
      agent. It ships MIT throughout, with no enterprise directory, and it
      deploys to your own Cloudflare account.
    </p>

    <figure className="not-prose my-10">
      <WorkflowPreview
        templateId="wiki-research-agent"
        className="h-96 md:h-[28rem]"
        showBackground={false}
        padding={0.05}
        showCopyButton
      />
      <figcaption className="mt-3 text-sm text-gray-500 italic">
        A workflow on Cloudflare Workflows: a question, an agent with three
        tools, an answer. Each node is a durable step.
      </figcaption>
    </figure>

    <p>
      Dafthunk is young and smaller than anything ranked above, so we left it
      out of the list rather than rank ourselves beside tools with a decade of
      history. It inherits a constraint from its foundation: it ties you to
      Cloudflare, which rules it out for air-gapped deployments. If the trade
      suits you, browse the <Link to="/nodes">node reference</Link>, the{" "}
      <Link to="/workflows">workflow templates</Link>, or{" "}
      <Link to="/docs/concepts">core concepts</Link>.
    </p>

    <h2 id="how-to-choose">How to choose a workflow automation tool</h2>

    <p>Four questions settle it in most cases.</p>

    <ol>
      <li>
        <strong>Who edits the workflow?</strong> If the answer includes people
        who do not write code, you need a visual builder, and Pipedream and the
        code-first engines drop out whatever else they offer.
      </li>
      <li>
        <strong>Where does the data live?</strong> Regulated data or a hard
        residency requirement rules out the hosted tier, whatever the feature
        comparison says.
      </li>
      <li>
        <strong>What will you do with it?</strong> Internal use makes the terms
        column almost irrelevant. Hosting automations for your own customers
        makes it decisive, and rules out n8n and Dify.
      </li>
      <li>
        <strong>Who runs it at 3am?</strong> Every self-hosted option here needs
        a process, a database and someone on call. Price that before you price
        the licenses.
      </li>
    </ol>

    <h2 id="faq">Questions people ask</h2>

    <h3 id="faq-low-vs-no-code">
      What is the difference between low-code and no-code automation tools?
    </h3>

    <p>
      No-code means you build the whole workflow through a UI, as with Zapier or
      Make. Low-code means the UI covers the common path and you drop into code
      for the rest, as with n8n, Pipedream or Dafthunk. Almost every tool
      marketed as no-code keeps a code escape hatch, because real automations
      need one sooner or later.
    </p>

    <h3 id="faq-free">Which workflow automation software is free?</h3>

    <p>
      Most hosted platforms offer a free tier capped by task volume. The
      self-hostable tools cost nothing to license for internal use, but you pay
      in hosting and operations. The cheapest total cost is usually the tool
      your team can already run.
    </p>

    <h3 id="faq-open-source">Which of these are open source?</h3>

    <p>
      Activepieces, Node-RED and Langflow ship OSI-approved licenses. n8n and
      Dify are source-available, and most lists mislabel them. The other five
      are proprietary.
    </p>

    <h3 id="faq-selfhost">Which are easiest to self-host?</h3>

    <p>
      Node-RED and Activepieces are the lightest to stand up. n8n and Dify need
      more moving parts. Building on Cloudflare Workflows removes the question,
      because no host exists to manage.
    </p>

    <h2 id="notes">Notes on this list</h2>

    <p>
      We read the licenses in each project's LICENSE file and pulled star counts
      from the GitHub API on 26 July 2026. We quote no prices and no connector
      counts, because both go stale faster than we update this page. Dafthunk is
      our product, so we describe it at the end rather than rank it. If a claim
      here is wrong or has aged badly,{" "}
      <a
        href="https://github.com/dafthunk-com/dafthunk/issues"
        target="_blank"
        rel="noopener noreferrer"
      >
        open an issue
      </a>{" "}
      and we will correct it.
    </p>

    <p>
      Related reading:{" "}
      <Link to="/alternatives">
        Dafthunk compared with n8n, Zapier and Make
      </Link>
      , and{" "}
      <Link to="/blog/building-effective-agents">
        building effective agents on Dafthunk
      </Link>{" "}
      for the agent patterns behind the canvas above.
    </p>
  </>
);
