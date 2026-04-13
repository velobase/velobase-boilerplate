/**
 * Google Ads 转化配置
 *
 * 替换为你自己的 Google Ads 账户信息。
 * 获取方式：Google Ads → Tools → Conversions → 复制 Conversion ID 和 Label。
 */
export const GOOGLE_ADS_CONFIG = {
  default: {
    domain: "example.com",
    measurementId: "AW-XXXXXXXXXX",
    conversionLabel: "XXXXXXXXXXXXXXXXXXXX",
  },
};

export function getGoogleAdsConfig(_hostname?: string) {
  return GOOGLE_ADS_CONFIG.default;
}
