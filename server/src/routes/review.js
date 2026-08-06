import { Router } from "express";
import { reviewPR } from "../lib/agent.js";

const router = Router();

router.post("/", async (req, res) => {
  const { prUrl } = req.body;

  if (!prUrl) {
    return res.status(400).json({ error: "PR URL is required" });
  }

  const result = await reviewPR(prUrl);

  const riskyCheck = result.toolCallLog.find(
    (t) => t.tool === "checkForRiskyFiles",
  );

  let riskScore = "low";
  if (riskyCheck?.result?.risky) {
    riskScore = "high — requires senior review";
  }

  res.json({
    riskScore,
    summary: result.review,
    toolCalls: result.toolCallLog.map((t) => {
      const shortArgs = Object.fromEntries(
        Object.entries(t.args).map(([key, value]) => {
          if (typeof value === "string" && value.length > 80) {
            return [key, value.slice(0, 80) + "... (truncated)"];
          }
          return [key, value];
        }),
      );
      return `${t.tool}(${JSON.stringify(shortArgs)})`;
    }),
  });
});

export default router;
