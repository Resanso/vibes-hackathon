import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { assessRiskForPhone } from "~/server/services/assessRisk";

const assessInput = z.object({
  phone: z.string().min(1),
  principal: z.number().int().positive(),
  interestRatePct: z.number().nonnegative(),
  serviceFee: z.number().int().nonnegative(),
  tenorMonths: z.number().int().positive(),
});

export const riskRouter = createTRPCRouter({
  assess: apiKeyProcedure.input(assessInput).mutation(({ input }) => assessRiskForPhone(input)),
});
