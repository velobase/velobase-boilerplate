import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-black font-sans transition-colors duration-500">
      <Header />
      
      <main className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none opacity-100 dark:opacity-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-50" />
        <div className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-100 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black" />
        
        <div className="relative z-10 container mx-auto px-4 pt-32 pb-16">
          <div className="max-w-md w-full mx-auto text-center space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Card setup is disabled
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Credit card payments are handled via Telegram Stars.
            </p>
            <Link href="/pricing" className="block">
              <Button size="lg" className="w-full h-11 text-sm font-medium">
                Go to Pricing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
