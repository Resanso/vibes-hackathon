import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { signSessionToken } from "~/server/auth/jwt";
import { hashPassword, verifyPassword } from "~/server/auth/password";
import { apiKeyProcedure, authedProcedure, createTRPCRouter } from "~/server/api/trpc";

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
      const [existingEmail, existingPhone] = await Promise.all([
        ctx.db.profile.findUnique({ where: { email: input.email } }),
        ctx.db.profile.findUnique({ where: { phone: input.phone } }),
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
          phone: input.phone,
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
