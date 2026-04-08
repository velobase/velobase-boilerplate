"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-amber-50/50 to-orange-50 dark:from-slate-950 dark:to-slate-950">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* 品牌区 */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 group mb-6">
              <Logo size="md" className="text-orange-500 group-hover:text-orange-600 transition-colors" />
            <span className="text-lg font-medium tracking-tight text-slate-900 dark:text-white">
              AI SaaS
            </span>
            </Link>
            <p className="text-[14px] font-normal text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              Chat. Simply.
            </p>
          </div>

          {/* 产品链接 */}
          <div>
          <h3 className="text-[14px] font-medium text-slate-900 dark:text-white mb-4">
            Product
          </h3>
            <ul className="space-y-3">
              <li>
              <Link href="/marketplace" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Marketplace
              </Link>
              </li>
              <li>
              <Link href="/account/billing" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                Billing
              </Link>
              </li>
              <li>
              <Link href="/mcp" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                MCP Protocol
              </Link>
              </li>
            </ul>
          </div>

          {/* 资源链接 */}
          <div>
          <h3 className="text-[14px] font-medium text-slate-900 dark:text-white mb-4">
            Resources
          </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/docs" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <a 
                  href="https://discord.gg/vfjrh3JTqc" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  Community
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
              <li>
                <Link href="/blog" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部版权区 */}
        <div className="mt-16 pt-8 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[14px] font-normal text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} AI SaaS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Terms
            </Link>
            <a href="mailto:support@example.com" className="text-[14px] font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              support@example.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

