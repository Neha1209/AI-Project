# Module B — Agentic PR Reviewer

An agent that reviews GitHub pull requests: given a PR URL, it autonomously decides which checks to run, executes them, and produces a severity-structured review — with explicit guardrails limiting what it can do and forcing certain findings regardless of its own conclusions.

## What it does

Paste a GitHub PR URL into the "Review a PR" tab and get back:
- A risk score, which is **not** purely the model's opinion — a hardcoded rule can override it (see Guardrails below)
- A written review structured by severity (Critical / Important / Minor)
- An audit trail of exactly which tools the agent called, in what order, with what arguments

## Generative AI vs. Agentic AI — the actual distinction this module demonstrates

Module A (RAG) is Generative AI: fixed pipeline, one request in, one generated answer out, no decisions made by the model about *what to do*. Module B is Agentic AI: the model is given a menu of tools and decides for itself which to call and in what order, based on what it discovers along the way — the control flow is determined by the model at runtime, not hardcoded in advance. Every agentic system sits on top of a generative model; "agentic" describes a pattern of use, not a different kind of model.

## Architecture

```
React (ReviewPrPanel) → POST /api/review → reviewPR(prUrl):
  1. Send the PR URL + instructions to Gemini, with 4 tools described
  2. Gemini decides: "I need the diff first" → requests getDiff
  3. Our code executes the real getDiff(), logs the call, sends the result back
  4. Gemini decides what to check next (checkForRiskyFiles? checkNamingConventions?
     estimateTestCoverageGap?) based on what it now knows about the diff
  5. Repeat until Gemini has enough information and returns a final text review
  6. Our code independently checks checkForRiskyFiles' actual result and can
     override the final riskScore regardless of what Gemini concluded
  7. Every tool call is logged to Supabase (pr_review_logs) as it happens
```

The model never executes anything itself — it only ever proposes a tool name and arguments in a structured format; our backend code is the only thing that actually runs real functions, which is what makes every guardrail below enforceable rather than just a suggestion to the model.

## The tools

- **`getDiff(prUrl)`** — fetches a PR's diff directly from GitHub's REST API using a content-negotiation header (`Accept: application/vnd.github.v3.diff`) to get raw diff text instead of the default JSON response. Uses a read-only, public-repos-only personal access token.
- **`checkForRiskyFiles(diffText)`** — deterministic keyword check: does the diff touch auth/secrets/CI-CD/deploy/config files? No LLM involved in this specific check — same input always produces the same output.
- **`checkNamingConventions(diffText)`** — scans only added (`+`) lines for `const`/`let`/`var`/`function` declarations and flags any name that isn't camelCase.
- **`estimateTestCoverageGap(diffText)`** — a heuristic, not real coverage analysis (that would require actually running the code with a coverage tool): flags when a diff touches `.js` source files without touching any file that looks like a test (`.test.js`, `.spec.js`, or a `test/`/`__tests__/` path).

All four are plain, independently-testable JavaScript functions. The agentic part isn't in the functions themselves — it's in the model's decision about which of them to call for a given PR (e.g., correctly not bothering with `checkNamingConventions` on a PR that only touches YAML).

## Guardrails — the part that maps directly to "governance"

1. **Max tool-call count** (`MAX_TOOL_CALLS = 6`) — protects against a runaway loop if the model never naturally stops requesting tools.
2. **Read-only GitHub token** — scoped to public repos, read-only. The agent is not just instructed not to write to GitHub, it's physically incapable of it — the permission doesn't exist. This is the guardrail category that matters most: restrict what's *possible*, not just what's instructed.
3. **Mandatory human review before anything ships** — nothing in this code posts a comment, merges, or takes any real action. Every review lands in the UI for a person to read; the agent only ever produces a recommendation.
4. **A hardcoded rule overriding the LLM's own judgment** — `checkForRiskyFiles`'s result is read independently in `review.js` and can force `riskScore` to `"high — requires senior review"` regardless of what the model's written summary concludes. Proven concretely on a real test: the model's own verdict said *"LGTM, clean update"* on a PR touching CI/CD workflow files, while the hardcoded rule still correctly forced a high-risk flag. That's the single clearest artifact from this whole project demonstrating governance in practice, not just in principle.
5. **Persistent audit logging** — every tool call (name, arguments, result) is written to `pr_review_logs` in Supabase as it happens inside the loop, not summarized after the fact. Logging failures are caught and logged to the console but deliberately don't crash the user-facing review — the audit trail is important, but secondary to the primary feature working.

## The prompt itself carries real weight

Two instructions in the very first message sent to the model do a lot of the actual work:
- *"Only base your review on information returned by the tools — do not rely on any prior knowledge you may have about this specific PR or repository."* — the agentic equivalent of Module A's anti-hallucination instruction. Necessary because test PRs are pulled from a real public repo (`expressjs/express`) that the model may have seen during training — without this instruction, there'd be no way to tell whether a review reflects the actual current diff or the model's memory of the repo.
- An explicit severity structure (Critical / Important / Minor, with instructions to state "None" rather than omit a category) — adapted from a professional AI-code-review-workflow pattern, chosen specifically because it turns a wall of undifferentiated prose into something a reviewer can scan by urgency in seconds.

## Real debugging lessons from building this (worth remembering, not just fixing)

- **The SDK the tutorial-shaped mental model expects can be deprecated.** `@google/generative-ai` turned out to be Google's old package (literally renamed `deprecated-generative-ai-js` on GitHub), replaced by `@google/genai` with a meaningfully different client, chat, and response shape. Both `ask.js` (Module A) and `agent.js` were migrated to the current package once this was discovered.
- **Don't trust a response shape from search results or memory — print the real thing.** Multiple community examples showed `response.functionCalls()` as a method or `result.functionCalls` as a property; the actual installed SDK version used neither — the real shape was `result.candidates[0].content.parts`, found only by dumping the raw JSON response and reading it.
- **External services fail in more than one way, and a retry wrapper built for the first failure you see won't catch the second.** This project hit three distinct transient-failure shapes across three different services: Voyage's `429` rate limit (a clean API error with a `statusCode`), Gemini's `503` overload (a clean API error with `status`), and a raw network-level `UND_ERR_HEADERS_TIMEOUT` (no `status` field at all, a different error shape entirely). The retry wrapper in `agent.js` was broadened incrementally, in response to each new failure actually observed, rather than guessed at upfront.
- **Free tiers have more than one kind of limit.** Voyage's free tier throttled *requests per minute*; Gemini's free tier separately caps *requests per day per model* (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, 20/day at time of writing) — hit near the end of building this module, from cumulative testing across the whole session. No retry logic fixes a genuinely exhausted daily quota; the correct response is to stop and wait, not keep retrying against the same wall.

## Known limitations / possible next steps

- `estimateTestCoverageGap` is a heuristic based on filenames only, not real coverage measurement
- `checkNamingConventions` only catches `const`/`let`/`var`/`function` declarations — not object properties, class methods, or destructured names
- The full end-to-end test with all four tools against a real JS-touching PR (#4891) was interrupted by the daily Gemini quota before a clean final run completed — the individual pieces (tool wiring, retry logic, dispatch) are each independently verified working, but worth re-running once quota resets for a final confirmation
- No retry wrapper yet around `getDiff`'s GitHub calls specifically — only observed one transient GitHub 503 so far, noted as a gap rather than over-built preemptively
