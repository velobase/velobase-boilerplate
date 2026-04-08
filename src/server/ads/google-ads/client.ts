import { GoogleAdsApi } from "google-ads-api";
import { env } from "@/env";

function hasGoogleAdsCreds() {
  return (
    !!env.GOOGLE_ADS_CLIENT_ID &&
    !!env.GOOGLE_ADS_CLIENT_SECRET &&
    !!env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    !!env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

/**
 * 每次调用都创建新的 GoogleAdsApi + Customer 实例。
 *
 * 不缓存是因为 google-ads-api 内部有一个 TTLCache（10 分钟过期），
 * 过期时会调用 service.close() 关闭底层 gRPC channel，
 * 导致后续复用同一实例时报 "The client has already been closed."。
 * 每次新建可以彻底规避此问题，成本可忽略（每 5 分钟一次）。
 */
export function getGoogleAdsCustomer() {
  if (!hasGoogleAdsCreds()) return null;
  if (!env.GOOGLE_ADS_CUSTOMER_ID) return null;

  const api = new GoogleAdsApi({
    client_id: env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });

  return api.Customer({
    customer_id: env.GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: env.GOOGLE_ADS_MCC_ID || undefined,
  });
}


