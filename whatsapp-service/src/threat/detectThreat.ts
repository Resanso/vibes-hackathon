import path from "node:path";
import { fileURLToPath } from "node:url";

import * as ort from "onnxruntime-node";

// TF-IDF + RandomForest classifier trained on synthetic pinjol
// threat/normal message data (see ../../../notebook/threat-synthetic.ipynb),
// model file at ../../../notebook/model/threat_detection.onnx,
// exported to ONNX. Input/output tensor names ("text_input" / "output_label")
// come directly from that notebook's own inference test — not guessed.
//
// This is a synthetic-data MVP model, not a production-hardened classifier —
// the notebook's own test cases show it can miss informally-worded threats.
// Treat a "Threat" label as "worth flagging for human review", not ground
// truth, and never let it be the sole basis for an irreversible action beyond
// archiving (which the student can always undo from WhatsApp).
const MODEL_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../models/threat_detection.onnx",
);

export type ThreatLabel = "Normal_Formal" | "Normal_Informal" | "Threat";

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH);
  return sessionPromise;
}

export interface ThreatDetectionResult {
  label: ThreatLabel;
  isThreat: boolean;
}

export async function detectThreat(text: string): Promise<ThreatDetectionResult> {
  const session = await getSession();
  const input = new ort.Tensor("string", [text], [1, 1]);
  const results = await session.run({ text_input: input });
  const output = results.output_label;
  if (!output) {
    throw new Error("threat_detection.onnx did not return an output_label tensor");
  }

  const label = output.data[0] as ThreatLabel;

  return { label, isThreat: label === "Threat" };
}
