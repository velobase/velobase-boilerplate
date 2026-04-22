import type { FrameworkModule } from "@/server/modules/registry";
import type { AppEventBus } from "@/server/events/bus";
import { createLogger } from "@/lib/logger";

const log = createLogger("module:google-ads");

export const googleAdsModule: FrameworkModule = {
  name: "google-ads",
  enabled: true,

  registerEventHandlers(bus: AppEventBus) {
    bus.on("payment:succeeded", async ({ paymentId }) => {
      try {
        const { enqueueGoogleAdsUploadsForPayment } = await import("@/server/ads/google-ads/queue");
        await enqueueGoogleAdsUploadsForPayment(paymentId);
      } catch (error) {
        log.warn({ error, paymentId }, "Google Ads upload enqueue failed");
      }
    });
  },
};
