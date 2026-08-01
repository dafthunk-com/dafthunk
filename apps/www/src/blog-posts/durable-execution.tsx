import { Link } from "react-router";

interface EngineRow {
  name: string;
  url: string;
  shape: string;
  runsWhere: string;
  license: string;
}

// Licenses were read from each project's LICENSE file on 2026-08-02, not from
// marketing pages, because several of these projects are described as open
// source in copy that a license check does not support.
const engines: EngineRow[] = [
  {
    name: "Temporal",
    url: "https://temporal.io",
    shape: "Server plus worker fleet",
    runsWhere: "Your workers, long-polling a server you run or buy",
    license: "MIT",
  },
  {
    name: "Restate",
    url: "https://restate.dev",
    shape: "Single-binary runtime",
    runsWhere: "Your services, invoked by the runtime",
    license: "BUSL 1.1",
  },
  {
    name: "Inngest",
    url: "https://www.inngest.com",
    shape: "Event-driven durable steps",
    runsWhere: "Wherever you already deploy, including Workers",
    license: "SSPL, Apache 2.0 after three years",
  },
  {
    name: "DBOS",
    url: "https://www.dbos.dev",
    shape: "Library plus Postgres",
    runsWhere: "Inside your own process",
    license: "MIT",
  },
  {
    name: "Trigger.dev",
    url: "https://trigger.dev",
    shape: "Managed or self-hosted task platform",
    runsWhere: "Their infrastructure or yours",
    license: "Apache 2.0",
  },
  {
    name: "Cloudflare Workflows",
    url: "https://developers.cloudflare.com/workflows/",
    shape: "Platform primitive",
    runsWhere: "Cloudflare Workers",
    license: "Proprietary managed service",
  },
];

