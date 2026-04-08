-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('UNDEFINED', 'SUBSCRIPTION', 'ONE_TIME_ENTITLEMENT', 'CREDITS_PACKAGE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BillingAccountType" AS ENUM ('UNDEFINED', 'QUOTA', 'CREDIT');

-- CreateEnum
CREATE TYPE "BillingSubAccountType" AS ENUM ('UNDEFINED', 'DEFAULT', 'FREE_TRIAL', 'MEMBERSHIP', 'ORDER', 'DAILY_LOGIN', 'FIRST_LOGIN', 'PROMO_CODE');

-- CreateEnum
CREATE TYPE "BillingAccountStatus" AS ENUM ('UNDEFINED', 'PENDING', 'ACTIVE', 'EXPIRED', 'DEPLETED', 'INVALID');

-- CreateEnum
CREATE TYPE "BillingOperationType" AS ENUM ('UNDEFINED', 'FREEZE', 'CONSUME', 'UNFREEZE', 'GRANT', 'EXPIRE');

-- CreateEnum
CREATE TYPE "BillingBusinessType" AS ENUM ('UNDEFINED', 'TASK', 'ORDER', 'MEMBERSHIP', 'SUBSCRIPTION', 'FREE_TRIAL', 'ADMIN_GRANT', 'TOKEN_USAGE');

-- CreateEnum
CREATE TYPE "BillingRecordStatus" AS ENUM ('UNDEFINED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingFreezeStatus" AS ENUM ('UNDEFINED', 'FROZEN', 'CONSUMED', 'UNFROZEN');

-- CreateEnum
CREATE TYPE "UserSubscriptionStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "UserSubscriptionCycleType" AS ENUM ('UNDEFINED', 'REGULAR', 'TRIAL');

-- CreateEnum
CREATE TYPE "UserSubscriptionCycleStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "UserEntitlementSourceType" AS ENUM ('UNDEFINED', 'SUBSCRIPTION_CYCLE', 'ORDER', 'PROMOTION');

-- CreateEnum
CREATE TYPE "UserEntitlementStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('UNDEFINED', 'FREE', 'PLUS', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionPlanStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionPlanInterval" AS ENUM ('UNDEFINED', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "EntitlementType" AS ENUM ('UNDEFINED', 'BOOLEAN', 'LIMIT', 'LEVEL');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('UNDEFINED', 'SYNC', 'ASYNC');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('UNDEFINED', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromoCodeType" AS ENUM ('UNDEFINED', 'KOL_INTERNAL', 'USER_PROMOTION');

-- CreateEnum
CREATE TYPE "PromoCodeStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'DISABLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PromoGrantType" AS ENUM ('UNDEFINED', 'CREDIT', 'PRODUCT');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "project_id" TEXT,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "shared_at" TIMESTAMP(3),
    "title" TEXT,
    "metadata" JSONB,
    "active_interaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_agent_id" TEXT,
    "type" TEXT NOT NULL,
    "parts" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "correlation_id" TEXT,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
    "avatar" TEXT,
    "color" TEXT,
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "custom_instructions" TEXT,
    "custom_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "video_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "video_id" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'video',
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'video/mp4',
    "file_size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "project_id" TEXT,
    "storage_key" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "content_type" TEXT NOT NULL DEFAULT 'image/png',
    "file_size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'generate',
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'doubao-seedream-4-0-250828',
    "parent_id" TEXT,
    "size" TEXT,
    "ratio" TEXT,
    "watermark" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unused',
    "used_by" TEXT,
    "used_at" TIMESTAMP(3),
    "project_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "file_url" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "content_hash" TEXT,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_quality_scores" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "stats" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_quality_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" JSONB,
    "price" INTEGER NOT NULL,
    "original_price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "type" "ProductType" NOT NULL,
    "interval" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_snapshot" JSONB NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NEW_PURCHASE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payment_gateway" TEXT NOT NULL DEFAULT 'STRIPE',
    "payment_url" TEXT,
    "gateway_transaction_id" TEXT,
    "gateway_subscription_id" TEXT,
    "is_subscription" BOOLEAN NOT NULL DEFAULT false,
    "gateway_response" JSONB,
    "extra" JSONB DEFAULT '{}',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_billing_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_type" "BillingAccountType" NOT NULL DEFAULT 'UNDEFINED',
    "sub_account_type" "BillingSubAccountType" NOT NULL DEFAULT 'UNDEFINED',
    "outer_biz_id" TEXT NOT NULL,
    "reference_id" TEXT,
    "status" "BillingAccountStatus" NOT NULL DEFAULT 'UNDEFINED',
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "used_amount" INTEGER NOT NULL DEFAULT 0,
    "frozen_amount" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "billing_billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_billing_records" (
    "id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_type" "BillingAccountType" NOT NULL DEFAULT 'UNDEFINED',
    "sub_account_type" "BillingSubAccountType" NOT NULL DEFAULT 'UNDEFINED',
    "operation_type" "BillingOperationType" NOT NULL DEFAULT 'UNDEFINED',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "business_id" TEXT,
    "business_type" "BillingBusinessType" NOT NULL DEFAULT 'UNDEFINED',
    "reference_id" TEXT,
    "description" TEXT,
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'UNDEFINED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "billing_billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_billing_freeze_records" (
    "id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_type" "BillingAccountType" NOT NULL DEFAULT 'UNDEFINED',
    "sub_account_type" "BillingSubAccountType" NOT NULL DEFAULT 'UNDEFINED',
    "business_id" TEXT NOT NULL,
    "business_type" "BillingBusinessType" NOT NULL DEFAULT 'UNDEFINED',
    "frozen_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "BillingFreezeStatus" NOT NULL DEFAULT 'UNDEFINED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "billing_billing_freeze_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_user_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_snapshot" JSONB NOT NULL,
    "status" "UserSubscriptionStatus" NOT NULL DEFAULT 'UNDEFINED',
    "gateway" TEXT NOT NULL DEFAULT '',
    "gateway_subscription_id" TEXT NOT NULL DEFAULT '',
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "membership_user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_user_subscription_cycles" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "type" "UserSubscriptionCycleType" NOT NULL DEFAULT 'UNDEFINED',
    "status" "UserSubscriptionCycleStatus" NOT NULL DEFAULT 'UNDEFINED',
    "sequence_number" INTEGER NOT NULL DEFAULT 1,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_credit_grant_anchor" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "membership_user_subscription_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_user_entitlements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entitlement_id" TEXT NOT NULL,
    "source_type" "UserEntitlementSourceType" NOT NULL DEFAULT 'UNDEFINED',
    "source_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "status" "UserEntitlementStatus" NOT NULL DEFAULT 'UNDEFINED',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "membership_user_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_subscription_plans" (
    "id" TEXT NOT NULL,
    "type" "SubscriptionPlanType" NOT NULL DEFAULT 'UNDEFINED',
    "name" TEXT NOT NULL DEFAULT '',
    "status" "SubscriptionPlanStatus" NOT NULL DEFAULT 'UNDEFINED',
    "interval" "SubscriptionPlanInterval" NOT NULL DEFAULT 'UNDEFINED',
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "credits_per_month" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_product_subscriptions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_product_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_product_credits_packages" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "credits_amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_product_credits_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_entitlements" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "EntitlementType" NOT NULL DEFAULT 'UNDEFINED',
    "status" "EntitlementStatus" NOT NULL DEFAULT 'UNDEFINED',
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_plan_entitlements" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "entitlement_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_plan_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_product_one_time_entitlements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "entitlement_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_product_one_time_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL DEFAULT 'UNDEFINED',
    "status" "TaskStatus" NOT NULL DEFAULT 'UNDEFINED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "request_data" JSONB,
    "result_data" JSONB,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "extra" JSONB DEFAULT '{}',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "code_type" "PromoCodeType" NOT NULL DEFAULT 'UNDEFINED',
    "status" "PromoCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "grant_type" "PromoGrantType" NOT NULL DEFAULT 'CREDIT',
    "credits_amount" INTEGER NOT NULL DEFAULT 0,
    "product_id" TEXT,
    "usage_limit" INTEGER NOT NULL DEFAULT 0,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "per_user_limit" INTEGER NOT NULL DEFAULT 1,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_code_redemptions" (
    "id" TEXT NOT NULL,
    "promo_code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "billing_account_id" TEXT,
    "billing_record_id" TEXT,
    "credits_granted" INTEGER NOT NULL DEFAULT 0,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "conversations_updated_at_idx" ON "conversations"("updated_at");

-- CreateIndex
CREATE INDEX "conversations_user_id_created_at_idx" ON "conversations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "conversations_is_guest_created_at_idx" ON "conversations"("is_guest", "created_at");

-- CreateIndex
CREATE INDEX "conversations_user_id_is_archived_idx" ON "conversations"("user_id", "is_archived");

-- CreateIndex
CREATE INDEX "conversations_is_shared_idx" ON "conversations"("is_shared");

-- CreateIndex
CREATE INDEX "conversations_project_id_idx" ON "conversations"("project_id");

-- CreateIndex
CREATE INDEX "conversations_user_id_project_id_idx" ON "conversations"("user_id", "project_id");

-- CreateIndex
CREATE INDEX "interactions_conversation_id_created_at_idx" ON "interactions"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "interactions_correlation_id_idx" ON "interactions"("correlation_id");

-- CreateIndex
CREATE INDEX "interactions_user_agent_id_idx" ON "interactions"("user_agent_id");

-- CreateIndex
CREATE INDEX "interactions_parent_id_idx" ON "interactions"("parent_id");

-- CreateIndex
CREATE INDEX "posts_name_idx" ON "posts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "agents_is_system_enabled_idx" ON "agents"("is_system", "enabled");

-- CreateIndex
CREATE INDEX "user_agents_user_id_idx" ON "user_agents"("user_id");

-- CreateIndex
CREATE INDEX "user_agents_user_id_is_default_idx" ON "user_agents"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "user_agents_agent_id_idx" ON "user_agents"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_agents_user_id_agent_id_key" ON "user_agents"("user_id", "agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_video_id_key" ON "video_assets"("video_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_storage_key_key" ON "video_assets"("storage_key");

-- CreateIndex
CREATE INDEX "video_assets_user_id_idx" ON "video_assets"("user_id");

-- CreateIndex
CREATE INDEX "video_assets_video_id_idx" ON "video_assets"("video_id");

-- CreateIndex
CREATE INDEX "video_assets_status_idx" ON "video_assets"("status");

-- CreateIndex
CREATE INDEX "video_assets_expires_at_idx" ON "video_assets"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "image_assets_storage_key_key" ON "image_assets"("storage_key");

-- CreateIndex
CREATE INDEX "image_assets_user_id_idx" ON "image_assets"("user_id");

-- CreateIndex
CREATE INDEX "image_assets_project_id_created_at_idx" ON "image_assets"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "image_assets_parent_id_idx" ON "image_assets"("parent_id");

-- CreateIndex
CREATE INDEX "image_assets_prompt_idx" ON "image_assets"("prompt");

-- CreateIndex
CREATE UNIQUE INDEX "activation_codes_code_key" ON "activation_codes"("code");

-- CreateIndex
CREATE INDEX "activation_codes_status_idx" ON "activation_codes"("status");

-- CreateIndex
CREATE INDEX "activation_codes_user_id_idx" ON "activation_codes"("user_id");

-- CreateIndex
CREATE INDEX "activation_codes_code_idx" ON "activation_codes"("code");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_user_id_status_idx" ON "projects"("user_id", "status");

-- CreateIndex
CREATE INDEX "documents_project_id_idx" ON "documents"("project_id");

-- CreateIndex
CREATE INDEX "documents_user_id_idx" ON "documents"("user_id");

-- CreateIndex
CREATE INDEX "documents_project_id_title_is_current_idx" ON "documents"("project_id", "title", "is_current");

-- CreateIndex
CREATE INDEX "documents_project_id_title_version_idx" ON "documents"("project_id", "title", "version");

-- CreateIndex
CREATE INDEX "documents_parent_id_idx" ON "documents"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_quality_scores_project_id_key" ON "project_quality_scores"("project_id");

-- CreateIndex
CREATE INDEX "project_quality_scores_scored_at_idx" ON "project_quality_scores"("scored_at");

-- CreateIndex
CREATE INDEX "project_quality_scores_totalScore_idx" ON "project_quality_scores"("totalScore");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_product_id_idx" ON "orders"("product_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_gateway_transaction_id_idx" ON "payments"("gateway_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_billing_accounts_outer_biz_id_key" ON "billing_billing_accounts"("outer_biz_id");

-- CreateIndex
CREATE INDEX "billing_billing_accounts_user_id_idx" ON "billing_billing_accounts"("user_id");

-- CreateIndex
CREATE INDEX "billing_billing_accounts_user_id_account_type_sub_account_t_idx" ON "billing_billing_accounts"("user_id", "account_type", "sub_account_type");

-- CreateIndex
CREATE INDEX "billing_billing_accounts_status_idx" ON "billing_billing_accounts"("status");

-- CreateIndex
CREATE INDEX "billing_billing_records_billing_account_id_idx" ON "billing_billing_records"("billing_account_id");

-- CreateIndex
CREATE INDEX "billing_billing_records_user_id_idx" ON "billing_billing_records"("user_id");

-- CreateIndex
CREATE INDEX "billing_billing_records_operation_type_idx" ON "billing_billing_records"("operation_type");

-- CreateIndex
CREATE INDEX "billing_billing_records_business_id_operation_type_idx" ON "billing_billing_records"("business_id", "operation_type");

-- CreateIndex
CREATE INDEX "billing_billing_records_business_type_idx" ON "billing_billing_records"("business_type");

-- CreateIndex
CREATE INDEX "billing_billing_records_reference_id_idx" ON "billing_billing_records"("reference_id");

-- CreateIndex
CREATE INDEX "billing_billing_records_status_idx" ON "billing_billing_records"("status");

-- CreateIndex
CREATE INDEX "billing_billing_freeze_records_user_id_idx" ON "billing_billing_freeze_records"("user_id");

-- CreateIndex
CREATE INDEX "billing_billing_freeze_records_account_type_idx" ON "billing_billing_freeze_records"("account_type");

-- CreateIndex
CREATE INDEX "billing_billing_freeze_records_sub_account_type_idx" ON "billing_billing_freeze_records"("sub_account_type");

-- CreateIndex
CREATE INDEX "billing_billing_freeze_records_business_id_idx" ON "billing_billing_freeze_records"("business_id");

-- CreateIndex
CREATE INDEX "billing_billing_freeze_records_business_type_idx" ON "billing_billing_freeze_records"("business_type");

-- CreateIndex
CREATE INDEX "billing_billing_freeze_records_status_idx" ON "billing_billing_freeze_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_billing_freeze_records_billing_account_id_business__key" ON "billing_billing_freeze_records"("billing_account_id", "business_id");

-- CreateIndex
CREATE INDEX "membership_user_subscriptions_user_id_status_idx" ON "membership_user_subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "membership_user_subscription_cycles_subscription_id_idx" ON "membership_user_subscription_cycles"("subscription_id");

-- CreateIndex
CREATE INDEX "membership_user_subscription_cycles_payment_id_idx" ON "membership_user_subscription_cycles"("payment_id");

-- CreateIndex
CREATE INDEX "membership_user_subscription_cycles_last_credit_grant_ancho_idx" ON "membership_user_subscription_cycles"("last_credit_grant_anchor");

-- CreateIndex
CREATE UNIQUE INDEX "membership_user_subscription_cycles_subscription_id_sequenc_key" ON "membership_user_subscription_cycles"("subscription_id", "sequence_number");

-- CreateIndex
CREATE INDEX "membership_user_entitlements_user_id_status_expires_at_idx" ON "membership_user_entitlements"("user_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "membership_user_entitlements_user_id_entitlement_id_source__key" ON "membership_user_entitlements"("user_id", "entitlement_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "product_subscription_plans_type_idx" ON "product_subscription_plans"("type");

-- CreateIndex
CREATE INDEX "product_subscription_plans_status_idx" ON "product_subscription_plans"("status");

-- CreateIndex
CREATE INDEX "product_subscription_plans_interval_idx" ON "product_subscription_plans"("interval");

-- CreateIndex
CREATE INDEX "product_product_subscriptions_plan_id_idx" ON "product_product_subscriptions"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_product_subscriptions_product_id_key" ON "product_product_subscriptions"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_product_credits_packages_product_id_key" ON "product_product_credits_packages"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_entitlements_key_key" ON "product_entitlements"("key");

-- CreateIndex
CREATE INDEX "product_entitlements_type_idx" ON "product_entitlements"("type");

-- CreateIndex
CREATE INDEX "product_entitlements_status_idx" ON "product_entitlements"("status");

-- CreateIndex
CREATE INDEX "product_plan_entitlements_plan_id_idx" ON "product_plan_entitlements"("plan_id");

-- CreateIndex
CREATE INDEX "product_plan_entitlements_entitlement_id_idx" ON "product_plan_entitlements"("entitlement_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_plan_entitlements_plan_id_entitlement_id_key" ON "product_plan_entitlements"("plan_id", "entitlement_id");

-- CreateIndex
CREATE INDEX "product_product_one_time_entitlements_product_id_idx" ON "product_product_one_time_entitlements"("product_id");

-- CreateIndex
CREATE INDEX "product_product_one_time_entitlements_entitlement_id_idx" ON "product_product_one_time_entitlements"("entitlement_id");

-- CreateIndex
CREATE INDEX "task_tasks_user_id_idx" ON "task_tasks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_code_type_idx" ON "promo_codes"("code_type");

-- CreateIndex
CREATE INDEX "promo_codes_status_idx" ON "promo_codes"("status");

-- CreateIndex
CREATE INDEX "promo_codes_expires_at_idx" ON "promo_codes"("expires_at");

-- CreateIndex
CREATE INDEX "promo_codes_product_id_idx" ON "promo_codes"("product_id");

-- CreateIndex
CREATE INDEX "promo_code_redemptions_promo_code_id_idx" ON "promo_code_redemptions"("promo_code_id");

-- CreateIndex
CREATE INDEX "promo_code_redemptions_user_id_idx" ON "promo_code_redemptions"("user_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "interactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_agent_id_fkey" FOREIGN KEY ("user_agent_id") REFERENCES "user_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "image_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_quality_scores" ADD CONSTRAINT "project_quality_scores_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_billing_records" ADD CONSTRAINT "billing_billing_records_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_billing_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_billing_freeze_records" ADD CONSTRAINT "billing_billing_freeze_records_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_billing_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_user_subscription_cycles" ADD CONSTRAINT "membership_user_subscription_cycles_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "membership_user_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_product_subscriptions" ADD CONSTRAINT "product_product_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_product_subscriptions" ADD CONSTRAINT "product_product_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "product_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_product_credits_packages" ADD CONSTRAINT "product_product_credits_packages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_plan_entitlements" ADD CONSTRAINT "product_plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "product_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_plan_entitlements" ADD CONSTRAINT "product_plan_entitlements_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "product_entitlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_product_one_time_entitlements" ADD CONSTRAINT "product_product_one_time_entitlements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_product_one_time_entitlements" ADD CONSTRAINT "product_product_one_time_entitlements_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "product_entitlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
