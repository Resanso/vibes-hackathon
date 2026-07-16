import { dashboardRouter } from "~/server/api/routers/dashboard";
import { profileRouter } from "~/server/api/routers/profile";
import { recommendationsRouter } from "~/server/api/routers/recommendations";
import { remindersRouter } from "~/server/api/routers/reminders";
import { riskRouter } from "~/server/api/routers/risk";
import { simulationRouter } from "~/server/api/routers/simulation";
import { trackingRouter } from "~/server/api/routers/tracking";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  profile: profileRouter,
  simulation: simulationRouter,
  risk: riskRouter,
  recommendations: recommendationsRouter,
  dashboard: dashboardRouter,
  reminders: remindersRouter,
  tracking: trackingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.profile.get({ phone: "0812..." });
 */
export const createCaller = createCallerFactory(appRouter);
