'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, FileText, Loader2, AlertTriangle, CheckCircle, XCircle, Calendar, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Suspense } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileShell } from '@/components/layout/mobile-shell';
import { Header } from '@/components/layout/header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Background } from '@/components/layout/background';

function AirwallexPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // Query portal data
  const { data, isLoading, error } = api.membership.getAirwallexPortalData.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  // Mutations
  const setCancelMutation = api.membership.airwallexSetCancelAtPeriodEnd.useMutation({
    onSuccess: () => {
      toast.success('Subscription updated');
      void utils.membership.getAirwallexPortalData.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update subscription');
    },
  });

  const cancelNowMutation = api.membership.airwallexCancelNow.useMutation({
    onSuccess: () => {
      toast.success('Subscription cancelled');
      router.push('/account/billing');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel subscription');
    },
  });

  const createSetupMutation = api.membership.airwallexCreateSetupCheckout.useMutation({
    onSuccess: (result) => {
      window.location.href = result.checkoutUrl;
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create checkout');
    },
  });

  // Handle setup return
  const setupStatus = searchParams.get('setup');
  const updated = searchParams.get('updated');
  const cancelled = searchParams.get('cancelled');

  // Show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <Card className="border-border/40 bg-card/40 backdrop-blur-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>Failed to load subscription data: {error.message}</p>
          </div>
          <Button asChild className="mt-4">
            <Link href="/account/billing">Back to Billing</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No subscription
  if (!data?.hasSubscription) {
    return (
      <Card className="border-border/40 bg-card/40 backdrop-blur-md">
        <CardContent className="p-6 md:p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
          <p className="text-muted-foreground text-sm mb-6">
            You don&apos;t have an active subscription to manage.
          </p>
          <Button asChild>
            <Link href="/account/billing">Go to Billing</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { subscription, invoices } = data;

  const handleToggleCancel = () => {
    setCancelMutation.mutate({ cancel: !subscription.cancelAtPeriodEnd });
  };

  const handleCancelNow = () => {
    if (confirm('Are you sure you want to cancel your subscription immediately? This cannot be undone.')) {
      cancelNowMutation.mutate();
    }
  };

  const handleUpdatePaymentMethod = () => {
    const returnUrl = `${window.location.origin}/account/manage-subscription/airwallex/setup/return`;
    createSetupMutation.mutate({ returnUrl });
  };

  const statusConfig = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return { variant: 'default' as const, label: 'Active', className: 'bg-green-500/10 text-green-600 border-green-500/20' };
      case 'PAST_DUE':
      case 'UNPAID':
        return { variant: 'destructive' as const, label: s === 'PAST_DUE' ? 'Past Due' : 'Unpaid', className: '' };
      case 'TRIALING':
      case 'IN_TRIAL':
        return { variant: 'secondary' as const, label: 'Trial', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
      case 'CANCELLED':
        return { variant: 'outline' as const, label: 'Cancelled', className: '' };
      default:
        return { variant: 'outline' as const, label: status, className: '' };
    }
  };

  const statusInfo = statusConfig(subscription.status);

  return (
    <div className="space-y-6">
      {/* Status messages */}
      {setupStatus === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 dark:text-green-400">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Payment method updated successfully!</p>
        </div>
      )}
      {setupStatus && setupStatus !== 'success' && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 dark:text-red-400">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Failed to update payment method. Please try again.</p>
        </div>
      )}
      {updated === '1' && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 dark:text-green-400">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Subscription updated successfully!</p>
        </div>
      )}
      {cancelled === '1' && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Your subscription has been cancelled.</p>
        </div>
      )}

      {/* Subscription Overview Card */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">{subscription.planName}</CardTitle>
              {subscription.planType && (
                <CardDescription>{subscription.planType} Plan</CardDescription>
              )}
            </div>
            <Badge variant={statusInfo.variant} className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Period info */}
          {subscription.currentPeriodEndsAt && (
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground">Current period ends</p>
                <p className="font-medium">
                  {new Date(subscription.currentPeriodEndsAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Cancel at period end warning */}
          {subscription.cancelAtPeriodEnd && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Cancellation Scheduled</p>
                <p className="text-sm opacity-90">
                  Your subscription will cancel at the end of the current billing period. You can resume anytime before then.
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Actions - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={handleUpdatePaymentMethod}
              disabled={createSetupMutation.isPending}
              className="h-11"
            >
              {createSetupMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Update Payment
            </Button>

            {subscription.cancelAtPeriodEnd ? (
              <Button
                variant="outline"
                onClick={handleToggleCancel}
                disabled={setCancelMutation.isPending}
                className="h-11 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-600"
              >
                {setCancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Resume Subscription
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleToggleCancel}
                disabled={setCancelMutation.isPending}
                className="h-11"
              >
                {setCancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancel at Period End
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleCancelNow}
              disabled={cancelNowMutation.isPending}
              className="h-11 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600 sm:col-span-2 lg:col-span-1"
            >
              {cancelNowMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Immediately
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Card */}
      {invoices.length > 0 && (
        <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>Your recent invoices and payment history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  {/* Invoice info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted/50 shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.createdAt
                          ? new Date(invoice.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Date unavailable'}
                      </p>
                    </div>
                  </div>

                  {/* Amount and actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {invoice.currency?.toUpperCase()} {invoice.totalAmount?.toFixed(2)}
                        </p>
                      </div>
                      <Badge
                        variant={invoice.paymentStatus === 'PAID' ? 'default' : 'destructive'}
                        className={invoice.paymentStatus === 'PAID' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
                      >
                        {invoice.paymentStatus === 'PAID' ? 'Paid' : invoice.paymentStatus}
                      </Badge>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0">
                      {invoice.hostedUrl && invoice.paymentStatus !== 'PAID' && (
                        <Button size="sm" className="h-8" asChild>
                          <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">
                            Pay Now
                          </a>
                        </Button>
                      )}
                      {invoice.pdfUrl && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" title="Download PDF">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back link */}
      <div className="pt-2">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link href="/account/billing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PortalPageContent() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="space-y-1 md:space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Manage Subscription</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View and manage your subscription, update payment method, or cancel.
        </p>
      </div>

      {/* Content */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[300px] md:min-h-[400px]">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AirwallexPortalContent />
      </Suspense>
    </div>
  );
}

export default function AirwallexPortalPage() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch - show placeholder until mounted
  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  // Mobile layout with MobileShell (includes bottom nav)
  if (isMobile) {
    return (
      <MobileShell>
        <div className="px-4 py-6 pb-24">
          <PortalPageContent />
        </div>
      </MobileShell>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative font-sans selection:bg-primary/30">
      <Background />
      <Header />

      <main className="relative z-10 flex flex-col items-center w-full px-4 pt-28 pb-20">
        <PortalPageContent />
      </main>

      <SiteFooter />
    </div>
  );
}
