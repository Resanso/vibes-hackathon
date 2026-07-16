import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";

const channelSchema = z.enum(["whatsapp", "telegram"]);

export const profileRouter = createTRPCRouter({
  upsert: apiKeyProcedure
    .input(
      z.object({
        phone: z.string().min(1),
        monthlyIncome: z.number().int().nonnegative(),
        existingMonthlyDebt: z.number().int().nonnegative().default(0),
        dependents: z.number().int().nonnegative().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.profile.upsert({
        where: { phone: input.phone },
        create: input,
        update: {
          monthlyIncome: input.monthlyIncome,
          existingMonthlyDebt: input.existingMonthlyDebt,
          dependents: input.dependents,
        },
      });
    }),

  get: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.profile.findUnique({ where: { phone: input.phone } });
    }),

  // Reverse lookup for telegram-service: unlike WhatsApp (where the JID
  // itself IS the phone number), a Telegram chatId carries no phone
  // information on its own — every incoming command has to resolve
  // chatId -> phone via this first, using the binding linkTelegram created.
  getByTelegramChatId: apiKeyProcedure
    .input(z.object({ telegramChatId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.profile.findUnique({ where: { telegramChatId: input.telegramChatId } });
    }),

  // Binds a Telegram chat to this phone's profile — called by
  // telegram-service after the student shares their contact via the /start
  // flow (see telegram-service/CLAUDE.md). Idempotent: re-sharing contact
  // just re-confirms the same chatId. Does NOT switch notificationChannel
  // by itself — linking and switching are separate actions, so a student
  // can link Telegram ahead of time without their reminders moving yet.
  linkTelegram: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1), telegramChatId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({ where: { phone: input.phone } });
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil belum ada untuk nomor ini — isi dulu data di aplikasi Nera.",
        });
      }

      return ctx.db.profile.update({
        where: { phone: input.phone },
        data: { telegramChatId: input.telegramChatId },
      });
    }),

  // Switches which service sends this student their reminders/quick-consult
  // replies. Switching to "telegram" requires telegramChatId to already be
  // set (via linkTelegram) — otherwise reminders would silently go nowhere.
  setChannel: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1), channel: channelSchema }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({ where: { phone: input.phone } });
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profil tidak ditemukan." });
      }

      if (input.channel === "telegram" && !profile.telegramChatId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Link akun Telegram dulu lewat bot Nera sebelum beralih ke Telegram.",
        });
      }

      return ctx.db.profile.update({
        where: { phone: input.phone },
        data: { notificationChannel: input.channel },
      });
    }),
});
