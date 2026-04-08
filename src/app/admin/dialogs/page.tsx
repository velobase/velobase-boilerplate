"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginModal } from "@/components/auth/login-modal";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { WelcomeBackDialog } from "@/components/auth/welcome-back-dialog";
import { InsufficientCreditsDialog } from "@/components/billing/insufficient-credits-dialog";
import { RedeemCodeDialog } from "@/components/account/redeem-code-dialog";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { DeleteAccountDialog } from "@/components/account/settings/delete-account-dialog";
import { SubscriptionModal } from "@/components/account/subscription-modal";
import { api } from "@/trpc/react";

import type { UserTier } from "@/components/billing/insufficient-credits/hooks/use-upgrade-strategy";

interface DialogCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function DialogCard({ title, description, children }: DialogCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type CreditsDialogMode = 
  | { type: "normal"; isTrial: false; userTier: UserTier }
  | { type: "trial"; isTrial: true; trialEndsAt: Date; userTier: UserTier }
  | { type: "ip-limit"; isTrial: false; userTier: UserTier };

export default function DialogsPage() {
  const { setLoginModalOpen } = useAuthStore();
  const { status } = useSession();
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);
  const [creditsDialogMode, setCreditsDialogMode] = useState<CreditsDialogMode>({ type: "normal", isTrial: false, userTier: "starter" });
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [welcomeBackOpen, setWelcomeBackOpen] = useState(false);

  const openCreditsDialog = (mode: CreditsDialogMode) => {
    setCreditsDialogMode(mode);
    setCreditsDialogOpen(true);
  };

  // 获取真实数据
  const { data: profile } = api.account.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const { data: billing } = api.account.getBillingStatus.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const { data: subscriptionData, isLoading: loadingSubs } = api.product.listForPricing.useQuery({
    type: "SUBSCRIPTION",
    limit: 10,
  });

  // 转换为 SubscriptionModal 需要的格式
  const subscriptionProducts = subscriptionData?.products.map((p) => ({
    id: p.id,
    name: p.name,
    displayPrice: p.displayPrice,
    price: p.price,
    interval: p.interval,
    description: { features: p.features ?? [] },
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dialog Components</h1>
        <p className="text-muted-foreground mt-1">
          测试和预览所有弹窗组件
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Login Modal */}
        <DialogCard
          title="LoginModal"
          description="登录弹窗 - 支持 Google 和 Email 登录"
        >
          <Button onClick={() => setLoginModalOpen(true, undefined, "header")} variant="outline" size="sm">
            打开登录弹窗
          </Button>
        </DialogCard>

        {/* Welcome Back Dialog */}
        <DialogCard
          title="WelcomeBackDialog"
          description="老用户欢迎弹窗 - 非首账号用户，送 100 积分"
        >
          <Button onClick={() => setWelcomeBackOpen(true)} variant="outline" size="sm">
            打开欢迎回来弹窗
          </Button>
        </DialogCard>

        {/* Insufficient Credits Dialog */}
        <DialogCard
          title="InsufficientCreditsDialog"
          description={`余额不足弹窗 - 当前余额: ${billing?.creditsBalance ?? 0}`}
        >
          <div className="flex flex-col gap-3">
            <div className="text-xs text-muted-foreground font-medium">场景模式</div>
          <div className="flex flex-wrap gap-2">
            <Button
                onClick={() => openCreditsDialog({ type: "normal", isTrial: false, userTier: "starter" })}
              variant="outline"
              size="sm"
            >
              普通用户
            </Button>
            <Button
              onClick={() => openCreditsDialog({ 
                type: "trial", 
                isTrial: true, 
                  trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                  userTier: "starter"
              })}
              variant="outline"
              size="sm"
            >
              试用用户
            </Button>
            <Button
                onClick={() => openCreditsDialog({ type: "ip-limit", isTrial: false, userTier: "free" })}
              variant="outline"
              size="sm"
            >
              IP 限制
            </Button>
            </div>
            
            <div className="text-xs text-muted-foreground font-medium mt-2">用户等级 (策略引擎)</div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => openCreditsDialog({ type: "normal", isTrial: false, userTier: "starter" })}
                variant="secondary"
                size="sm"
              >
                Starter → Plus
              </Button>
              <Button
                onClick={() => openCreditsDialog({ type: "normal", isTrial: false, userTier: "plus" })}
                variant="secondary"
                size="sm"
              >
                Plus → Premium
              </Button>
              <Button
                onClick={() => openCreditsDialog({ type: "normal", isTrial: false, userTier: "premium" })}
                variant="secondary"
                size="sm"
              >
                Premium → 积分包
              </Button>
            </div>
          </div>
        </DialogCard>

        {/* Redeem Code Dialog */}
        <DialogCard
          title="RedeemCodeDialog"
          description="兑换码弹窗 - 自带触发按钮"
        >
          <RedeemCodeDialog />
        </DialogCard>

        {/* Create Project Dialog */}
        <DialogCard
          title="CreateProjectDialog"
          description="创建项目弹窗"
        >
          <Button
            onClick={() => setCreateProjectOpen(true)}
            variant="outline"
            size="sm"
          >
            打开创建项目弹窗
          </Button>
        </DialogCard>

        {/* Delete Account Dialog */}
        <DialogCard
          title="DeleteAccountDialog"
          description={`删除账户确认弹窗 - ${profile?.email ?? "未登录"}`}
        >
          <Button
            onClick={() => setDeleteAccountOpen(true)}
            variant="destructive"
            size="sm"
          >
            打开删除账户弹窗
          </Button>
        </DialogCard>

        {/* Subscription Modal */}
        <DialogCard
          title="SubscriptionModal"
          description={`订阅升级弹窗 - ${subscriptionProducts.length} 个产品`}
        >
          {loadingSubs ? (
            <Skeleton className="h-9 w-24" />
          ) : subscriptionProducts.length > 0 ? (
            <SubscriptionModal products={subscriptionProducts}>
              <Button variant="outline" size="sm">
                打开订阅弹窗
              </Button>
            </SubscriptionModal>
          ) : (
            <p className="text-xs text-muted-foreground">无订阅产品</p>
          )}
        </DialogCard>
      </div>

      {/* Render dialogs */}
      <LoginModal />
      <WelcomeBackDialog
        open={welcomeBackOpen}
        onOpenChange={setWelcomeBackOpen}
        onTopUp={() => {
          setWelcomeBackOpen(false);
          setCreditsDialogOpen(true);
        }}
      />
      <InsufficientCreditsDialog
        isOpen={creditsDialogOpen}
        onOpenChange={setCreditsDialogOpen}
        requiredCredits={1200}
        currentBalance={creditsDialogMode.type === "ip-limit" ? 5000 : 100}
        variant={creditsDialogMode.type === "ip-limit" ? "ip-limit" : "credits"}
        isTrial={creditsDialogMode.isTrial}
        trialEndsAt={creditsDialogMode.type === "trial" ? creditsDialogMode.trialEndsAt : null}
        userTier={creditsDialogMode.userTier}
      />
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />
      <DeleteAccountDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        userEmail={profile?.email ?? null}
      />
    </div>
  );
}
