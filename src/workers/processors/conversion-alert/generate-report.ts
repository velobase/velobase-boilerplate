/**
 * Generate Hourly Report
 * 
 * 数据查询与聚合逻辑
 */
import { db } from "@/server/db";
import type { HourlyMetrics, HourlyReport } from "./types";

/**
 * 获取 LA 时间某天的 UTC 起止时间
 */
function getLADayBounds(date: Date): { start: Date; end: Date } {
  // 获取 LA 时间的日期部分
  const laTimeStr = date.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23" });
  const datePart = laTimeStr.split(", ")[0] ?? "";
  const dateParts = datePart.split("/").map(Number);
  const month = dateParts[0] ?? 1;
  const day = dateParts[1] ?? 1;
  const year = dateParts[2] ?? date.getFullYear();

  // LA 00:00 = UTC 08:00（冬令时）/ UTC 07:00（夏令时）
  let startUTC = new Date(Date.UTC(year, month - 1, day, 8, 0, 0));
  const checkHour = parseInt(startUTC.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
  if (checkHour === 1) startUTC = new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
  else if (checkHour === 23) startUTC = new Date(Date.UTC(year, month - 1, day, 9, 0, 0));

  const endUTC = new Date(startUTC);
  endUTC.setDate(endUTC.getDate() + 1);

  return { start: startUTC, end: endUTC };
}

/**
 * 批量查询首单ID（避免 N+1）
 */
async function getFirstOrderIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  // 使用原生 SQL 批量查询每个用户的首单
  const firstOrders = await db.$queryRaw<{ id: string }[]>`
    SELECT o.id
    FROM "orders" o
    INNER JOIN (
      SELECT "user_id", MIN("created_at") as first_time
      FROM "orders"
      WHERE "user_id" = ANY(${userIds}::text[])
        AND status = 'FULFILLED'
      GROUP BY "user_id"
    ) fo ON o."user_id" = fo."user_id" AND o."created_at" = fo.first_time
    WHERE o.status = 'FULFILLED'
  `;

  return new Set(firstOrders.map(o => o.id));
}

export interface GenerateReportOptions {
  /** 是否为日报模式（显示昨日全天数据） */
  isDaily?: boolean;
}

