import { Link } from "react-router";

export const generatingWorkflowsFromASentenceContent = (
  <>
    <p className="lead">
      Dafthunk can now build a workflow from a short description. A workflow is
      a set of steps that run on their own, and each step is called a node. Type
      "every weekday at 9am, write a short standup reminder and post it to
      Slack" and you get three nodes in a row: one that wakes up at 9am, one
      that writes the message, and one that sends it to Slack. An AI model
      writes this first version. Five other steps check its work, and most of
      our effort went into those five. Here are some of the problems we found.
    </p>

    <h2 id="catalog">Choosing what the model sees</h2>

    <p>
      Dafthunk has more than four hundred kinds of node. We cannot show them all
      to the model, because the list would be far too long. So we search the
      list, the way a search engine does. We compare the words in your request
      with the words on each node: its name, its id, its tags. The best matches
      go into the prompt.
    </p>

    <p>
      One detail matters a lot here. A word that sits on almost every node tells
      us nothing. Tags like <code>Geo</code> and <code>Social</code> are on a
      fifth of the catalog, and if we treated them like any other word they
      would hide the few nodes that really fit. So a rare word counts for much
      more than a common one. We do not use embeddings, the usual way of
      comparing meaning with AI. We have only a few hundred short texts here,
      and simple word matching is enough.
    </p>

    <p>
      Word matching has one weakness: it fails when you and the node use
      different words. Nobody writes "agent" in a request. They write "post a
      standup reminder". So the agent node matches nothing and never reaches the
      model, even though it is the node that does the writing. Our fix is a
      small list of nodes we always include, whatever the words are: inputs,
      outputs, simple helpers, and the agent. We also add the node that delivers
      the result.
    </p>

    <p>
      A mistake here is the worst kind, because nobody sees it. There is no
      error message. If we forget to show the right node, the model simply
      invents one that does not exist, and we only find out two steps later. So
      we now save the full list of nodes we showed. When a workflow comes out
      wrong, our first question is whether the right node was on the list at
      all.
    </p>

    <p>
      That list is still the biggest part of the prompt: 26,298 characters out
      of 40,418 in a recent run. So the number of nodes we show is most of what
      a generation costs, and we are still looking for the right number.
    </p>

    <h2 id="posting">Stopping it from posting</h2>

    <p>
      We want to run each new workflow one time before we show it to you,
      because a workflow can pass all our checks and still break the first time
      it really runs.
    </p>

    <p>
      Look at the example again. The last node posts to Slack. Other workflows
      send an email, or publish a tweet. We cannot test those for real. Nobody
      wants a test message in their team channel.
    </p>

    <p>
      Our first idea was to ask for permission. It was a bad idea. We were
      asking people to say yes or no to something they had not seen yet.
    </p>

    <p>
      Now we do a practice run. Before the test, we swap every node that sends
      something out of Dafthunk for a copy that sends nothing. The Slack node
      still gets its real input, so the message really does get written. Then,
      instead of posting it, the node returns a fake answer. Nodes that only
      read data are left alone, because reading is safe.
    </p>

    <p>
      Saving was dangerous too. When we save a workflow, we read its nodes and
      create the schedule from them, and new workflows are switched on by
      default. So our example would have started posting to Slack at 9am the
      next morning, without anyone asking for it. Now we take the schedule out
      just before saving and keep it aside. The button that turns the workflow
      on puts it back.
    </p>

    <h2 id="repair">Repairing without making it worse</h2>

    <p>
      When our checks find a problem, we send the workflow back to the model and
      ask for a fix. That only works if we explain the problem clearly.
    </p>

    <p>
      Our checker was not clear at all. It said "Invalid parameter reference in
      connection" and gave two node names. A person can work with that: they
      open the editor and look. A model cannot, because the sentence is all it
      gets. So we now rewrite every error before we send it. We name the input
      that is wrong, the kind of data it needs, and the inputs that would have
      worked.
    </p>

    <p>Each workflow gets two tries at a fix. We shipped two bugs here.</p>

    <p>
      The first: the model sent back an answer that was written correctly but
      had no nodes in it at all. We then added the trigger back automatically,
      so our checks saw a small, valid, one-node workflow and accepted it. A
      workflow with eleven nodes became one node with nothing attached. We saved
      it and told the user it had worked. Now we throw away any answer with no
      nodes in it.
    </p>

    <p>
      The second was harder to spot. A fix can pass every check and still run
      worse than the version it replaced. The model often reads "this node is
      missing an input" and adds new nodes around it, leaving the real problem
      where it was. So now we compare: we run the fix and count the broken
      nodes. If there are not fewer than before, we keep the old version.
    </p>

    <h2 id="measuring">Measuring it</h2>

    <p>
      How do we know whether any of this works? We keep a set of ready-made
      workflows, our templates. For each one, we write the request a normal
      person would type, and we ask the generator to build it.
    </p>

    <p>
      Then we check what the result can do, not only whether it is valid. That
      difference matters, because a workflow can be perfectly valid and still
      useless. If we asked it to read a table, we accept any node that reads a
      table. We do not insist on the exact one our template used.
    </p>

    <p>
      Our last test: out of 37 requests, 26 gave a valid workflow on the first
      try and 33 after a repair. 32 chose the right trigger, the thing that
      starts the workflow. Four of the five failures were the empty answer bug
      above. We stopped that bug from doing damage. We have not stopped it from
      happening.
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
      , generator included. The <Link to="/docs/concepts">core concepts</Link>{" "}
      page explains how triggers, executions and resources work together, and{" "}
      <Link to="/blog/workflow-automation-examples">
        ten workflow automation examples
      </Link>{" "}
      shows the kind of workflow it tries to build.
    </p>
  </>
);
