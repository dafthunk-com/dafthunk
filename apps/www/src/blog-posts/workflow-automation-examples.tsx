import { Link } from "react-router";

import { WorkflowPreview } from "../components/workflow-preview";

interface ExampleRow {
  name: string;
  id: string;
  job: string;
  input: string;
  engine: string;
}

// Every row was read from the template source in apps/api/src/templates on
// 2026-07-28. Model identifiers are the ones the template pins, not the family
// name, because the behaviour differs between them.
const examples: ExampleRow[] = [
  {
    name: "Web Screenshot",
    id: "web-screenshot",
    job: "Capture a full page as an image",
    input: "A URL",
    engine: "Cloudflare Browser Rendering",
  },
  {
    name: "Text Summarization",
    id: "text-summarization",
    job: "Compress long text to a summary",
    input: "Pasted text",
    engine: "bart-large-cnn",
  },
  {
    name: "Sentiment Analysis",
    id: "sentiment-analysis",
    job: "Score text as positive or negative",
    input: "Pasted text",
    engine: "distilbert-sst-2",
  },
  {
    name: "Text Translation",
    id: "text-translation",
    job: "Translate between languages",
    input: "Text, source, target",
    engine: "m2m100-1.2b",
  },
  {
    name: "Speech to Text",
    id: "speech-to-text",
    job: "Transcribe audio, with word timings",
    input: "Recorded audio",
    engine: "Whisper",
  },
  {
    name: "Text to Speech",
    id: "text-to-speech",
    job: "Read text aloud as audio",
    input: "Pasted text",
    engine: "MeloTTS",
  },
  {
    name: "Image Generation",
    id: "image-generation",
    job: "Draw an image from a prompt",
    input: "A prompt",
    engine: "SDXL-Lightning",
  },
  {
    name: "Image Description",
    id: "image-description",
    job: "Describe a picture in words",
    input: "A canvas drawing",
    engine: "uform-gen2-qwen",
  },
  {
    name: "Image Processing",
    id: "image-processing",
    job: "Run an image through a filter chain",
    input: "Webcam capture",
    engine: "Photon (no model)",
  },
  {
    name: "AI Calculator",
    id: "ai-calculator",
    job: "Let a model call a tool for arithmetic",
    input: "A word problem",
    engine: "Llama 3.3 70B",
  },
];

/**
 * One embedded template canvas. Every example in this post gets one, so the
 * shared sizing lives here rather than being repeated ten times.
 */
function TemplateFigure({ id, caption }: { id: string; caption: string }) {
  return (
    <figure className="not-prose my-10">
      <WorkflowPreview
        templateId={id}
        className="h-96 md:h-[28rem]"
        showBackground={false}
        padding={0.05}
        showCopyButton
      />
      <figcaption className="mt-3 text-sm text-gray-500 italic">
        {caption}
      </figcaption>
    </figure>
  );
}

