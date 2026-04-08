
'use server';

import { api } from '@/trpc/server';
import { auth } from '@/server/auth';
import { Header } from '@/components/layout/header';
import { SiteFooter } from '@/components/layout/site-footer';
import { PricingPageContent, type Product } from '@/components/pricing/pricing-page-content';

export default async function PricingPage() {
  const session = await auth();
  const user = session?.user;

  const [subscriptionData, creditsData, billingStatus] = await Promise.all([
    api.product.listForPricing({ type: 'SUBSCRIPTION', limit: 10 }),
    api.product.listForPricing({ type: 'CREDITS_PACKAGE', limit: 10 }),
    user ? api.account.getBillingStatus() : Promise.resolve(null),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="pt-20 md:pt-24 pb-16">
        <PricingPageContent 
          subscriptionProducts={(subscriptionData?.products ?? []) as Product[]}
          creditsPackages={(creditsData?.products ?? []) as Product[]}
          userTier={billingStatus?.tier ?? 'FREE'}
          isLoggedIn={!!user}
          newUserOffer={subscriptionData?.newUserOffer}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
