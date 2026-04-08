import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full py-8 px-4 border-t border-border bg-background text-muted-foreground text-xs md:text-sm mt-auto z-10 relative">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <p>© {new Date().getFullYear()} Your Company. All rights reserved.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/refund-policy" className="hover:text-foreground transition-colors">
            Refund Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
