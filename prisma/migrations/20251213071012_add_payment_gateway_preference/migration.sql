-- CreateEnum
CREATE TYPE "UserPaymentGatewayPreference" AS ENUM ('AUTO', 'STRIPE', 'NOWPAYMENTS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payment_gateway_preference" "UserPaymentGatewayPreference" NOT NULL DEFAULT 'AUTO';
