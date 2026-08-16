import { Link } from "react-router";

interface ToolRow {
  name: string;
  url: string;
  job: string;
  license: string;
  osi: string;
  stars: string;
}

// Licenses were read from each project's own LICENSE file on 2026-08-15, not
// from its marketing page. Star counts come from the GitHub API the same day.
// Both drift, so re-check before relying on them.
const tools: ToolRow[] = [
  {
    name: "Activepieces",
    url: "https://github.com/activepieces/activepieces",
    job: "Visual app automation",
    license: "MIT",
    osi: "Yes",
    stars: "24k",
  },
  {
    name: "Kestra",
    url: "https://github.com/kestra-io/kestra",
    job: "Declarative orchestration",
    license: "Apache 2.0",
    osi: "Yes",
    stars: "28k",
  },
  {
    name: "Node-RED",
    url: "https://github.com/node-red/node-red",
    job: "Event and device flows",
    license: "Apache 2.0",
    osi: "Yes",
    stars: "24k",
  },
  {
    name: "Windmill",
    url: "https://github.com/windmill-labs/windmill",
    job: "Scripts into workflows",
    license: "AGPL 3.0",
    osi: "Yes",
    stars: "18k",
  },
  {
    name: "Huginn",
    url: "https://github.com/huginn/huginn",
    job: "Monitoring agents",
    license: "MIT",
    osi: "Yes",
    stars: "50k",
  },
  {
    name: "Temporal",
    url: "https://github.com/temporalio/temporal",
    job: "Durable execution engine",
    license: "MIT",
    osi: "Yes",
    stars: "22k",
  },
  {
    name: "Automatisch",
    url: "https://github.com/automatisch/automatisch",
    job: "Visual app automation",
    license: "AGPL 3.0",
    osi: "Yes",
    stars: "14k",
  },
  {
    name: "n8n",
    url: "https://github.com/n8n-io/n8n",
    job: "Visual app automation",
    license: "Sustainable Use License",
    osi: "No",
    stars: "201k",
  },
  {
    name: "Dify",
    url: "https://github.com/langgenius/dify",
    job: "LLM app platform",
    license: "Modified Apache 2.0",
    osi: "No",
    stars: "152k",
  },
  {
    name: "Airbyte",
    url: "https://github.com/airbytehq/airbyte",
    job: "Data integration",
    license: "Elastic License 2.0",
    osi: "No",
    stars: "22k",
  },
];

