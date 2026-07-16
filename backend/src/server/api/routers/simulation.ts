import { z } from "zod";

import { apiKeyProcedure, createTRPCRouter } from "~/server/api/trpc";
import { simulateLoan } from "~/server/logic/simulateLoan";

const simulationInput = z.object({
  principal: z.number().int().positive(),
  interestRatePct: z.number().nonnegative(),
  serviceFee: z.number().int().nonnegative(),
  tenorMonths: z.number().int().positive(),
});

export const simulationRouter = createTRPCRouter({
  calculate: apiKeyProcedure.input(simulationInput).query(({ input }) => {
    return simulateLoan(input);
  }),
});
