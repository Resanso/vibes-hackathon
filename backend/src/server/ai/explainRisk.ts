import OpenAI from "openai";

import { env } from "~/env";
import type { RiskScoreResult } from "~/server/logic/riskScore";

const maia =
  env.MAIA_API_KEY && env.MAIA_BASE_URL
    ? new OpenAI({ apiKey: env.MAIA_API_KEY, baseURL: env.MAIA_BASE_URL })
    : null;

function fallbackExplanation(risk: RiskScoreResult): string {
  return [`Status risiko: ${risk.label} (skor ${risk.score}/100).`, ...risk.reasons].join(
    " ",
  );
}

// One MAIA Router call that turns a deterministic score + reasons into a
// short plain-language paragraph. Never throws — narration failing must not
// block the risk assessment itself, so any error falls back to a canned
// explanation built straight from `reasons`.
export async function explainRisk(risk: RiskScoreResult): Promise<string> {
  if (!maia) {
    return fallbackExplanation(risk);
  }

  try {
    const completion = await maia.chat.completions.create({
      // check MAIA Router's docs for the exact model string before hardcoding one
      model: "gpt-4o-mini",
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
    console.error("[explainRisk] MAIA call failed, using fallback", error);
    return fallbackExplanation(risk);
  }
}