export const bestOpenSourceWorkflowAutomationToolsContent = (
  <>
    <p className="lead">
      Open source has a precise meaning: a license the Open Source Initiative
      has approved, unmodified. Most lists of open source workflow automation
      tools ignore it, which is how the most popular project on every one of
      them ends up mislabelled. n8n forbids offering n8n as a service to other
      people. Dify and Airbyte carry similar terms. All three are
      source-available. Seven projects below pass the test and three fail it. We
      read every license in its repository on 15 August 2026.
    </p>

    <h2 id="comparison">Open source workflow automation tools compared</h2>

    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Job</th>
            <th>License</th>
            <th>OSI-approved</th>
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
              <td>{tool.license}</td>
              <td>{tool.osi}</td>
              <td>{tool.stars}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p>
      The three tools at the bottom hold more GitHub stars than the seven above
      them combined. Popularity and licensing are separate questions, and this
      list keeps them separate.
    </p>

    <h2 id="what-counts">What counts as open source</h2>

    <p>
      An{" "}
      <a
        href="https://opensource.org/licenses"
        target="_blank"
        rel="noopener noreferrer"
      >
        OSI-approved license
      </a>{" "}
      grants four freedoms: run the software for any purpose, read it, change
      it, and redistribute it, changed or not. MIT, Apache 2.0 and AGPL 3.0 all
      qualify. A license that adds a condition on top of one of them, however
      reasonable the condition sounds, no longer qualifies.
    </p>

    <p>
      The condition vendors add is almost always the same one: you may not sell
      this as a hosted service. That protects the vendor's revenue, and for
      internal use it costs you nothing. It matters when you host automations
      for your own customers, embed the tool in a product you sell, or need the
      right to fork a project whose owner changes direction. Check the column
      before the feature comparison. It rules out more of any shortlist.
    </p>

    <h2 id="qualify">The seven that qualify</h2>

    <h3 id="activepieces">Activepieces</h3>

    <p>
      The closest open source match for what people want when they ask for n8n.
      A visual builder, several hundred connectors, and roughly 400 MCP servers
      for agent use. Pieces are typed TypeScript packages, so writing a
      connector resembles publishing an npm module. The core is MIT Expat. Two
      directories sit outside that grant: <code>packages/ee/</code> and{" "}
      <code>packages/server/api/src/app/ee</code>.
    </p>

    <h3 id="kestra">Kestra</h3>

    <p>
      Apache 2.0, written in Java, and the strongest choice when workflows
      belong in version control. You declare them in YAML rather than drawing
      them, and the editor renders the YAML back as a graph. Scheduling,
      backfills and event triggers are first class, which suits data and
      platform teams more than marketing automation.
    </p>

    <h3 id="node-red">Node-RED</h3>

    <p>
      Apache 2.0, out of IBM's IoT work, and older than most of this category.
      It stays the right tool for event-driven and device-driven flows: MQTT,
      serial, hardware, home automation, edge gateways. Ask it to serve as a
      SaaS integration platform and it will disappoint you.
    </p>

    <h3 id="windmill">Windmill</h3>

    <p>
      A Rust backend that turns scripts in Python, TypeScript, Go, Bash or SQL
      into workflows, webhooks and internal UIs. The developer's answer on this
      list: you write the step, Windmill handles scheduling, retries,
      permissions and the form around it. The backend and frontend are AGPL 3.0,
      the language clients and the OpenFlow spec are Apache 2.0, and code behind
      the <code>enterprise</code> compile flag is proprietary. A binary built
      without that flag is AGPL 3.0 throughout.
    </p>

    <h3 id="huginn">Huginn</h3>

    <p>
      MIT, Ruby, 50k stars, and no company behind it. Agents watch sources and
      act: scrape a page, poll a feed, send an alert, chain the result into
      another agent. It predates the current category and shows its age in the
      interface, but the license is clean, the project is still maintained, and
      nobody can change the terms on you.
    </p>

    <h3 id="temporal">Temporal</h3>

    <p>
      MIT, and not a builder. You write workflows in Go, Java, TypeScript,
      Python or .NET, and Temporal makes them survive crashes, restarts and
      deploys by replaying their history. Reach for it when correctness over
      long-running processes matters more than letting non-developers edit the
      steps. Our <Link to="/blog/durable-execution">durable execution</Link>{" "}
      post compares it with the other engines in that class.
    </p>

    <h3 id="automatisch">Automatisch</h3>

    <p>
      AGPL 3.0, except files with <code>.ee.</code> in the name. It aims
      squarely at Zapier's job with a small connector catalog and a simple
      self-hosted install. Pick it when you want a short list of integrations
      under a copyleft license rather than a large one under a restricted
      license.
    </p>

    <h2 id="not-open-source">Popular, and not open source</h2>

    <p>
      Each of these three ships its source publicly, and each adds a condition
      that takes it out of the definition.
    </p>

    <p>
      <strong>n8n</strong> uses the Sustainable Use License, which the project
      calls fair-code. Internal use is free. Offering n8n as a hosted service to
      third parties is not. Files with <code>.ee.</code> in the name or{" "}
      <code>.ee</code> in the directory name need a paid n8n Enterprise License.
      The license also states that branches other than main carry no grant at
      all, so the code you read on a feature branch is not licensed to you.
    </p>

    <p>
      <strong>Dify</strong> uses a modified Apache 2.0. You may not run a
      multi-tenant environment without written permission, and you may not
      remove or modify the logo and copyright notices in the console.
    </p>

    <p>
      <strong>Airbyte</strong> uses the Elastic License 2.0. You may not provide
      the software to third parties as a hosted or managed service, and you may
      not circumvent its license key.
    </p>

    <p>
      None of this makes them bad software. n8n has the widest integration
      catalog of any self-hostable tool by a distance, and for internal
      automation the license never comes up. Call them source-available and the
      decision stays honest.
    </p>

    <h2 id="open-core">Open core cuts the other way too</h2>

    <p>
      A green license column can still hide a paywall. Activepieces, Windmill
      and Automatisch each keep an enterprise directory outside the open grant,
      the open-core pattern: the repository is open, and the feature you saw in
      the demo may sit in the part you cannot use. Search the repository for{" "}
      <code>ee</code> or <code>enterprise</code> before you plan around a
      feature. Kestra, Node-RED, Huginn and Temporal carry no such carve-out in
      their license files.
    </p>

    <h2 id="mit">Why we chose MIT</h2>

    <p>
      <Link to="/">Dafthunk</Link> is ours, and it is younger and smaller than
      every project ranked above, so it stays out of the list. The license
      choice is worth explaining, because we made it deliberately and it costs
      us something. Dafthunk is MIT throughout, with no enterprise directory and
      no clause reserving hosting to us.
    </p>

    <p>
      We build in the open because automation software asks for an unusual
      amount of trust. It holds your API keys, reads your data and acts on your
      behalf while nobody is watching. You cannot audit a promise. You can audit
      a repository.
    </p>

    <p>
      We trust users with the whole grant for the same reason. A license that
      says you may run this but not sell it is a bet that some of your users are
      competitors first. Writing that clause means writing it against everyone,
      including the person who wants to host one workflow for a client.
    </p>

    <p>
      The third reason has arrived recently. Code is becoming config. When an
      agent can read a codebase and change it in an afternoon, the cost of
      adapting a tool collapses, and the binding constraint moves from skill to
      permission. The exe.dev blog put the case for developer tools directly in{" "}
      <a
        href="https://blog.exe.dev/devtools-must-be-open-source"
        target="_blank"
        rel="noopener noreferrer"
      >
        Devtools must be open source
      </a>
      : agents make personalizing a tool routine, and a closed tool cannot be
      personalized at all. A workflow engine is a developer tool by that
      standard. If you want a node that does not exist, the fastest path should
      be writing it, not filing a feature request.
    </p>

    <p>
      What this costs: anyone can take the source, host it and sell it,
      including against us. We accept that. If the hosted product only survives
      because the license forbids the alternative, it was not worth running.
    </p>

    <p>
      Dafthunk puts a visual canvas over Cloudflare Workflows, so nodes execute
      as durable steps and an idle deployment costs nothing. It ties you to
      Cloudflare, which rules it out for air-gapped work. Browse the{" "}
      <Link to="/nodes">node reference</Link>, the{" "}
      <Link to="/workflows">workflow templates</Link>, or{" "}
      <Link to="/docs/concepts">core concepts</Link>.
    </p>

    <h2 id="faq">Questions people ask</h2>

    <h3 id="faq-n8n">Is n8n open source?</h3>

    <p>
      No. n8n ships under the Sustainable Use License, which the project
      describes as fair-code. The source is public and free for internal use,
      and offering n8n as a service to other people requires a commercial
      license. The OSI has not approved it.
    </p>

    <h3 id="faq-best">Which one should I pick?</h3>

    <p>
      Activepieces if you want a visual builder and a permissive license.
      Windmill if your team writes scripts. Kestra if workflows belong in
      version control. Node-RED for devices and events. Temporal if durability
      matters more than a canvas.
    </p>

    <h3 id="faq-copyleft">Does AGPL 3.0 count as open source?</h3>

    <p>
      Yes. The OSI approves it. It is copyleft rather than permissive, so
      distributing a modified version, including running it as a network
      service, obliges you to publish your changes under the same license. That
      duty is a condition of the grant, not a restriction on who may use it.
    </p>

    <h2 id="notes">Notes on this list</h2>

    <p>
      We read each project's LICENSE file in its repository and pulled star
      counts from the GitHub API on 15 August 2026. Licenses change, so check
      the file before you commit to one. We quote no prices and no connector
      counts, because both go stale faster than we update this page. If a claim
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
      <Link to="/blog/best-low-code-workflow-automation-tools">
        the best low-code workflow automation tools
      </Link>
      , which covers the hosted platforms this list leaves out, and{" "}
      <Link to="/alternatives">
        Dafthunk compared with n8n, Zapier and Make
      </Link>
      .
    </p>
  </>
);
