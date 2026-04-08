import Link from "next/link";
import { ArrowLeft, Newspaper, Rocket } from "lucide-react";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-orange-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          {/* 返回首页 */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* 图标 */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 mb-8 shadow-lg shadow-orange-500/25">
            <Newspaper className="h-10 w-10 text-white" />
          </div>

          {/* 标题 */}
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Blog
          </h1>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 mb-6">
            <Rocket className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Coming Soon
            </span>
          </div>

          {/* 描述 */}
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 leading-relaxed">
            Our blog is coming soon! Stay tuned for product updates, AI insights, 
            tutorials, and stories from the AI SaaS community.
          </p>

          {/* 功能列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Product Updates
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Latest features, releases, and announcements
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                AI Insights
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Deep dives into AI trends and technologies
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Tutorials & Guides
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Step-by-step guides and best practices
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Community Stories
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Success stories and use cases from our users
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white font-medium hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/25"
            >
              Explore Marketplace
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Try AI SaaS Now
            </Link>
          </div>

          {/* 社交媒体 */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Follow us for updates
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://discord.gg/vfjrh3JTqc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-colors"
              >
                Discord
              </a>
              <a
                href="mailto:support@example.com"
                className="text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-colors"
              >
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

