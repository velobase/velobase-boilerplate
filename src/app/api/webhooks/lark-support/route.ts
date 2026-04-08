/**
 * 飞书卡片回调 Webhook
 * 
 * 处理客服审核卡片的 Approve/Reject 操作。
 */

import { NextResponse, type NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { approveDraft, rejectDraft } from "@/server/support/services/approve-draft";
import { addActionEvent } from "@/server/support/services/add-event";
import { supportSendQueue } from "@/workers/queues";
import { generateReplyHtml } from "@/server/support/providers/smtp";
import { executeTool, type ToolName } from "@/server/support/ai/tools";
import { db } from "@/server/db";

const logger = createLogger("lark-support-webhook");

interface CardAction {
  action: "approve" | "reject";
  ticketId: string;
}

interface LarkCardCallback {
  open_id?: string;
  user_id?: string;
  action?: {
    value?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LarkCardCallback;

    logger.info({ body }, "Received Lark card callback");

    // 解析操作
    const actionValue = body.action?.value;
    if (!actionValue) {
      return NextResponse.json({ error: "No action value" }, { status: 400 });
    }

    let cardAction: CardAction;
    try {
      cardAction = JSON.parse(actionValue) as CardAction;
    } catch {
      return NextResponse.json({ error: "Invalid action value" }, { status: 400 });
    }

    const { action, ticketId } = cardAction;

    if (!ticketId) {
      return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
    }

    // 获取操作者信息
    const agentId = body.user_id ?? body.open_id ?? "unknown";

    if (action === "approve") {
      // 审核通过
      const result = await approveDraft(ticketId, agentId);

      if (!result) {
        return NextResponse.json(
          { error: "No draft found or approval failed" },
          { status: 400 }
        );
      }

      // 执行操作（如取消订阅）
      if (result.actions.length > 0) {
        // 获取用户 ID
        const ticket = await db.supportTicket.findUnique({
          where: { id: ticketId },
        });

        if (ticket?.userId) {
          for (const action of result.actions) {
            const toolResult = await executeTool(
              action.tool as ToolName,
              ticket.userId,
              action.args
            );

            await addActionEvent(
              ticketId,
              "AGENT",
              agentId,
              action.tool,
              action.args,
              toolResult.data,
              toolResult.success,
              toolResult.error
            );

            logger.info(
              { ticketId, tool: action.tool, success: toolResult.success },
              "Executed approved action"
            );
          }
        }
      }

      // 入发送队列
      await supportSendQueue.add(
        `send-${ticketId}`,
        {
          type: "send-reply",
          ticketId,
          toEmail: result.toEmail,
          subject: `Re: ${(await db.supportTicket.findUnique({ where: { id: ticketId } }))?.subject ?? "Support"}`,
          body: result.reply,
          bodyHtml: generateReplyHtml(result.reply),
          inReplyTo: result.inReplyTo,
          references: result.references,
        },
        {
          jobId: `send-${ticketId}-${Date.now()}`,
        }
      );

      logger.info({ ticketId, agentId }, "Draft approved, reply queued");

      // 返回更新后的卡片（可选）
      return NextResponse.json({
        toast: {
          type: "success",
          content: "已批准，回复已入队发送",
        },
      });
    } else if (action === "reject") {
      // 审核拒绝
      await rejectDraft(ticketId, agentId, "Rejected via Lark card");

      logger.info({ ticketId, agentId }, "Draft rejected");

      return NextResponse.json({
        toast: {
          type: "info",
          content: "已拒绝，请手动处理",
        },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    logger.error({ err }, "Lark support webhook error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 飞书验证请求
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  return NextResponse.json({ status: "ok" });
}