export const durableExecutionContent = (
  <>
    <p className="lead">
      Durable execution is a way of running a program so that it survives the
      machine it started on. The engine journals the result of every step to
      storage as the step completes, so when a process crashes, deploys, or gets
      rescheduled, execution resumes from the last completed step instead of
      starting over. That single mechanic is what the whole category is built
      on, and everything that distinguishes one engine from another follows from
      how it makes you write the code around it.
    </p>

    <h2 id="what-is">What durable execution means</h2>

    <p>
      Consider an ordinary function that charges a card, writes a database row,
      and sends a receipt. If the process dies between the charge and the row,
      you have taken money and recorded nothing. The usual fixes are a queue per
      step, a state machine in a table, and a reconciliation job to clean up
      what still went wrong. That machinery is most of what a durable execution
      engine replaces.
    </p>

    <p>
      Under durable execution you write the same three calls in sequence, each
      wrapped as a step. The engine records the result of each one as it
      returns. If the process dies after the charge, a replacement picks the
      execution back up, sees the charge already has a recorded result, skips
      it, and continues at the database write. The code reads like a single
      linear function while behaving like a fault-tolerant distributed system.
    </p>

    <p>
      The engines disagree about almost everything else. They agree on this.
    </p>

    <h2 id="guarantees">What it guarantees, and what it does not</h2>

    <p>
      Durable execution guarantees that a step's recorded result is not
      recomputed. It does not guarantee that the step's side effect happened
      exactly once, and the difference between those two sentences is where
      production incidents live.
    </p>

    <p>
      If a step charges a card and the process dies after the charge succeeds
      but before the result is journaled, the engine has no record and will run
      the step again. You get two charges. No engine in this category prevents
      that, because none of them can reach inside your payment provider. What
      they provide is a place to put the fix: pass an idempotency key derived
      from the execution ID, and the second attempt collapses into the first.
    </p>

    <p>
      So the honest formulation is that durable execution gives you
      at-least-once step execution with a durable journal, and exactly-once
      becomes reachable because the journal gives you a stable identity to key
      on. Vendors who say exactly-once are describing the workflow's observable
      state, not your side effects.
    </p>

    <h2 id="determinism">The determinism tax</h2>

    <p>Replay is what makes the model work, and replay is what it costs you.</p>

    <p>
      Engines in the Temporal lineage recover by re-running your workflow
      function from the top, feeding recorded results back in place of the calls
      that already completed. For that to reconstruct the same state, the
      function has to take the same path it took before. So workflow code must
      be deterministic: no reading the clock, no random numbers, no iterating a
      map with unstable ordering, no calling a service directly. Each of those
      belongs inside a step, where the result gets journaled, rather than in the
      orchestrating code.
    </p>

    <p>
      The sharp edge is deployment. Change the shape of a workflow function
      while instances of it are still in flight, and replay reaches a point
      where the recorded history and the new code disagree. Temporal surfaces
      this as a non-determinism error and offers two ways out: patching APIs
      that branch on whether an execution predates a change, and worker
      versioning that pins running executions to the code revision they started
      on. Both work. Both mean that editing a long-running workflow is a
      versioned migration rather than an edit.
    </p>

    <p>
      This is the part that surprises teams adopting durable execution, and it
      is worth understanding before choosing an engine, because engines differ
      in how much of the tax they charge. Systems that journal at an API
      boundary rather than replaying a function body ask less of your code and
      give you less control in exchange.
    </p>

    <h2 id="engines">The durable execution engines</h2>

    <p>
      The field divides by where your code runs and what you have to operate. It
      does not divide by capability nearly as much as the marketing suggests.
    </p>

    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Engine</th>
            <th>Shape</th>
            <th>Where your code runs</th>
            <th>License</th>
          </tr>
        </thead>
        <tbody>
          {engines.map((engine) => (
            <tr key={engine.name}>
              <td>
                <a href={engine.url} target="_blank" rel="noopener noreferrer">
                  {engine.name}
                </a>
              </td>
              <td>{engine.shape}</td>
              <td>{engine.runsWhere}</td>
              <td>{engine.license}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h3 id="temporal">Temporal</h3>

    <p>
      Temporal is the reference implementation of the category and the one with
      the deepest production record. It is MIT licensed, which is the most
      permissive license in this table, and it is genuinely open source rather
      than open source in the sense the other vendors use the phrase.
    </p>

    <p>
      The cost is operational. A self-hosted Temporal service needs a
      persistence store, Cassandra, MySQL or PostgreSQL, and a separate
      visibility store for search, where Cassandra is not supported and
      Elasticsearch or OpenSearch is what the docs recommend once you are past a
      handful of executions. Then you run the server itself and a fleet of
      workers that poll it. Teams who want Temporal semantics without that
      surface buy Temporal Cloud, which is the honest reading of why it exists.
    </p>

    <h3 id="restate">Restate</h3>

    <p>
      Restate is the strongest argument that the operational weight above is
      incidental rather than essential. It ships as a single binary written in
      Rust, and it sits in front of your services, invoking them and journaling
      the results, rather than having your workers poll it.
    </p>

    <p>
      Check the license before you plan around it. The Restate runtime is BUSL
      1.1, a source-available license with an additional use grant that permits
      essentially every deployment except running a public Restate platform as a
      service. For most teams that restriction never binds. It is still not an
      open source license, and calling it one is the error to avoid.
    </p>

    <h3 id="inngest">Inngest</h3>

    <p>
      Inngest is durable steps with an event-driven front end, and its
      distinguishing property is that your code stays where you already deploy
      it, including on Cloudflare Workers. There is no worker fleet to run,
      which is the same trade Restate makes from a different direction.
    </p>

    <p>
      Its license is the most unusual here: Server Side Public License, with an
      automatic conversion to Apache 2.0 three years after each release is
      published. So today's server is SSPL and the 2023 server is Apache. If
      your reason for wanting open source is avoiding a rug-pull, delayed
      publication answers it. If your reason is a compliance list, SSPL is
      usually on the wrong side of it.
    </p>

    <h3 id="dbos">DBOS</h3>

    <p>
      DBOS is the smallest thing in the category that still deserves the name.
      It is an MIT-licensed library you import into an existing service, pointed
      at a Postgres connection string, with decorators marking functions as
      workflows and steps. The journal is tables in your own database.
    </p>

    <p>
      For a team that already runs Postgres and wants crash-safe multi-step
      operations, this is the shortest path in the table, and the ceiling is
      lower in exchange. There is no separate system to scale independently,
      because there is no separate system.
    </p>

    <h3 id="cloudflare-workflows">Cloudflare Workflows</h3>

    <p>
      Cloudflare Workflows is durable execution as a platform primitive rather
      than a product you adopt. You extend a class, wrap work in{" "}
      <code>step.do()</code>, and the platform persists results, retries
      failures and reschedules the instance. There is nothing to operate and
      nothing to license, and correspondingly nothing to self-host: it exists
      only on Cloudflare.
    </p>

    <p>
      The published limits are specific enough to design against. A step sleeps
      for up to 365 days, and a sleeping instance consumes no compute and does
      not count toward the concurrency limit, which is 50,000 running instances
      per account on the paid plan. An instance runs up to 10,000 steps by
      default, configurable to 25,000, and sleeps do not count toward that
      total. Steps retry five times by default with a ten-second initial delay,
      exponential backoff and a ten-minute per-attempt timeout. Persisted state
      caps at 1 GB per instance.
    </p>

    <p>
      Those numbers describe the shape of the thing: it is built for many
      long-lived, mostly idle executions rather than for maximum throughput on
      one. A workflow that waits three weeks for a human to approve something is
      the case it is designed for.
    </p>

    <h2 id="vs-automation">Durable execution and workflow automation</h2>

    <p>
      These are two markets that describe themselves with the same words, and
      confusing them is the most common mistake in choosing between them.
    </p>

    <p>
      Durable execution is a property of a runtime. It is sold to engineers, the
      interface is a code SDK, and the thing being promised is that your program
      survives infrastructure failure. Workflow automation is a product
      category. It is sold to whoever needs two systems connected, the interface
      is usually a canvas, and the thing being promised is that you did not have
      to write the integration.
    </p>

    <p>
      They are orthogonal. A workflow automation tool can be built on a durable
      runtime or on a queue and a cron job, and from the outside the difference
      shows up only when something fails halfway. Most tools in the automation
      category are not durable in this sense: a run that dies partway through
      dies, and the recovery story is that you look at a list of failed runs and
      press retry, which starts the whole thing again from the first step.
    </p>

    <p>
      That is worth knowing when you evaluate either category, because "retry"
      in an automation product and "retry" in a durable execution engine mean
      different things. One re-runs everything. The other resumes.
    </p>

    <h2 id="visual">Where a visual layer fits</h2>

    <p>
      Dafthunk sits on the automation side of that line and on the durable side
      of the runtime question, which is an uncommon combination and the reason
      this post exists.
    </p>

    <p>
      To be clear about what it is not: it is not a competitor to Temporal or
      Restate. If you are writing a distributed transaction in Go and you need
      saga compensation, signals and a query API, those engines are the answer
      and a canvas is not. Dafthunk is a visual workflow builder whose runtime
      happens to be Cloudflare Workflows, and the durability is inherited rather
      than invented.
    </p>

    <p>
      Concretely, in <code>packages/runtime</code>, every node on the canvas
      executes inside its own <code>step.do()</code> call, configured with three
      attempts, a ten-second initial delay and exponential backoff. Nodes that
      wait park on <code>step.sleep()</code>, and nodes waiting for something
      external park on <code>step.waitForEvent()</code>, both of which cost
      nothing while parked. Workflow validation failures throw{" "}
      <code>NonRetryableError</code>, because a graph with a cycle in it will
      still have a cycle on the fourth attempt. A second runtime executes the
      same graph synchronously with no durability, for interactive runs where
      you are watching the canvas and a crash just means pressing run again.
    </p>

    <p>
      The interesting consequence is what happens to the determinism tax. A
      Dafthunk workflow is a graph in a database rather than a function in a
      deployed bundle, and the orchestration code that replays is the engine's,
      not yours. You cannot write a non-deterministic workflow body because you
      do not write the workflow body. The tax does not disappear, it moves: the
      analogous hazard is that an instance parked on an event for two weeks
      resumes against whatever is deployed when the event arrives, so the
      execution payload has to stay backward compatible across deploys. That
      constraint is written into the runtime's type definition, where the next
      person to change it will read it.
    </p>

    <p>
      This is the narrow claim worth making. Visual workflow tools usually trade
      durability for approachability. That trade is not required when the
      runtime underneath is a durable execution engine.
    </p>

    <h2 id="choosing">How to choose</h2>

    <ul>
      <li>
        <strong>You need signals, queries and saga compensation</strong> in a
        typed SDK, at scale, with an audit trail. Temporal, and probably
        Temporal Cloud unless you have people to run it.
      </li>
      <li>
        <strong>You want that model without the operational surface.</strong>{" "}
        Restate, if BUSL is acceptable, or Inngest, if SSPL is.
      </li>
      <li>
        <strong>You already run Postgres</strong> and want crash-safe multi-step
        functions inside an existing service. DBOS.
      </li>
      <li>
        <strong>You are already on Cloudflare</strong> and want durability as a
        platform feature. Cloudflare Workflows directly.
      </li>
      <li>
        <strong>
          The people building the workflows are not the people who write Go.
        </strong>{" "}
        A visual builder, and then the question is whether its runtime is
        durable. Ask what happens to a half-finished run when the process dies.
      </li>
    </ul>

    <h2 id="faq">Questions people ask</h2>

    <h3 id="faq-vs-queue">Is durable execution just a queue?</h3>

    <p>
      A queue moves messages and forgets them. Durable execution keeps the
      journal of an entire multi-step operation, so the system knows which steps
      completed and what each returned. You can build the second from the first,
      and the effort involved is the reason the category exists.
    </p>

    <h3 id="faq-open-source">
      Which durable execution engines are open source?
    </h3>

    <p>
      By the OSI definition and reading actual license files: Temporal is MIT,
      DBOS is MIT, and Trigger.dev is Apache 2.0. Restate is BUSL 1.1 and
      Inngest is SSPL with delayed Apache 2.0 publication, both source-available
      rather than open source. Cloudflare Workflows is a proprietary managed
      service.
    </p>

    <h3 id="faq-exactly-once">Do these engines give exactly-once execution?</h3>

    <p>
      Exactly-once for the recorded state of the workflow, at-least-once for the
      side effects your steps perform. Use idempotency keys on anything that
      charges money or sends a message. See{" "}
      <a href="#guarantees">the guarantees section</a> above.
    </p>

    <h3 id="faq-long-running">How long can a durable workflow run?</h3>

    <p>
      Long enough that the limits stop being about time. Cloudflare Workflows
      caps a single sleep at 365 days and does not charge compute while an
      instance sleeps. Temporal executions can run for years. The practical
      ceiling is not duration, it is whether your code can still be replayed
      after however many deploys happened in the meantime.
    </p>

    <h2 id="next">Where to go next</h2>

    <p>
      If you are comparing tools rather than runtimes,{" "}
      <Link to="/blog/best-low-code-workflow-automation-tools">
        the ten best low-code workflow automation tools
      </Link>{" "}
      covers the automation category by hosting and license, and{" "}
      <Link to="/blog/workflow-automation-examples">
        ten runnable workflow automation examples
      </Link>{" "}
      shows what the graphs look like.{" "}
      <Link to="/docs/concepts">Core concepts</Link> documents how executions,
      triggers and resources fit together in Dafthunk, and{" "}
      <Link to="/blog/building-effective-agents">
        building effective agents
      </Link>{" "}
      covers the agent patterns that most need a runtime which survives a
      restart.
    </p>

    <p>
      Dafthunk is{" "}
      <a
        href="https://github.com/dafthunk-com/dafthunk"
        target="_blank"
        rel="noopener noreferrer"
      >
        MIT licensed and open source on GitHub
      </a>
      . The runtime described above is in <code>packages/runtime</code>, and the
      Cloudflare-specific half is in <code>apps/api/src/runtime</code>, if you
      would rather read the implementation than take our word for it.
    </p>
  </>
);
