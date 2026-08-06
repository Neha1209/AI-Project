import { GoogleGenAI } from "@google/genai";
import { getDiff, checkForRiskyFiles, estimateTestCoverageGap, checkNamingConventions } from "./github.js";
import { supabase } from "./supabase.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const tools = [
  {
    functionDeclarations: [
      {
        name: "getDiff",
        description:
          "Fetches the code diff for a given GitHub pull request URL.",
        parameters: {
          type: "object",
          properties: {
            prUrl: { type: "string", description: "The full GitHub PR URL" },
          },
          required: ["prUrl"],
        },
      },
      {
        name: "checkForRiskyFiles",
        description:
          "Checks whether a diff touches security-sensitive or infrastructure files.",
        parameters: {
          type: "object",
          properties: {
            diffText: {
              type: "string",
              description: "The full diff text to check",
            },
          },
          required: ["diffText"],
        },
      },
      {
        name: "checkNamingConventions",
        description:
          "Checks whether newly added variable and function names in the diff follow camelCase naming convention.",
        parameters: {
          type: "object",
          properties: {
            diffText: {
              type: "string",
              description: "The full diff text to check",
            },
          },
          required: ["diffText"],
        },
      },
      {
        name: "estimateTestCoverageGap",
        description:
          "Estimates the test coverage gap based on the files changed in the diff.",
        parameters: {
          type: "object",
          properties: {
            diffText: {
              type: "string",
              description: "The full diff text to check",
            },
          },
          required: ["diffText"],
        },
      },
    ],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMessageWithRetry(chat, message, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await chat.sendMessage({ message })
    } catch (err) {
      const isRetryable = err.status === 503 || err.cause?.code === 'UND_ERR_HEADERS_TIMEOUT'

      if (isRetryable && attempt < maxRetries) {
        console.log(`Transient error (${err.status || err.cause?.code}), waiting 15s before retry ${attempt}...`)
        await sleep(15000)
      } else {
        throw err
      }
    }
  }
}

const MAX_TOOL_CALLS = 6;

export async function reviewPR(prUrl) {
  const toolCallLog = [];
  const chat = ai.chats.create({
    model: "gemini-3.6-flash",
    config: { tools },
  });

  let result = await sendMessageWithRetry(
    chat,
    `Please review this PR: ${prUrl}

Only base your review on information returned by the tools — do not rely on any prior knowledge you may have about this specific PR or repository.

When you give your final review, structure your findings by severity:
- **Critical**: Must be fixed before merge (security issues, breaking changes, risky files touched)
- **Important**: Should be addressed, but not blocking
- **Minor**: Nice-to-know, doesn't block merge

If a category has nothing to report, state that explicitly rather than omitting it.`,
  );
  let callCount = 0;

  while (callCount < MAX_TOOL_CALLS) {
    const parts = result.candidates[0].content.parts;
    const functionCallPart = parts.find((p) => p.functionCall);

    if (!functionCallPart) break;

    const { name, args } = functionCallPart.functionCall;
    let output;

    if (name === "getDiff") {
      output = await getDiff(args.prUrl);
    } else if (name === "checkForRiskyFiles") {
      output = checkForRiskyFiles(args.diffText);
    } else if (name === "checkNamingConventions") {
      output = checkNamingConventions(args.diffText);
    } else if (name === "estimateTestCoverageGap") {
      output = estimateTestCoverageGap(args.diffText);
    }

    toolCallLog.push({ tool: name, args, result: output });

    const { error: logError } = await supabase.from("pr_review_logs").insert({
      pr_url: prUrl,
      tool_name: name,
      args: args,
      result: output,
    });

    if (logError) {
      console.error("Failed to log tool call:", logError);
    }

    result = await sendMessageWithRetry(chat, {
      functionResponse: { name, response: { result: output } },
    });
    callCount++;
  }

  const finalParts = result.candidates[0].content.parts;
  const finalText = finalParts
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n");

  return { review: finalText, toolCallLog };
}
