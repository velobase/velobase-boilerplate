"use client";

import { Sparkles, Zap, Lock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Sparkles,
    title: "AI-First Architecture",
    description: "Multi-provider AI SDK with OpenAI, Anthropic, Google Gemini, and more — ready out of the box.",
    color: "text-blue-500",
  },
  {
    icon: Zap,
    title: "Ship Fast",
    description: "Auth, billing, payments, background jobs, and email — all pre-wired so you can focus on your core feature.",
    color: "text-purple-500",
  },
  {
    icon: Lock,
    title: "Production Ready",
    description: "Rate limiting, abuse prevention, analytics, and admin dashboard included from day one.",
    color: "text-emerald-500",
  },
  {
    icon: CreditCard,
    title: "Flexible Billing",
    description: "Stripe, Airwallex, crypto payments, and a credit-based system with subscriptions and promo codes.",
    color: "text-orange-500",
  },
];

export function Features() {
  return (
    <section className="w-full py-32 px-6 relative overflow-hidden bg-background">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-sm font-medium text-blue-500 tracking-widest uppercase mb-6">
              Framework Features
            </h2>
            <h3 className="text-4xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.1]">
              Everything you need <br/>
              <span className="text-muted-foreground">to launch your AI SaaS.</span>
            </h3>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-sm leading-relaxed font-light">
            A full-stack Next.js framework with all the infrastructure a solo developer needs to build, launch, and scale an AI product.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group flex flex-col items-start"
            >
              <div className="w-full h-[1px] bg-border/50 mb-8 relative overflow-hidden">
                <div className={cn(
                  "absolute inset-0 w-full h-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-out bg-foreground",
                )} />
              </div>

              <div className={cn(
                "mb-6 p-3 -ml-3 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors duration-300",
                feature.color
              )}>
                <feature.icon className="w-6 h-6" strokeWidth={1.5} />
              </div>

              <h4 className="text-xl font-medium mb-3 text-foreground tracking-tight group-hover:translate-x-1 transition-transform duration-300">
                {feature.title}
              </h4>
              
              <p className="text-muted-foreground leading-relaxed font-light text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
