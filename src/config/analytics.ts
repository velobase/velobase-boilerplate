// Google Ads configuration — replace with your own values
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
