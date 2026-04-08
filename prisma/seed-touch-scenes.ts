/**
 * Seed TouchScene & TouchTemplate data
 *
 * Usage:
 *   npx tsx prisma/seed-touch-scenes.ts
 */
/* eslint-disable no-console */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SCENES = [
  {
    key: "sub_renewal_reminder_d1",
    name: "订阅续费提醒（D-1）",
    description: "订阅到期前1天自动发送续费提醒邮件",
    channel: "EMAIL" as const,
    triggerType: "SCHEDULED" as const,
    isActive: true,
  },
];

const DEFAULT_TEMPLATES = [
  {
    sceneKey: "sub_renewal_reminder_d1",
    locale: "en",
    version: "default",
    isDefault: true,
    isActive: true,
    subject: "Your subscription renews soon",
    bodyText: `Hi,

This is a quick reminder that your subscription is set to renew soon.

Your account balance will be refilled upon renewal, ensuring uninterrupted access to all premium features.

Renewal time (approx): {{periodEndAtIso}}

Manage your subscription: {{manageUrl}}

We can't wait to see what you create next!

The Team`,
    bodyHtml: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Subscription Renewal Reminder</title>
    <style>
      @media only screen and (max-width: 620px) {
        table.body h1 { font-size: 28px !important; margin-bottom: 10px !important; }
        table.body p, table.body ul, table.body ol, table.body td, table.body span, table.body a { font-size: 16px !important; }
        table.body .wrapper, table.body .article { padding: 10px !important; }
        table.body .content { padding: 0 !important; }
        table.body .container { padding: 0 !important; width: 100% !important; }
        table.body .main { border-left-width: 0 !important; border-radius: 0 !important; border-right-width: 0 !important; }
      }
    </style>
  </head>
  <body style="background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f8fafc; width: 100%;">
      <tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
        <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; margin: 0 auto;">
          <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">
            
            <!-- START CENTERED WHITE CONTAINER -->
            <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #ffffff; border-radius: 12px; width: 100%; border: 1px solid #e2e8f0; overflow: hidden;">

              <!-- HERO IMAGE / GRADIENT -->
              <tr>
                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; background: linear-gradient(135deg, #FF6B6B 0%, #845EC2 100%); height: 8px;"></td>
              </tr>

              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 32px 24px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
                        <p style="font-family: sans-serif; font-size: 20px; font-weight: bold; margin: 0 0 16px; color: #1e293b; text-align: center;">Subscription renewing soon</p>
                        
                        <p style="font-family: sans-serif; font-size: 15px; font-weight: normal; margin: 0 0 16px; color: #475569; line-height: 1.6; text-align: center;">
                          Your account balance will be refilled upon renewal, ensuring uninterrupted access to all premium features.
                        </p>
                        
                        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px; margin-bottom: 24px; text-align: center;">
                           <p style="font-family: sans-serif; font-size: 13px; font-weight: normal; margin: 0; color: #64748b;">
                             Renewal time (approx):<br>
                             <strong style="color: #334155; font-size: 14px;">{{periodEndAtIso}}</strong>
                           </p>
                        </div>

                        <div style="text-align: center; margin-bottom: 24px;">
                          <a href="https://example.com" target="_blank" style="background-color: #0f172a; border: solid 1px #0f172a; border-radius: 8px; box-sizing: border-box; color: #ffffff; cursor: pointer; display: inline-block; font-size: 16px; font-weight: bold; margin: 0; padding: 12px 32px; text-decoration: none; text-transform: capitalize;">Keep Creating</a>
                        </div>
                        
                        <p style="text-align: center; margin: 0;">
                          <a href="{{manageUrl}}" style="color: #94a3b8; font-size: 13px; text-decoration: underline;">Manage Subscription</a>
                        </p>

                        <p style="font-family: sans-serif; font-size: 13px; font-weight: normal; margin: 32px 0 0; color: #94a3b8; font-style: italic; text-align: center;">
                          "Creativity is intelligence having fun."
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- END MAIN CONTENT AREA -->
            </table>
            
            <!-- START FOOTER -->
            <div class="footer" style="clear: both; margin-top: 24px; text-align: center; width: 100%;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                <tr>
                  <td class="content-block" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; color: #94a3b8; font-size: 12px; text-align: center;">
                    <span class="apple-link" style="color: #94a3b8; font-size: 12px; text-align: center;">AI SaaS</span>
                    <br> You are receiving this email because you have an active subscription.
                    <br> If you no longer wish to receive these emails, please <a href="{{manageUrl}}" style="color: #94a3b8; text-decoration: underline;">turn off email notification</a> at profile page.
                  </td>
                </tr>
              </table>
            </div>
            <!-- END FOOTER -->

          </div>
        </td>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>`,
  },
];

export async function seedTouchScenes() {
  console.log("   Seeding TouchScenes...");

  for (const scene of DEFAULT_SCENES) {
    const existing = await prisma.touchScene.findUnique({
      where: { key: scene.key },
    });

    if (existing) {
      console.log(`   ℹ️  TouchScene "${scene.key}" already exists, skipping`);
      continue;
    }

    await prisma.touchScene.create({ data: scene });
    console.log(`   ✅ Created TouchScene "${scene.key}"`);
  }

  console.log("   Seeding TouchTemplates...");

  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.touchTemplate.findUnique({
      where: {
        sceneKey_locale_version: {
          sceneKey: template.sceneKey,
          locale: template.locale,
          version: template.version,
        },
      },
    });

    if (existing) {
      console.log(`   🔄 Updating TouchTemplate "${template.sceneKey}/${template.locale}/${template.version}"`);
      await prisma.touchTemplate.update({
        where: { id: existing.id },
        data: {
          subject: template.subject,
          bodyText: template.bodyText,
          bodyHtml: template.bodyHtml,
          isActive: template.isActive,
          isDefault: template.isDefault,
        },
      });
    } else {
      await prisma.touchTemplate.create({ data: template });
      console.log(`   ✅ Created TouchTemplate "${template.sceneKey}/${template.locale}/${template.version}"`);
    }
  }

  console.log("   Touch seeding completed");
}

// 支持直接运行
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedTouchScenes()
    .catch((e) => {
      console.error("❌ Error seeding TouchScenes:", e);
      process.exit(1);
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
