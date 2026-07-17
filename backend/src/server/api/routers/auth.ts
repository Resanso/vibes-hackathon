import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { signSessionToken } from "~/server/auth/jwt";
import { hashPassword, verifyPassword } from "~/server/auth/password";
import { apiKeyProcedure, authedProcedure, createTRPCRouter } from "~/server/api/trpc";

// Canonicalizes to the same international-digits-only format WhatsApp JIDs
// and Telegram's contact.phone_number already use (e.g. "6281234567890",
// never "081234567890" or "+62812...") — without this, a student registering
// with a leading "0" would never match either messaging service's own phone
// format, and linking/quick-consult would silently fail on a phone that
// "looks the same" to a human but isn't byte-for-byte identical. Confirmed
// the hard way on 2026-07-17: a real profile registered with a leading 0
// couldn't link Telegram until manually migrated to this format.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export const authRouter = createTRPCRouter({
  // Creates the Profile row itself (not profile.upsert — that's for
  // FinancialSurvivalCheck filling in the financial fields afterward).
  // monthlyIncome/existingMonthlyDebt/dependents start at their schema
  // defaults (0); onboardingCompletedAt stays null until that step runs.
  register: apiKeyProcedure
    .input(
      z.object({
        name: z.string().trim().min(1),
        phone: z.string().trim().min(9),
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const phone = normalizePhone(input.phone);

      const [existingEmail, existingPhone] = await Promise.all([
        ctx.db.profile.findUnique({ where: { email: input.email } }),
        ctx.db.profile.findUnique({ where: { phone } }),
      ]);

      if (existingEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "Email sudah terdaftar." });
      }
      if (existingPhone) {
        throw new TRPCError({ code: "CONFLICT", message: "Nomor telepon sudah terdaftar." });
      }

      const passwordHash = await hashPassword(input.password);

      const profile = await ctx.db.profile.create({
        data: {
          phone,
          email: input.email,
          passwordHash,
          name: input.name,
        },
      });

      return { token: signSessionToken(profile.phone), profile };
    }),

  login: apiKeyProcedure
    .input(
      z.object({
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({
        where: { email: input.email },
        omit: { passwordHash: false },
      });

      const genericError = new TRPCError({
        code: "UNAUTHORIZED",
        message: "Email atau password salah.",
      });

      if (!profile) throw genericError;

      const passwordOk = await verifyPassword(input.password, profile.passwordHash);
      if (!passwordOk) throw genericError;

      const { passwordHash: _passwordHash, ...safeProfile } = profile;

      return { token: signSessionToken(profile.phone), profile: safeProfile };
    }),

  // Verifies a stored token is still genuinely valid (signed by us, not
  // expired) rather than trusting mobile-app's local storage blindly — this
  // is what the app calls on boot to decide Login vs skip-straight-in. See
  // trpc.ts's authedProcedure for why this is the only endpoint gated this
  // way so far.
  me: authedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.profile.findUnique({ where: { phone: ctx.phone } });
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Profil tidak ditemukan." });
    }
    return profile;
  }),
});
