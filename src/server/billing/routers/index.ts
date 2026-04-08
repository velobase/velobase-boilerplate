import { createTRPCRouter } from "@/server/api/trpc";
import { grantProcedure } from "./procedures/grant";
import { freezeProcedure } from "./procedures/freeze";
import { consumeProcedure } from "./procedures/consume";
import { unfreezeProcedure } from "./procedures/unfreeze";
import { getBalanceProcedure } from "./procedures/get-balance";
import { getRecordsProcedure } from "./procedures/get-records";
import { postConsumeProcedure } from "./procedures/post-consume";

export const billingRouter = createTRPCRouter({
  grant: grantProcedure,
  freeze: freezeProcedure,
  consume: consumeProcedure,
  unfreeze: unfreezeProcedure,
  getBalance: getBalanceProcedure,
  getRecords: getRecordsProcedure,
  // After-the-fact consumption without prior freeze
  postConsume: postConsumeProcedure,
});

