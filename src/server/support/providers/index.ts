export { fetchNewEmails, getMaxUid } from "./imap";
export { sendEmail, generateReplyHtml, type SendEmailParams, type SendEmailResult } from "./smtp";
export {
  // 话题管理
  createTicketThread,
  // 话题内通知
  sendApprovalCard,
  sendStatusUpdate,
  sendThreadMessage,
  sendAgentProcessingCard,
  // 类型
  type AgentProcessingData,
  // 兼容旧接口（deprecated）
  sendNewTicketNotification,
  sendAutoProcessedNotification,
} from "./lark-notify";

