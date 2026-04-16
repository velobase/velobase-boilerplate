import { agentRouter } from "@/server/api/routers/agent";
import { userAgentRouter } from "@/server/api/routers/user-agent";
import { conversationRouter } from "@/server/api/routers/conversation";
import { projectRouter } from "@/server/api/routers/project";
import { repositoryRouter } from "@/server/api/routers/repository";
import { githubRouter } from "@/server/api/routers/github";
import { storageRouter } from "@/server/api/routers/storage";
import { productRouter } from "@/server/product/routers";
import { billingRouter } from "@/server/billing/routers";
import { orderRouter } from "@/server/order/routers";
import { membershipRouter } from "@/server/membership/routers";
import { promoRouter } from "@/server/promo/routers";
import { adminRouter } from "@/server/admin/routers";
import { accountRouter } from "@/server/api/routers/account";
import { affiliateRouter } from "@/server/api/routers/affiliate";
import { notificationRouter } from "@/server/api/routers/notification";
import { telegramRouter } from "@/server/telegram/router";
import { exampleRouter } from "@/modules/example/server/router";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  // AI Chat APIs
  agent: agentRouter,
  userAgent: userAgentRouter,
  conversation: conversationRouter,
  project: projectRouter,
  repository: repositoryRouter,
  github: githubRouter,
  // Storage
  storage: storageRouter,
  // Pricing & Billing
  product: productRouter,
  billing: billingRouter,
  order: orderRouter,
  membership: membershipRouter,
  promo: promoRouter,
  affiliate: affiliateRouter,
  notification: notificationRouter,
  // User Management & Profile
  account: accountRouter,
  // Telegram Stars Payment
  telegram: telegramRouter,
  // Example module (demo/reference)
  example: exampleRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
