import type { VercelRequest, VercelResponse } from "@vercel/node";
import jsonLogic from "json-logic-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Define expected input shape
const RiskPayloadSchema = z.object({
  credit_score: z.number(),
});

type RiskPayload = z.infer<typeof RiskPayloadSchema>;

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!req.headers["content-type"]?.includes("application/json")) {
    return res.status(415).json({ error: "Unsupported Media Type" });
  }

  try {
    const parsed: RiskPayload = RiskPayloadSchema.parse(req.body ?? {});
    const { credit_score } = parsed;

    // Load the rule (adjust path for prod if needed)
    const rulePath = join(process.cwd(), "rules/risk-basic.json");
    const rule = JSON.parse(readFileSync(rulePath, "utf-8"));

    const result = jsonLogic.apply(rule, { credit_score });

    return res.status(200).json({ result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("Validation error:", err);
      return res
        .status(400)
        .json({ error: "Invalid payload", details: err.issues });
    }

    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
