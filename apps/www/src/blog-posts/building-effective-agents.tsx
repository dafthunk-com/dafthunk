import { Link } from "react-router";

import { WorkflowPreview } from "../components/workflow-preview";

export const buildingEffectiveAgentsContent = (
  <>
    <p className="lead">
      Anthropic's{" "}
      <a
        href="https://www.anthropic.com/engineering/building-effective-agents"
        target="_blank"
        rel="noopener noreferrer"
      >
        Building Effective Agents
      </a>{" "}
      walks the patterns that ship in production and closes with three
      principles. Maintain simplicity in the design. Show the agent's planning
      steps. Carefully craft the agent-computer interface through tool
      documentation and testing.
    </p>

    <p>
      The third is the one most worth pulling on. Better tool descriptions and
      better tests are sound advice, and Anthropic gives both. The question we
      keep asking is whether there is a structural move underneath. What if the
      descriptions the model reads were the descriptions everyone reads? What if
      there were no separate tool surface to invest in? But first let's see how
      some of the patterns identified in the article map in Dafthunk.
    </p>

    <h2 id="workflow-or-agent">Workflow or Agent</h2>

    <p>
      Anthropic groups these systems under the term <em>agentic systems</em> and
      draws a line through the middle. A <em>workflow</em> follows fixed steps
      you set in advance. An <em>agent</em> picks its own next step at runtime.
    </p>

    <p>
      Two nodes do the work in Dafthunk. A <em>regular node</em> calls a model
      once and returns the answer. An <em>agentic node</em> runs the model in a
      loop, picks a tool, reads the result, and chooses what to do next. You
      decide where the workflow ends and the agent begins.
    </p>

    <p>
      Use a workflow when the steps are known. Use an agent when they are not. A
      support reply that runs the same four tools in the same order every time
      is a workflow. A research task that may need three lookups, one fetch, and
      one summary, in an order the model picks at runtime, is an agent.
    </p>

    <p>
      You do not have to choose at the start. A chain becomes a router when you
      add a fork. A router becomes an agent when one of its nodes turns agentic.
      An agent goes fully autonomous when you remove the surrounding graph.
      Let's walk through a few of the patterns Anthropic identifies and see how
      they map to Dafthunk's building blocks.
    </p>

    <h3 id="augmented-llm">The Augmented LLM</h3>

    <p>
      The base unit. A model with tools, retrieval, and memory. The node accepts
      optional inputs on top of the system prompt and the user message,
      including a tool list and a schema for the output.
    </p>

    <p>
      The AI Calculator template is a simple starting point. One model, one
      tool. The tool is a calculator node that does not know it is being used as
      a tool. The same node can drop into a chain that has nothing to do with
      AI.
    </p>

    <figure className="not-prose my-10">
      <WorkflowPreview
        templateId="ai-calculator"
        className="h-96 md:h-[28rem]"
        showBackground={false}
        padding={0.05}
        showCopyButton
      />
      <figcaption className="mt-3 text-sm text-gray-500 italic">
        The AI Calculator template. The model is wired to a calculator node as a
        tool. It picks when to call.
      </figcaption>
    </figure>

    <h3 id="prompt-chaining">Prompt Chaining</h3>

    <p>
      The simplest workflow pattern. Break a task into a fixed sequence of model
      calls with code between them.
    </p>

    <p>
      The Outline and Write template illustrates this pattern. The first model
      writes a short outline. The second writes the article from it.
    </p>

    <figure className="not-prose my-10">
      <WorkflowPreview
        templateId="outline-and-write"
        className="h-96 md:h-[28rem]"
        showBackground={false}
        padding={0.05}
        showCopyButton
      />
      <figcaption className="mt-3 text-sm text-gray-500 italic">
        The Outline and Write template. The outliner feeds the writer.
      </figcaption>
    </figure>

    <h3 id="routing">Routing</h3>

    <p>
      Routing reads an input, classifies it, and sends it to a specialist
      branch. The classifier is often a small model, sometimes a rule or a
      regex.
    </p>

    <p>The canvas has two kinds of fork-and-join.</p>

    <ul>
      <li>
        A <strong>conditional fork</strong> splits a path in two on a boolean.
      </li>
      <li>
        A <strong>switch fork</strong> splits a path into N branches on a string
        selector, with a <code>default</code> for anything that does not match.
      </li>
      <li>
        A matching <strong>join</strong> merges the branches back, taking
        whichever side ran.
      </li>
    </ul>

    <p>
      The thing that bites is the classifier. A small model will route a vague
      input confidently to the wrong branch. The fix is to use a schema to emit
      a structured object with a category <em>and</em> a confidence, and route
      only when the confidence clears a threshold. The schema usually lives on
      the classifier node.
    </p>

    <figure className="not-prose my-10">
      <WorkflowPreview
        templateId="support-routing"
        className="h-96 md:h-[28rem]"
        showBackground={false}
        padding={0.05}
        showCopyButton
      />
      <figcaption className="mt-3 text-sm text-gray-500 italic">
        The Support Routing template. The switch fork sends the message to a
        specialist branch. The switch join merges them.
      </figcaption>
    </figure>

    <h3 id="parallelization">Parallelization</h3>

    <p>
      Two flavors. <em>Sectioning</em> runs independent subtasks at the same
      time. <em>Voting</em> runs the same task many times for confidence.
    </p>

    <p>
      Sectioning is automatic. The runtime sees branches that do not depend on
      each other and runs them together. You do not mark anything as parallel.
      You draw the shape, and the shape is the parallelism.
    </p>

    <p>
      The Parallel Article Card template fans one article out to three nodes: a
      summarizer, a keyword extractor, and a title generator. They start at
      once.
    </p>

    <figure className="not-prose my-10">
      <WorkflowPreview
        templateId="parallel-article-card"
        className="h-96 md:h-[28rem]"
        showBackground={false}
        padding={0.05}
        showCopyButton
      />
      <figcaption className="mt-3 text-sm text-gray-500 italic">
        The Parallel Article Card template. Three independent calls fan out from
        one input and fan back into one card.
      </figcaption>
    </figure>

    <h3 id="agents">Agents</h3>

    <p>
      The far end of the range. An agent plans, acts, observes, and repeats for
      as long as the task takes. Anthropic's guidance is sound. Invest in the
      tools. Set a step budget. Run in a sandbox.
    </p>

    <p>
      The agentic node does all three. The toolset is a typed list from the
      catalog. The step budget is a number on the node. The loop stops when it
      runs out and reports why. The sandbox is the workflow's organization. An
      agent reaches only the secrets, integrations, datasets, and databases that
      the organization owns.
    </p>

    <p>
      The Wiki Research Agent template is three nodes: the question, the agent,
      the answer. Three tools live inside the agent: a Wikipedia search, a
      current-time tool, a date-difference tool.
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
        The Wiki Research Agent template. Three nodes: the question, the agent,
        the answer. The toolset lives inside the agent.
      </figcaption>
    </figure>

    <h2 id="two-registries">Two Registries</h2>

    <p>
      The patterns are building blocks, not boxes. Place an agent inside a
      routing branch. Wrap a chain in a fork-join. None of this is novel. What
      feels novel is how cheap it becomes once the node and tool registries draw
      from the same catalog.
    </p>

    <p>
      In Dafthunk the tools are just a subset of the nodes: the ones that can be
      called from an agentic node. Since nodes have several inputs, settings let
      the user define presets. The agent fills in the blanks at runtime using
      the descriptions and schemas on the node.
    </p>

    <p>
      To see the patterns in action, browse the{" "}
      <Link to="/nodes">nodes reference</Link>. The{" "}
      <Link to="/docs/concepts">core concepts</Link> page describes how
      triggers, executions, and resources fit together. Dafthunk is{" "}
      <a
        href="https://github.com/dafthunk-com/dafthunk"
        target="_blank"
        rel="noopener noreferrer"
      >
        open source on GitHub
      </a>
      . Issues and pull requests welcome.
    </p>
  </>
);
