import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DocsOverviewPage() {
  usePageBreadcrumbs([{ label: "Core Concepts" }]);

  return (
    <>
      {/* Header */}
      <div className="space-y-2 mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Core Concepts</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Dafthunk is a platform for creating, executing, and monitoring visual
          workflows. It enables you to automate complex tasks by connecting
          different processing units, called nodes, in a drag-and-drop
          interface. Built on Cloudflare, Dafthunk leverages serverless
          functions for scalable execution and AI capabilities for intelligent
          processing.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none docs-content space-y-8">
        <h2 id="workflows">Workflows</h2>
        <p>
          A <strong>Workflow</strong> is the blueprint for your automation. It's
          a visual representation of a series of steps, defined by connecting
          nodes together. Each workflow is saved within your organization and
          can be versioned and updated as your needs evolve. Think of it as the
          overall process you want to automate, like processing new user
          sign-ups or handling customer support tickets.
        </p>
        <h2 id="nodes">Nodes</h2>
        <p>
          <strong>Nodes</strong> are the individual building blocks of a
          workflow. Each node performs a specific task, such as making an HTTP
          request, running an AI model for text analysis, transforming data, or
          making a decision based on input. You connect nodes by their inputs
          and outputs to define the flow of data and logic.
        </p>
        <h2 id="deployments">Deployments</h2>
        <p>
          A <strong>Deployment</strong> is a specific, runnable version of your
          workflow. When you're ready to make a workflow active, you create a
          deployment. This makes the workflow accessible, often via an API
          endpoint or a trigger mechanism (e.g., a webhook). Each deployment is
          a snapshot of your workflow, allowing you to manage different versions
          and roll back if necessary.
        </p>
        <h2 id="executions">Executions</h2>
        <p>
          An <strong>Execution</strong> is a single run of a deployed workflow.
          Every time your workflow is triggered, an execution record is created.
          This record tracks the status of the run (e.g., <code>started</code>,{" "}
          <code>executing</code>, <code>completed</code>, or <code>error</code>
          ), its inputs, outputs, and any logs. Executions are crucial for
          monitoring, debugging, and understanding how your workflows are
          performing.
        </p>
        <h2 id="organizations">Organizations</h2>
        <p>
          Dafthunk is designed for collaboration. <strong>Organizations</strong>{" "}
          serve as containers for your workflows, deployments, and executions.{" "}
          <strong>Users</strong> belong to organizations and can collaborate on
          building and managing workflows based on their roles and permissions.
        </p>

        <h2 id="practical-example">Practical Example</h2>
        <p>
          Let's illustrate with an example: generating an image from text and
          saving it.
        </p>
        <ol>
          <li>
            <strong>Design a Workflow</strong>: In your Dafthunk organization,
            you create a new <code>Workflow</code>. You connect the following
            nodes:
            <ul>
              <li>
                An "Input" node (or an "HTTP Request" node if triggered
                externally) to accept a text prompt, for example, "a futuristic
                cityscape at sunset."
              </li>
              <li>
                An "Image Generation" AI node, which takes the text prompt as
                input and produces an image.
              </li>
              <li>
                An "HTTP Request" node configured to send the generated image
                (e.g., as binary data or a URL to the image) to an external
                storage service or your own API endpoint for saving.
              </li>
            </ul>
          </li>
          <li>
            <strong>Deploy the Workflow</strong>: Once the workflow is designed,
            you create a <code>Deployment</code>. This makes the workflow active
            and, if using an HTTP trigger, provides an endpoint.
          </li>
          <li>
            <strong>Trigger and Execute</strong>: You (or an external system)
            send a request containing the text prompt to the deployed workflow's
            endpoint. This starts an <code>Execution</code>.
          </li>
          <li>
            <strong>Monitor the Result</strong>: In Dafthunk, you can observe
            the <code>Execution</code>. You'll see the input prompt, the
            successful generation of the image by the AI node, and the
            confirmation that the HTTP request node successfully sent the image
            data to your specified storage location. If any step failed, the
            execution status would indicate an error, allowing you to
            investigate.
          </li>
        </ol>
        <p>
          This example shows how Dafthunk can orchestrate standard web tasks,
          all visually configured and monitored through <code>Workflows</code>,{" "}
          <code>Deployments</code>, and <code>Executions</code>.
        </p>
      </div>
    </>
  );
}
