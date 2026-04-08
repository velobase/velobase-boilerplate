"use server";

import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";

export default async function AdsLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white selection:bg-orange-500/20">
      <Header />

      <main className="pt-24 md:pt-28 pb-20">
        {/* Hero */}
        <section className="container mx-auto px-4 grid gap-12 lg:grid-cols-[1.1fr,0.9fr] items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs md:text-sm text-white/80">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              Built for performance marketers, agencies & serious creators
            </div>

            <div className="space-y-4">
              <h1 className="font-poppins text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight">
                Turn{" "}
                <span className="bg-gradient-to-r from-orange-400 via-red-400 to-purple-500 bg-clip-text text-transparent">
                  one image
                </span>{" "}
                into{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  10 ad‑ready videos
                </span>
              </h1>
              <p className="max-w-xl text-sm md:text-base text-white/70">
                Upload your product or UGC image and let AI generate
                scroll‑stopping short‑form ads for TikTok, Reels and Shorts in a
                few minutes — with commercial usage rights and HD quality by
                default.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black shadow-lg shadow-orange-500/30 transition hover:bg-slate-100"
              >
                Start generating ads
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                View plans for teams
              </Link>
            </div>

            <div className="grid gap-4 text-xs md:text-sm text-white/60 sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                <div>
                  <div className="font-medium text-white">
                    Built for paid social
                  </div>
                  <div>Optimized for TikTok, Reels & Shorts formats.</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-sky-400" />
                <div>
                  <div className="font-medium text-white">
                    Minutes, not days
                  </div>
                  <div>Ship new creative batches before tomorrow&apos;s spend.</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BarChart3 className="mt-0.5 h-4 w-4 text-orange-400" />
                <div>
                  <div className="font-medium text-white">Designed for ROAS</div>
                  <div>Test more ideas, kill losers, scale winners faster.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side visual */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -translate-y-10 blur-3xl">
              <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.15),_transparent_55%)]" />
            </div>

            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-slate-900 to-black/90 p-5 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between pb-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                    <Sparkles className="h-3 w-3" />
                    Auto‑generated creatives
                  </div>
                  <p className="text-sm text-white/70">
                    Product image → multiple video ads
                  </p>
                </div>
                <div className="rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/60 ring-1 ring-white/10">
                  Example workspace
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.9fr,1.1fr] items-start">
                {/* Left: input */}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/60 p-3">
                  <div className="text-xs font-medium text-white/70">
                    Input
                  </div>
                  <div className="aspect-[4/5] overflow-hidden rounded-xl bg-slate-900/80">
                    <div className="flex h-full items-center justify-center text-xs text-white/40">
                      Product / UGC image
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-white/60">
                    <div className="flex items-center justify-between">
                      <span>Brand</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                        DTC skincare
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Goal</span>
                      <span>Acquire cold traffic</span>
                    </div>
                  </div>
                </div>

                {/* Right: generated videos */}
                <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-black p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-emerald-100">
                      6 ad variants generated
                    </span>
                    <span className="text-emerald-300/80">Ready to export</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="group aspect-[9/16] overflow-hidden rounded-lg bg-slate-900/80 ring-1 ring-white/5"
                      >
                        <div className="flex h-full items-center justify-center text-[10px] text-white/40 group-hover:text-white/80">
                          0{i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-emerald-300" />
                      <span>Best‑performing creatives are auto‑tagged.</span>
                    </div>
                    <span className="text-emerald-300">Export MP4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="container mx-auto px-4 mt-20 space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Built for performance, not just pretty demos
              </h2>
              <p className="mt-2 max-w-2xl text-sm md:text-base text-white/70">
                AI SaaS focuses on the workflows that actually matter for
                media buyers and creative teams – fast iteration, clear formats
                and reliable delivery.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 text-orange-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Ad‑native formats</h3>
              <p className="mt-2 text-sm text-white/70">
                Generate in 9:16, 1:1 and 16:9 with hooks, mid‑story and
                closing scenes that feel native to TikTok, Reels and Shorts.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Test more creative angles</h3>
              <p className="mt-2 text-sm text-white/70">
                From one asset, spin up multiple emotional angles, hooks and
                CTAs to feed your testing framework.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Ship same‑day creative</h3>
              <p className="mt-2 text-sm text-white/70">
                Go from idea to exportable video ads in under an hour, without
                waiting on external editors or agencies.
              </p>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="container mx-auto px-4 mt-20 space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Designed for teams who live in Ads Manager
          </h2>
          <div className="grid gap-5 md:grid-cols-3 text-sm text-white/80">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/50">
                In‑house marketers
              </div>
              <p>
                You run performance for a DTC brand and need weekly creative
                drops without hiring a full video team.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/50">
                Agencies & studios
              </div>
              <p>
                You manage multiple clients and want to increase creative
                throughput per account manager without burning out editors.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/50">
                Solo creators
              </div>
              <p>
                You sell UGC or run small accounts and need a faster way to
                deliver more concepts and variations per brief.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 mt-20">
          <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-orange-500/20 via-fuchsia-500/15 to-sky-500/20 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-semibold">
                Ready to see your product in motion?
              </h3>
              <p className="text-sm md:text-base text-white/75">
                Upload a product or UGC image and get your first ad‑ready video
                in minutes. No calls, no onboarding decks.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg shadow-orange-500/40 transition hover:bg-slate-100"
              >
                Generate my first ad
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/20 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-black/40"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}


