import jwt from "jsonwebtoken";

import { env } from "~/env";

const EXPIRES_IN = "30d";

export interface SessionTokenPayload {
  phone: string;
}

// Issued once at login/register — mobile-app stores this and sends it back
// as `Authorization: Bearer <token>` to auth.me to confirm a stored session
// is still genuinely valid (not just "present in local storage"), which is
// what mobile-app's boot logic uses to decide whether to skip straight to
// the dashboard or show Login.
export function signSessionToken(phone: string): string {
  return jwt.sign({ phone } satisfies SessionTokenPayload, env.JWT_SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "object" && decoded !== null && "phone" in decoded) {
      return { phone: String((decoded as { phone: unknown }).phone) };
    }
    return null;
  } catch {
    return null;
  }
}
