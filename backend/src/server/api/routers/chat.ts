import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { chatWithCoach } from "~/server/ai/coachChat";

import { db } from "~/server/db";

export const chatRouter = createTRPCRouter({
  history: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ input }) => {
      return await db.chatMessage.findMany({
        where: { phone: input.phone },
        orderBy: { createdAt: "asc" },
      });
    }),

  // Free-text AI Coach, replacing whatsapp-service/telegram-service's old
  // fixed /cek command — see coachChat.ts for the tool-calling + multi-turn
  // history logic.
  message: apiKeyProcedure
    .input(z.object({ phone: z.string().min(1), message: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const reply = await chatWithCoach(input.phone, input.message);
      return { reply };
    }),
});