export const workflowAutomationExamplesContent = (
  <>
    <p className="lead">
      Most lists of workflow automation examples describe automations instead of
      showing them. You read that employee onboarding is a good candidate, you
      agree, and you are no closer to having one. Each of the ten examples below
      is a real graph on a canvas you can scroll through, and you can copy any
      of them into an editor and press run. This post says what each one does,
      which model or service does the work, and what you must add before it
      becomes an automation rather than a demo.
    </p>

    <h2 id="what-is">What counts as a workflow automation example</h2>

    <p>
      A workflow is a set of steps with the data dependencies drawn between
      them. Automation is what happens when something other than a person starts
      it. Conflating the two is why so many examples of workflow automation read
      as inspiring and help nobody.
    </p>

    <p>
      An example of a workflow is the shape: this input feeds that step, which
      feeds two more that run at the same time. An example of an automation is
      the shape plus a trigger and a destination: the same graph, started by a
      schedule or an incoming request, writing its result where a person will
      find it. Every template below is the first. The{" "}
      <a href="#triggers">section near the end</a> covers turning it into the
      second, the step these lists skip.
    </p>

    <h2 id="examples">Ten workflow automation examples</h2>

    <p>
      These ten templates ship with Dafthunk. Each is small on purpose, three to
      five nodes, because its job is to be read in one glance and modified, not
      deployed as-is. Every canvas below is the live template, not a screenshot.
    </p>

    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Example</th>
            <th>What it does</th>
            <th>Input</th>
            <th>Engine</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((example) => (
            <tr key={example.id}>
              <td>
                <Link to={`/workflows/${example.id}`}>{example.name}</Link>
              </td>
              <td>{example.job}</td>
              <td>{example.input}</td>
              <td>{example.engine}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h3 id="web-screenshot">1. Capture a web page as an image</h3>

    <p>
      The <Link to="/workflows/web-screenshot">Web Screenshot</Link> template is
      three nodes: a text input holding a URL, a screenshot node running on
      Cloudflare Browser Rendering, and an image output. The browser node drives
      a real headless Chrome, so pages that need JavaScript to render come out
      right. That is the reason to use a browser instead of fetching HTML.
    </p>

    <TemplateFigure
      id="web-screenshot"
      caption="URL in, headless browser in the middle, image out."
    />

    <p>
      On its own this is a demo. It earns its keep when the URL stops being
      typed by hand: point it at a list of competitor pages on a daily schedule,
      store each capture, compare against yesterday, and the same shape becomes
      change monitoring. The screenshot node is one of ten browser nodes, so the
      same starting point extends to page text, links, Markdown or structured
      JSON instead of pixels.
    </p>

    <h3 id="text-summarization">2. Summarize long text</h3>

    <p>
      <Link to="/workflows/text-summarization">Text Summarization</Link> is a
      text input, a summarizer pinned to <code>bart-large-cnn</code> with a{" "}
      <code>max_length</code> setting, and a text output. BART summarizes; it is
      not a general chat model. That makes it fast and cheap, and it means the
      model extracts and compresses instead of reasoning.
    </p>

    <TemplateFigure
      id="text-summarization"
      caption="max_length is a token budget, not a sentence count."
    />

    <p>
      For meeting notes and article digests that trade is right. When the job
      needs judgement about what matters, swap the middle node for an Anthropic,
      OpenAI or Gemini node and keep the rest of the graph.
    </p>

    <h3 id="sentiment-analysis">3. Score sentiment on incoming text</h3>

    <p>
      <Link to="/workflows/sentiment-analysis">Sentiment Analysis</Link> is a
      text input, a <code>distilbert-sst-2</code> classifier, and a JSON output.
      It returns labels with confidence scores instead of prose, and that detail
      makes it composable: a number can drive a branch, a paragraph cannot.
    </p>

    <TemplateFigure
      id="sentiment-analysis"
      caption="The JSON output carries a label and a score, not a sentence."
    />

    <p>
      This is the classifier half of a triage automation. Add a conditional fork
      that reads the score, and negative feedback routes to a human while
      everything else gets filed. We covered the failure mode in{" "}
      <Link to="/blog/building-effective-agents">
        building effective agents
      </Link>
      : a small classifier routes a vague input confidently to the wrong branch.
      Gate on the confidence score, not the label alone.
    </p>

    <h3 id="text-translation">4. Translate between languages</h3>

    <p>
      <Link to="/workflows/text-translation">Text Translation</Link> is the
      first example here with more than one input. Three text inputs feed one
      node: the text, a source language code, and a target language code. The
      model, <code>m2m100-1.2b</code>, translates directly between language
      pairs instead of pivoting through English.
    </p>

    <TemplateFigure
      id="text-translation"
      caption="Three inputs converging on one node. The two language codes are ordinary text inputs, not a special setting."
    />

    <p>
      The single translation is the dull version. The useful one is the fan-out:
      one source string, six target-language nodes running at once, because the
      runtime runs independent branches in parallel without being told to. You
      draw the shape, and the shape is the parallelism.
    </p>

    <h3 id="speech-to-text">5. Transcribe audio</h3>

    <p>
      <Link to="/workflows/speech-to-text">Speech to Text</Link> is an audio
      recorder input, Whisper, and a text output. The transcriber emits more
      than the transcript: a word count, per-word timings, and a WebVTT track.
    </p>

    <TemplateFigure
      id="speech-to-text"
      caption="Only the transcript reaches the output. The timing and WebVTT outputs sit unused on the middle node."
    />

    <p>
      So subtitles and timestamp search are wiring, not new capability. The
      outputs already exist; the template leaves them unconnected.
    </p>

    <h3 id="text-to-speech">6. Turn text into speech</h3>

    <p>
      <Link to="/workflows/text-to-speech">Text to Speech</Link> is a text
      input, MeloTTS with a language setting, and an audio output. It inverts
      the previous example, and the two compose: transcribe, translate,
      re-speak.
    </p>

    <TemplateFigure
      id="text-to-speech"
      caption="The mirror image of the transcription graph, and the two chain end to end."
    />

    <h3 id="image-generation">7. Generate an image from a prompt</h3>

    <p>
      <Link to="/workflows/image-generation">Image Generation</Link> is a prompt
      input into SDXL-Lightning, then an image output. The node carries negative
      prompt, width, height, step count and guidance as settings, not buried in
      a config file.
    </p>

    <TemplateFigure
      id="image-generation"
      caption="Lightning is the distilled variant, tuned for few-step generation: the fast and cheap end, not the quality end."
    />

    <h3 id="image-description">8. Describe an image in words</h3>

    <p>
      <Link to="/workflows/image-description">Image Description</Link> is a
      canvas you draw on, a vision model, and a text description out. The canvas
      input keeps the template self-contained in a browser, and it is the first
      thing to replace.
    </p>

    <TemplateFigure
      id="image-description"
      caption="Swap the canvas for a file input or a URL fetch and the same graph describes images arriving from anywhere."
    />

    <h3 id="image-processing">9. Chain image filters</h3>

    <p>
      <Link to="/workflows/image-processing">Image Processing</Link> is the one
      example with no model in it. A webcam capture runs through three Photon
      nodes in series, invert, contrast, pixelize, and comes out the other end
      as a pop-art frame.
    </p>

    <TemplateFigure
      id="image-processing"
      caption="Three deterministic filters in series, no model involved."
    />

    <p>
      It earns its place because nothing intelligent happens. A workflow engine
      is a general dependency graph, and treating every step as an AI call is
      how you pay model prices to resize an image.
    </p>

    <h3 id="ai-calculator">10. Give a model a tool</h3>

    <p>
      In <Link to="/workflows/ai-calculator">AI Calculator</Link>, a word
      problem goes into a Llama 3.3 70B node with a calculator wired to it as a
      tool. The model decides when to call it, and the node returns the answer
      and the list of tool calls it made. That second output is the one that
      matters when something goes wrong: it shows the working, not the
      conclusion.
    </p>

    <TemplateFigure
      id="ai-calculator"
      caption="The calculator does not know it is being used as a tool."
    />

    <p>
      The calculator is an ordinary node from the same catalog as every other
      node. The model can call it because nodes already carry descriptions and
      schemas.
    </p>

    <h2 id="triggers">From example to automation</h2>

    <p>
      All ten templates use a manual trigger. You press run. That suits a
      starting point, and it is why none of them is an automation yet. Three
      things turn one into the other.
    </p>

    <ul>
      <li>
        <strong>A trigger.</strong> A schedule for anything periodic, an HTTP
        request for anything another system starts, an inbound email for
        anything a person starts by writing to an address.
      </li>
      <li>
        <strong>A destination.</strong> A demo ends at an output node you look
        at. An automation ends somewhere durable: a database row, a file in
        storage, a message in a channel, a reply.
      </li>
      <li>
        <strong>A decision about failure.</strong> What should happen when the
        model returns nonsense or the page fails to load? Silent failure in a
        scheduled workflow is worse than no workflow, because you stop checking.
      </li>
    </ul>

    <p>
      The first two take a few minutes. The third decides whether the automation
      survives a month of real inputs.
    </p>

    <h2 id="scope">
      Simple workflow examples versus business process examples
    </h2>

    <p>
      Searches for workflow examples split into two intents that want different
      answers. One wants the technical shape, which this page shows. The other
      wants business process automation examples: approval chains, employee
      onboarding, purchase orders, workflows that run on human sign-offs with
      software keeping score.
    </p>

    <p>
      Dafthunk serves the first. Its steps are computation, not human approval
      gates. If you need multi-stage approval routing with delegation rules and
      an audit trail of who signed what, a dedicated BPM tool will serve you
      better. The overlap is partial: the classification, extraction and
      notification steps inside a business process are what these examples do
      well.
    </p>

    <h2 id="gaps">What these examples do not cover</h2>

    <p>
      An honest list should say where it is thin. Two of the highest-demand
      categories on comparable platforms are missing here. Dafthunk has no AI
      video generation, and no Google Workspace surface beyond Calendar and
      Gmail, so the Sheets-and-Drive automations that fill template galleries
      elsewhere are out of reach for these ten today.
    </p>

    <p>
      What it covers well: browser automation and scraping, the highest-traffic
      template category on comparable platforms, where ten browser nodes already
      ship; research agents; image generation and processing; and chat surfaces
      including Discord, Telegram and WhatsApp. The ten templates above are a
      slice of that, small enough to read rather than exhaustive.
    </p>

    <h2 id="next">Where to go next</h2>

    <p>
      Every example links to its own page in the{" "}
      <Link to="/workflows">workflow templates gallery</Link>, and the{" "}
      <Link to="/nodes">nodes reference</Link> lists the building blocks each
      one uses. <Link to="/docs/concepts">Core concepts</Link> covers how
      triggers, executions and resources fit together, the material behind the{" "}
      <a href="#triggers">trigger section</a> above. If you are still choosing a
      platform,{" "}
      <Link to="/blog/best-low-code-workflow-automation-tools">
        the ten best low-code workflow automation tools
      </Link>{" "}
      compares the field by hosting and license instead of feature count.
    </p>

    <p>
      Dafthunk is{" "}
      <a
        href="https://github.com/dafthunk-com/dafthunk"
        target="_blank"
        rel="noopener noreferrer"
      >
        open source on GitHub
      </a>
      . Every template in this post lives in <code>apps/api/src/templates</code>
      , so a pull request is the fastest way to add the example you wanted and
      did not find.
    </p>
  </>
);
