# Running a user test

QA asks whether the thing does what it says. A user test asks whether a person
gets what they came for.

The method is four steps: run the real product, attempt a few tasks the way a
user would, write down what happened, fix the worst thing you saw. Run it often
on a small scope rather than once on everything.

## Setup

Drive the product in a browser with the server log beside it. Half the findings
come from the log: a screen that looks disappointing often covers a specific
failure.

```bash
pnpm dev > /tmp/dev.log 2>&1 &
```

## Tasks

Write three or four down first, in a user's words, before touching the product.
Cover four shapes:

1. **Your own words.** Not the product's examples, which flatter it.
2. **The happy path.** The ceiling.
3. **A thin or malformed attempt.** Real input looks like this.
4. **Recovery.** Break it, then repair it using only the screen.

The fourth reveals the most and gets tested the least.

## Watch, do not help

- Type what a user would type. Do not correct your phrasing to suit the parser.
- Click only what you can see. A missing affordance is the finding.
- Wait out slow steps and note the duration.
- Fix nothing mid-pass, or you end up testing your own patch.

Record each step as you go: action, expectation, result, log output. Screenshot
failures, and note cost and duration when the feature spends money or time.

Keep observations apart from explanations. Invisible text might be a
placeholder, a disabled input, a canvas, or a shadow root, and each takes a
different fix. Two identical failures might be two events, one cached response
served twice, or a deterministic bug. Verify any mechanism that changes the fix
and write the rest as questions.

## Fix the worst thing first

Rank findings by damage to the user, not by interest. Silent substitution
outranks a spacing bug. Take the top one or two; fixing the loud one leaves the
quiet one, so keep the rest on the list.

Ask questions before diagnosing. Is it deterministic? Eight runs give a
rate, and a rate comes before an explanation. Is it yours? Stash, re-run,
compare, because reasoning settles nothing. Is the environment right?
Credentials, flags and seeded data differ between dev, test and production, and
a probe reporting zero matches looks exactly like a probe measuring nothing.

Then re-run the original scenario in the browser. Unit tests prove the
mechanism; only the original path proves the experience. An identical retry
against a cache returns the identical cached failure, so read the whole screen
rather than the part you fixed. If an outage blocks verification, report it as
blocked.

## Report

What you ran and what happened. The findings, ranked. Corrections to earlier
claims that proved wrong, marked as corrections. What you skipped, and why.
Questions whose answers change what gets built.