export async function generateHourlyReport(options: GenerateReportOptions = {}): Promise<HourlyReport> {
  const { isDaily = false } = options;
  const now = new Date();

  // 获取今日和昨日的时间范围
  const todayBounds = getLADayBounds(now);
  const yesterdayBounds = {
    start: new Date(todayBounds.start.getTime() - 24 * 60 * 60 * 1000),
    end: todayBounds.start,
  };

  // 日报模式：显示昨日全天数据 vs 前日全天数据
  const reportBounds = isDaily ? yesterdayBounds : todayBounds;
  const compareBounds = isDaily
    ? {
        start: new Date(yesterdayBounds.start.getTime() - 24 * 60 * 60 * 1000),
        end: yesterdayBounds.start,
      }
    : yesterdayBounds;

  // 查询数据
  const [reportUsers, compareUsers, reportOrders, compareOrders] = await Promise.all([
    db.user.findMany({
      where: { createdAt: { gte: reportBounds.start, lt: reportBounds.end } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    }),
    db.user.findMany({
      where: { createdAt: { gte: compareBounds.start, lt: compareBounds.end } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    }),
    db.order.findMany({
      where: {
        status: 'FULFILLED',
        createdAt: { gte: reportBounds.start, lt: reportBounds.end },
      },
      select: { id: true, userId: true, createdAt: true, amount: true },
      orderBy: { createdAt: "asc" }
    }),
    db.order.findMany({
      where: {
        status: 'FULFILLED',
        createdAt: { gte: compareBounds.start, lt: compareBounds.end },
      },
      select: { id: true, userId: true, createdAt: true, amount: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  // 批量查询首单ID（避免 N+1）
  const allOrderUserIds = [...new Set([...reportOrders, ...compareOrders].map(o => o.userId))];
  const firstOrderIds = await getFirstOrderIds(allOrderUserIds);

  // 当前小时（LA时间）
  const currentHourLA = isDaily
    ? 23 // 日报显示全天
    : parseInt(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));

  // 每日小时级统计
  const processHourly = (
    users: typeof reportUsers,
    orders: typeof reportOrders,
    startUTC: Date,
    maxHour: number
  ): HourlyMetrics[] => {
    const result: HourlyMetrics[] = [];
    const map = new Map<number, { registered: number; firstOrder: number; otherOrder: number; gmv: number }>();

    for (let h = 0; h < 24; h++) map.set(h, { registered: 0, firstOrder: 0, otherOrder: 0, gmv: 0 });

    // 统计注册
    for (const user of users) {
      const h = parseInt(user.createdAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
      map.get(h)!.registered++;
    }

    // 统计订单 & GMV
    for (const order of orders) {
      const h = parseInt(order.createdAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
      const stats = map.get(h)!;
      stats.gmv += order.amount;

      if (firstOrderIds.has(order.id)) {
        stats.firstOrder++;
      } else {
        stats.otherOrder++;
      }
    }

    for (let h = 0; h < 24; h++) {
      const stats = map.get(h)!;
      if (h > maxHour) continue;

      result.push({
        hour: new Date(startUTC.getTime() + h * 3600000),
        registered: stats.registered,
        paid: stats.firstOrder + stats.otherOrder,
        gmv: stats.gmv,
        firstOrderCount: stats.firstOrder,
        repurchaseCount: stats.otherOrder,
        newRate: stats.registered > 0 ? (stats.firstOrder / stats.registered) * 100 : 0,
      });
    }
    return result;
  };

  const reportHourly = processHourly(reportUsers, reportOrders, reportBounds.start, currentHourLA);
  const compareHourly = processHourly(compareUsers, compareOrders, compareBounds.start, 23);

  // 计算报告期累计
  const reportFirstOrders = reportOrders.filter(o => firstOrderIds.has(o.id)).length;
  const reportOtherOrders = reportOrders.length - reportFirstOrders;
  const reportGMV = reportOrders.reduce((sum, o) => sum + o.amount, 0);

  // 计算对比期同期累计（截止到同一小时）
  const compareOrdersAtSameTime = compareOrders.filter(o => {
    const h = parseInt(o.createdAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
    return h <= currentHourLA;
  });
  const compareUsersAtSameTime = compareUsers.filter(u => {
    const h = parseInt(u.createdAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
    return h <= currentHourLA;
  });
  const compareFirstOrdersAtSameTime = compareOrdersAtSameTime.filter(o => firstOrderIds.has(o.id)).length;
  const compareOtherOrdersAtSameTime = compareOrdersAtSameTime.length - compareFirstOrdersAtSameTime;

  // 获取当前小时和昨日同小时的数据
  const lastCompleteHour = isDaily ? 23 : (currentHourLA > 0 ? currentHourLA - 1 : 0);
  const currentHourMetrics = reportHourly.find(m => {
    const h = parseInt(m.hour.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
    return h === lastCompleteHour;
  }) ?? null;
  const yesterdaySameHourMetrics = compareHourly.find(m => {
    const h = parseInt(m.hour.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
    return h === lastCompleteHour;
  }) ?? null;

  return {
    reportTime: now,
    todayTotal: {
      registered: reportUsers.length,
      paid: reportOrders.length,
      gmv: reportGMV,
      firstOrderCount: reportFirstOrders,
      repurchaseCount: reportOtherOrders,
      newRate: reportUsers.length > 0 ? (reportFirstOrders / reportUsers.length) * 100 : 0,
    },
    yesterdayTotalAtSameTime: {
      registered: compareUsersAtSameTime.length,
      paid: compareOrdersAtSameTime.length,
      gmv: compareOrdersAtSameTime.reduce((sum, o) => sum + o.amount, 0),
      firstOrderCount: compareFirstOrdersAtSameTime,
      repurchaseCount: compareOtherOrdersAtSameTime,
      newRate: compareUsersAtSameTime.length > 0 ? (compareFirstOrdersAtSameTime / compareUsersAtSameTime.length) * 100 : 0,
    },
    currentHourMetrics,
    yesterdaySameHourMetrics,
    todayHourly: reportHourly,
    yesterdayHourly: compareHourly,
  };
}
