/**
 * The complete requests offered to someone who has not written one yet.
 *
 * Read in three places, which is why the data sits here rather than in the API
 * that ranks it: the chips on the first screen take the top of the list, the
 * brief prompt takes the same top three as its few-shot examples, and the API
 * ranks the whole list against a request too thin to read back. One list, so
 * the sentence a person is shown is the sentence the generator was taught.
 *
 * Separate from `BENCHMARK_CASES`, which used to supply these, because the two
 * are chosen against opposite criteria. A benchmark case mirrors one shipped
 * template and is deliberately minimal, so that a failure attributes to one
 * capability — "Translate some text from English into French" is a good
 * measurement and a dispiriting suggestion. What belongs on a first screen is
 * the automation someone came here wanting: a trigger they recognise, a job
 * worth doing, and a destination they already use. The two sets barely
 * overlap; the digest below is not a template at all.
 *
 * Every sentence is the same shape — when it runs, what it does, where the
 * result goes — because they are read as a group, and a list that changes
 * shape line to line reads as a list of unrelated things rather than a menu.
 *
 * Two rules for adding one. It has to be a job people actually ask for, and
 * the suite has to show the generator can build it: everything here is a
 * capability the benchmark or the evaluation covers and passes, so nobody is
 * offered a sentence that then fails in front of them. Order matters — the
 * first three are the chips, the padding and the few-shot examples, so the
 * strongest go first.
 */
export interface BriefExample {
  /** Stable id; its words are scored, so it reads like a short title. */
  id: string;
  /** Offered to the person verbatim. */
  prompt: string;
  /** Words a request might use that the sentence itself does not contain. */
  keywords: string[];
}

export const BRIEF_EXAMPLES: BriefExample[] = [
  {
    id: "daily digest email",
    prompt:
      "Every morning, summarize the top ten stories on Hacker News and email me the digest.",
    keywords: ["Digest", "Newsletter", "Summary", "Schedule", "Email", "News"],
  },
  {
    id: "telegram assistant bot",
    prompt:
      "Create a Telegram bot that answers customer questions about my product.",
    keywords: ["Telegram", "Bot", "Chat", "Assistant", "Support", "Reply"],
  },
  {
    id: "contact form to discord",
    prompt:
      "When someone submits my contact form, post the details to Discord.",
    keywords: ["Form", "Discord", "Notify", "Submission", "Contact", "Lead"],
  },
  {
    id: "weekly standup reminder",
    prompt:
      "Every Monday at 9am, post a standup reminder to my team's Slack channel.",
    keywords: ["Slack", "Schedule", "Reminder", "Standup", "Weekly", "Team"],
  },
  {
    id: "support inbox auto reply",
    prompt:
      "When an email arrives in my support inbox, draft a reply with AI and send it back.",
    keywords: ["Email", "Inbox", "Support", "Reply", "Autoresponder", "Ticket"],
  },
  {
    id: "incident webhook alert",
    prompt:
      "Take webhook calls from my monitoring tool, turn each one into a one-line alert and post it to Discord.",
    keywords: ["Webhook", "Alert", "Discord", "Monitoring", "Incident", "Ops"],
  },
  {
    id: "customer lookup endpoint",
    prompt:
      "An HTTP endpoint that looks up a customer by email in my table and returns their record.",
    keywords: ["HTTP", "Endpoint", "API", "Database", "Lookup", "Customer"],
  },
  {
    id: "answer from my documents",
    prompt:
      "Answer a question from the documents in my dataset and show me the answer.",
    keywords: [
      "Dataset",
      "Documents",
      "Question",
      "Search",
      "Knowledge",
      "RAG",
    ],
  },
];
