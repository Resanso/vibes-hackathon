import OpenAI from "openai";

import { env } from "~/env";
import type { RiskScoreResult } from "~/server/logic/riskScore";

const ai =
  env.AI_API_KEY && env.AI_BASE_URL
    ? new OpenAI({ apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL })
    : null;

function fallbackExplanation(risk: RiskScoreResult): string {
  return [`Status risiko: ${risk.label} (skor ${risk.score}/100).`, ...risk.reasons].join(
    " ",
  );
}

// One LLM call that turns a deterministic score + reasons into a short
// plain-language paragraph. Never throws — narration failing must not
// block the risk assessment itself, so any error falls back to a canned
// explanation built straight from `reasons`.
export async function explainRisk(risk: RiskScoreResult): Promise<string> {
  if (!ai) {
    return fallbackExplanation(risk);
  }

  try {
    const completion = await ai.chat.completions.create({
      // DeepSeek Flash, called directly (api.deepseek.com) — switched from
      // MAIA Router 2026-07-17 after MAIA's IP proved unreachable from this
      // VPS specifically ("no route to host"); DeepSeek's own API works
      // fine from the same VPS. Model id confirmed via DeepSeek's own
      // /models endpoint, not guessed.
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten keuangan yang menjelaskan skor risiko pinjaman ke mahasiswa Indonesia dalam 2-3 kalimat, bahasa sederhana, tanpa jargon.",
        },
        {
          role: "user",
          content: `Skor risiko: ${risk.score}/100 (${risk.label}). Alasan: ${risk.reasons.join(" ")}`,
        },
      ],
    });

    const explanation = completion.choices[0]?.message?.content?.trim();
    return explanation && explanation.length > 0
      ? explanation
      : fallbackExplanation(risk);
  } catch (error) {
    console.error("[explainRisk] AI call failed, using fallback", error);
    return fallbackExplanation(risk);
  }
}
