# AI SaaS Framework

A production-ready, full-stack AI SaaS framework built with the T3 Stack. Designed for solo developers who want to ship AI products fast without rebuilding common infrastructure.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router, Server Components)
- **Language**: TypeScript (end-to-end type safety)
- **API**: [tRPC](https://trpc.io) (type-safe RPC)
- **Database**: PostgreSQL + [Prisma](https://prisma.io) ORM
- **Auth**: [NextAuth.js](https://next-auth.js.org) (Google OAuth, Email Magic Link, Credentials)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **Background Jobs**: [BullMQ](https://docs.bullmq.io) + Redis
- **AI**: AI SDK v5 (OpenAI, Anthropic, Google Gemini, xAI, OpenRouter)
- **Analytics**: [PostHog](https://posthog.com)

## Features

### Core Infrastructure
- Full authentication system (Google, Email, Password)
- Credit-based billing with Stripe, Airwallex, crypto (NowPayments), Telegram Stars
- Subscription plans (Free, Starter, Pro, Premium) with multi-currency support
- Background job processing with BullMQ (workers, schedulers, queues)
- Object storage (S3-compatible: AWS, GCS, Aliyun OSS, R2, MinIO)
- Rate limiting and abuse prevention (Turnstile, device fingerprint, IP-based)
- Admin dashboard with user management, order tracking, and analytics

### AI Chat Module
- Multi-agent architecture with pluggable AI providers
- Streaming chat with tool use (document tools, custom tools)
- Guest mode with configurable rate limits
- Conversation history and project organization

### Marketing & Growth
- Affiliate/referral system with commission tracking
- Google Ads conversion tracking (Enhanced Conversions API)
- UTM attribution and first-touch tracking
- Promotional codes system

### Communication
- Email services (Resend, SendGrid) with templates
- Customer support system (IMAP sync + AI-assisted replies)
- Telegram Bot integration with Stars payment
- Lark/Feishu notifications

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Redis

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment file and configure
cp .env.example .env

# Push database schema
npx prisma db push

# Seed the database
npx prisma db seed

# Start development server
pnpm dev
```

### Worker (Background Jobs)

```bash
pnpm worker:dev
```

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
├── components/       # Shared UI components
├── modules/          # Feature modules (ai-chat, example)
│   └── example/      # Template for adding new business modules
├── server/           # Server-side code
│   ├── api/          # tRPC routers and tools
│   ├── auth/         # Authentication config
│   ├── billing/      # Credits and billing logic
│   ├── order/        # Order and payment processing
│   ├── membership/   # Subscription management
│   ├── support/      # Customer support system
│   └── telegram/     # Telegram bot integration
├── workers/          # BullMQ workers and queues
├── analytics/        # PostHog and event tracking
├── config/           # App configuration
└── lib/              # Shared utilities
```

## Adding a New Business Module

See `src/modules/example/README.md` for a complete template showing how to add:
- tRPC router (API endpoints)
- Service layer (business logic)
- BullMQ worker (background jobs)
- React page component (frontend)

## Environment Variables

Key variables to configure (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis for BullMQ and caching |
| `AUTH_SECRET` | NextAuth.js secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `OPENAI_API_KEY` | OpenAI API key for AI chat |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `RESEND_API_KEY` | Email sending |

## License

Private — All rights reserved.
