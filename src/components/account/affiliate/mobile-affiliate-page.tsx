"use client";

import { MobileAffiliateLanding } from "./mobile-affiliate-landing";
import { MobileAffiliateDashboard, type AffiliateStatus } from "./mobile-affiliate-dashboard";

interface Props {
  status: AffiliateStatus;
}

export function MobileAffiliatePage({ status }: Props) {
  const isPartner = !!status.referralCode;

  if (isPartner) {
    return <MobileAffiliateDashboard status={status} />;
  }

  return <MobileAffiliateLanding />;
}
