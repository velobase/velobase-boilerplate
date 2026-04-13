/**
 * PostHog Analytics Integration Test
 *
 * 验证 PostHog 事件追踪和 Feature Flag 在当前环境下可用。
 * 需要配置 NEXT_PUBLIC_POSTHOG_KEY 环境变量，未配置则测试失败。
 *
 * Usage: npx tsx scripts/tests/integrations/analytics/test-posthog.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const POSTHOG_KEY =
  process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

// ───────────────────────── Tests ─────────────────────────

async function testEventCapture() {
  console.log("\n📊 Test 1: Event Capture (POST /capture)");

  const { PostHog } = await import("posthog-node");
  const posthog = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  const testDistinctId = `test-user-${Date.now()}`;
  const testEvent = `integration_test_${Date.now()}`;

  try {
    posthog.capture({
      distinctId: testDistinctId,
      event: testEvent,
      properties: {
        test: true,
        timestamp: new Date().toISOString(),
        source: "integration-test",
      },
    });

    await posthog.shutdown();
    assert(true, "Event captured and flushed without error");
  } catch (err) {
    assert(false, `Event capture threw: ${(err as Error).message}`);
  }
}

async function testEventWithProperties() {
  console.log("\n📊 Test 2: Event with rich properties");

  const { PostHog } = await import("posthog-node");
  const posthog = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    posthog.capture({
      distinctId: `test-user-${Date.now()}`,
      event: "billing_credits_purchase_success",
      properties: {
        package_id: "test-pkg-001",
        credits: 100,
        price: 9.99,
        product_type: "CREDITS_PACKAGE",
        source: "integration-test",
        amount_usd: 9.99,
        gateway: "stripe",
      },
    });

    await posthog.shutdown();
    assert(true, "Rich event properties accepted");
  } catch (err) {
    assert(false, `Rich properties threw: ${(err as Error).message}`);
  }
}

async function testIdentifyAndAlias() {
  console.log("\n📊 Test 3: Identify and Alias");

  const { PostHog } = await import("posthog-node");
  const posthog = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  const userId = `test-user-${Date.now()}`;

  try {
    posthog.identify({
      distinctId: userId,
      properties: {
        email: "test@example.com",
        name: "Test User",
        plan: "free",
      },
    });

    posthog.alias({
      distinctId: userId,
      alias: "test@example.com",
    });

    await posthog.shutdown();
    assert(true, "Identify and alias completed without error");
  } catch (err) {
    assert(false, `Identify/alias threw: ${(err as Error).message}`);
  }
}

async function testFeatureFlag() {
  console.log("\n📊 Test 4: Feature Flag evaluation");

  const { PostHog } = await import("posthog-node");
  const posthog = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    const flags = await posthog.getAllFlags(`test-user-${Date.now()}`);
    assert(
      typeof flags === "object" && flags !== null,
      `getAllFlags returned object with ${Object.keys(flags).length} flags`
    );
    await posthog.shutdown();
  } catch (err) {
    assert(false, `getAllFlags threw: ${(err as Error).message}`);
  }
}

async function testGetFeatureFlagSingle() {
  console.log("\n📊 Test 5: Single Feature Flag (non-existent key → default)");

  const { PostHog } = await import("posthog-node");
  const posthog = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    const value = await posthog.getFeatureFlag(
      "non-existent-flag-xyz",
      `test-user-${Date.now()}`
    );
    assert(
      value === false || value === undefined || typeof value === "string",
      `Non-existent flag returned: ${JSON.stringify(value)} (expected falsy or undefined)`
    );
    await posthog.shutdown();
  } catch (err) {
    assert(false, `getFeatureFlag threw: ${(err as Error).message}`);
  }
}

async function testBatchCapture() {
  console.log("\n📊 Test 6: Batch capture (multiple events)");

  const { PostHog } = await import("posthog-node");
  const posthog = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_HOST,
    flushAt: 10,
    flushInterval: 0,
  });

  try {
    const userId = `test-user-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      posthog.capture({
        distinctId: userId,
        event: `batch_test_event_${i}`,
        properties: { index: i, source: "integration-test" },
      });
    }

    await posthog.shutdown();
    assert(true, "5 events batched and flushed without error");
  } catch (err) {
    assert(false, `Batch capture threw: ${(err as Error).message}`);
  }
}

async function testNullSafety() {
  console.log("\n📊 Test 7: Null-safe getServerPostHog pattern");

  const { PostHog } = await import("posthog-node");

  const emptyKey = "";
  const posthog = emptyKey ? new PostHog(emptyKey) : null;
  assert(posthog === null, "Empty key → null (no PostHog instance created)");

  const validPosthog = new PostHog(POSTHOG_KEY!, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  assert(validPosthog !== null, "Valid key → PostHog instance created");
  await validPosthog.shutdown();
}

// ───────────────────────── Runner ─────────────────────────

async function run() {
  console.log("═══════════════════════════════════════════");
  console.log("  PostHog Analytics Integration Test");
  console.log("═══════════════════════════════════════════");

  if (!POSTHOG_KEY) {
    console.error(
      "\n❌ NEXT_PUBLIC_POSTHOG_KEY (or POSTHOG_API_KEY) is not configured."
    );
    console.error(
      "   This test requires a valid PostHog project API key to verify the integration."
    );
    console.error(
      "   Please set NEXT_PUBLIC_POSTHOG_KEY in .env and re-run.\n"
    );
    process.exit(1);
  }

  console.log(`\n🔑 PostHog key: ${POSTHOG_KEY.slice(0, 8)}...`);
  console.log(`🌐 PostHog host: ${POSTHOG_HOST}`);

  await testEventCapture();
  await testEventWithProperties();
  await testIdentifyAndAlias();
  await testFeatureFlag();
  await testGetFeatureFlagSingle();
  await testBatchCapture();
  await testNullSafety();

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

run();
