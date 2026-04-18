"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { track } from "@/analytics";
import { BILLING_EVENTS } from "@/analytics/events/billing";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscriptionProducts, useCreditsPackages, useCreditsPackVariant } from "@/hooks/use-pricing-products";
import { useSmartCheckout } from "@/hooks/use-smart-checkout";

import { CreditsDialogContent } from "./credits-dialog-content";
import type { UserTier } from "./insufficient-credits/hooks/use-upgrade-strategy";

interface InsufficientCreditsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requiredCredits: number;
  currentBalance?: number;
  variant?: "credits" | "ip-limit";
  limitMessage?: string;
  // Trial subscription metadata (optional)
  isTrial?: boolean;
  trialEndsAt?: Date | string | null;
  // User tier for upgrade strategy (optional, defaults to 'starter')
  userTier?: UserTier;
}

export function InsufficientCreditsDialog({
  isOpen,
  onOpenChange,
  requiredCredits,
  currentBalance = 0,
  variant = "credits",
  limitMessage,
  isTrial,
  trialEndsAt,
  userTier = "starter",
}: InsufficientCreditsDialogProps) {
  const t = useTranslations("billing");
  const isMobile = useIsMobile();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("year");
  
  const { startCheckout } = useSmartCheckout();
  const prevOpenRef = useRef(false);

  // 使用统一的定价 hook（自动处理 AB 测试变体过滤）
  const { products: creditsPackagesRaw, isLoading: loadingCredits, priceVariant } = useCreditsPackages({ 
    enabled: isOpen, 
    limit: 4  // 加载更多以便 AB 测试可以选择
  });
  const { products: allSubscriptions, isLoading: loadingSubs } = useSubscriptionProducts({ 
    enabled: isOpen 
  });
  
  // Credits Pack AB Test: control=$4.99, test=$9.99
  const creditsPackVariant = useCreditsPackVariant();

  // 埋点：充值弹窗打开（带 AB 测试变体）
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const dialogSource = variant === "ip-limit" ? "ip_limit" : "insufficient_credits";
      track(BILLING_EVENTS.CREDITS_DIALOG_OPEN, { 
        source: dialogSource,
        price_variant: priceVariant,
        credits_pack_variant: creditsPackVariant,
      });
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, variant, priceVariant, creditsPackVariant]);

  const handlePurchase: (
    productId: string,
    credits: number,
    price: number,
    kind?: 'credits' | 'subscription'
  ) => Promise<void> = async (productId, credits, price, kind = 'credits') => {
    // 统一的 checkout_start 事件，通过 product_type 区分积分包 vs 订阅
    track(BILLING_EVENTS.CREDITS_CHECKOUT_START, {
      package_id: productId,
      credits,
      price,
      product_type: kind,
      price_variant: priceVariant,
      credits_pack_variant: creditsPackVariant,
    });

    setIsProcessing(productId);
    try {
      const returnPath = typeof window !== "undefined" ? window.location.pathname : "/";
      const result = await startCheckout({
        productId,
        successUrl: `${window.location.origin}/payment/success?next=${encodeURIComponent(returnPath)}`,
        cancelUrl: `${window.location.origin}${returnPath}`,
      });

      if (result.status === "ERROR") {
        toast.error(result.message || t("purchaseFailed"));
        setIsProcessing(null);
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error(t("purchaseFailed"));
      setIsProcessing(null);
    }
  };

  // Skip Queue 专用积分包（metadata.useCase === 'skip_queue'）只在 Skip Queue 抽屉使用，
  // 在通用「积分不足」弹窗中需要过滤掉，避免到处露出。
  const creditsPackages = creditsPackagesRaw.filter((p) => {
    const meta = p.metadata as { useCase?: string } | null | undefined;
    return meta?.useCase !== "skip_queue";
  });

  const missingCredits = Math.max(0, requiredCredits - currentBalance);
  const isLoading = loadingCredits || loadingSubs;

  // Data Logic（订阅产品已在 hook 里按变体过滤）
  const subscriptions = allSubscriptions.filter((p) => p.price > 0);

  // Credits Pack 推荐逻辑：
  // credits-pack AB test control: 推荐 $4.99 Mini Pack (prod-credits-atomic-001, 2,000 credits)
  // credits-pack AB test test: 推荐 $9.99 Starter Pack (prod-credits-starter-001, 5,000 credits)
  const targetCredits = creditsPackVariant === "test" ? 5000 : 2000;
  const recommendedCredits =
    creditsPackages.find((p) => (p.creditsAmount ?? 0) === targetCredits) ??
    creditsPackages.find((p) => (p.creditsAmount ?? 0) >= missingCredits) ??
    creditsPackages[0] ?? null;

  const monthlySub = subscriptions.find(p => p.name.toLowerCase().includes("pro") && p.interval === "month") || subscriptions.find(p => p.interval === "month");
  const yearlySub = subscriptions.find(p => p.name.toLowerCase().includes("pro") && p.interval === "year") || subscriptions.find(p => p.interval === "year");
  const selectedSub = interval === "year" ? yearlySub : monthlySub;

  const monthlyPrice = monthlySub ? monthlySub.price / 100 : 0;
  const yearlyPrice = yearlySub ? yearlySub.price / 100 : 0;
  
  const yearlySavings = monthlyPrice > 0 
    ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100) 
    : 0;

  const displayPriceValue = interval === "year" ? yearlyPrice / 12 : monthlyPrice;
  const displayPriceString = Number.isInteger(displayPriceValue) 
    ? `$${displayPriceValue}` 
    : `$${displayPriceValue.toFixed(2)}`;

  // 用推荐包计算性价比对比
  const packForComparison = recommendedCredits;
  let pricePerCreditRatio = 0;
  if (selectedSub?.creditsPerMonth && packForComparison?.creditsAmount) {
    const creditsPricePerUnit = (packForComparison.price / 100) / packForComparison.creditsAmount;
    const subMonthlyCost = interval === "year" ? yearlyPrice / 12 : monthlyPrice;
    const subPricePerUnit = subMonthlyCost / selectedSub.creditsPerMonth;
    
    if (subPricePerUnit > 0) {
      pricePerCreditRatio = Math.round(creditsPricePerUnit / subPricePerUnit);
    }
  }

  const contentProps = {
    isLoading,
    requiredCredits,
    recommendedCredits,
    selectedSub: selectedSub ?? null,
    interval,
    setInterval,
    handlePurchase,
    isProcessing,
    displayPriceString,
    yearlyPrice,
    yearlySavings,
    pricePerCreditRatio,
    isMobile: !!isMobile,
    variant,
    limitMessage,
    isTrial,
    trialEndsAt,
    currentBalance,
    userTier,
    // Pass full arrays for strategy engine
    availableSubscriptions: subscriptions,
    availableCreditsPacks: creditsPackages,
  } as const;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-background p-0 gap-0 max-h-[90vh]">
          <VisuallyHidden>
            <DrawerTitle>{t("getMoreCredits")}</DrawerTitle>
            <DrawerDescription>{t("purchaseCreditsDesc")}</DrawerDescription>
          </VisuallyHidden>
          <div className="overflow-y-auto flex-1">
            <CreditsDialogContent {...contentProps} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>{t("getMoreCredits")}</DialogTitle>
          <DialogDescription>{t("purchaseCreditsDesc")}</DialogDescription>
        </VisuallyHidden>
        <CreditsDialogContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
}
