import { z } from "zod";

import { createTRPCRouter, apiKeyProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { refreshScholarships } from "~/server/services/scholarshipScraper";

export const scholarshipsRouter = createTRPCRouter({
  // mobile-app's "Alternatif" tab — real ingested data, not seed/mock.
  list: apiKeyProcedure.input(z.object({ limit: z.number().int().positive().max(50).default(20) })).query(({ input }) => {
    return db.scholarship.findMany({
      orderBy: { publishedAt: "desc" },
      take: input.limit,
    });
  }),

  // Manual trigger, same pattern as reminders.triggerNow — no scraping cron
  // exists yet, so this is how the list actually gets populated/refreshed
  // for now (called from a debug button, see mobile-app's ProfileTab).
  refresh: apiKeyProcedure.mutation(() => {
    return refreshScholarships();
  }),
});
