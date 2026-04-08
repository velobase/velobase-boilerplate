/**
 * Build Lark Card
 * 
 * 图表 Spec 与卡片构建逻辑
 */
import type { LarkCard } from "@/lib/lark";
import type { HourlyReport, BarDataItem, LineDataItem, HourlyMetrics } from "./types";

const formatDate = (date: Date) =>
  date.toLocaleString("zh-CN", { timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });

const formatMoney = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const getGrowthData = (curr: number, prev: number) => {
  if (prev === 0) {
    if (curr > 0) return { text: "+∞", color: "green" };
    return { text: "-", color: "grey" };
  }
  const rate = ((curr - prev) / prev) * 100;
  const color = rate >= 0 ? "green" : "red";
  const text = `${rate >= 0 ? '+' : ''}${rate.toFixed(0)}%`;
  return { text, color };
};

function prepareChartData(report: HourlyReport) {
  const hourlyData: HourlyMetrics[] = [];
  const funnelBarData: BarDataItem[] = [];
  const funnelLineData: LineDataItem[] = [];
  const revenueBarData: BarDataItem[] = [];

  for (const stat of report.todayHourly) {
    const h = parseInt(stat.hour.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
    const hourStr = `${h.toString().padStart(2, '0')}:00`;

    hourlyData.push(stat);

    const rateVal = Math.round(stat.newRate * 10) / 10;
    funnelBarData.push({ hour: hourStr, category: '注册用户', value: stat.registered });
    funnelBarData.push({ hour: hourStr, category: '首单用户', value: stat.firstOrderCount });
    funnelLineData.push({
      hour: hourStr,
      category: '转化率%',
      value: rateVal,
      labelStr: `${rateVal}%`
    });

    revenueBarData.push({ hour: hourStr, category: '首单(新客)', value: stat.firstOrderCount });
    revenueBarData.push({ hour: hourStr, category: '复购(老客)', value: stat.repurchaseCount });
  }

  return { hourlyData, funnelBarData, funnelLineData, revenueBarData };
}

function buildFunnelChartSpec(funnelBarData: BarDataItem[], funnelLineData: LineDataItem[]) {
  return {
    type: "common",
    title: { text: "拉新效率 (注册 vs 首单 & 转化率)", textStyle: { fontSize: 14 } },
    data: [
      { id: "barData", values: funnelBarData },
      { id: "lineData", values: funnelLineData }
    ],
    series: [
      {
        type: "bar",
        dataId: "barData",
        xField: ["hour", "category"],
        yField: "value",
        seriesField: "category",
        bar: {
          style: {
            fill: (datum: BarDataItem) => datum.category === '注册用户' ? '#3370ff' : '#00b42a',
            fillOpacity: (datum: BarDataItem) => datum.category === '注册用户' ? 0.6 : 1
          }
        }
      },
      {
        type: "line",
        dataId: "lineData",
        xField: "hour",
        yField: "value",
        seriesField: "category",
        smooth: true,
        line: { style: { stroke: "#ff8800", lineWidth: 2 } },
        point: { visible: false },
        label: {
          visible: true,
          position: "top",
          style: { fill: "#ff8800", fontSize: 10 },
          formatter: "{value}%"
        }
      }
    ],
    axes: [
      { orient: "left", type: "linear", title: { visible: true, text: "人数" }, min: 0 },
      { orient: "right", type: "linear", title: { visible: true, text: "转化%" }, min: 0, grid: { visible: false } },
      {
        orient: "bottom",
        type: "band",
        label: {
          autoRotate: false,
          visible: true,
          formatMethod: (val: string) => val.includes(':') ? val : ''
        }
      }
    ],
    legends: { visible: true, orient: "bottom" }
  };
}

function buildRevenueChartSpec(revenueBarData: BarDataItem[]) {
  return {
    type: "common",
    title: { text: "营收构成 (首单 vs 复购)", textStyle: { fontSize: 14 } },
    data: [{ id: "data", values: revenueBarData }],
    series: [
      {
        type: "bar",
        xField: ["hour", "category"],
        yField: "value",
        seriesField: "category",
        bar: {
          style: {
            fill: (datum: BarDataItem) => datum.category === '首单(新客)' ? '#00b42a' : '#722ed1'
          }
        }
      }
    ],
    axes: [
      { orient: "left", type: "linear", title: { visible: true, text: "订单数" }, min: 0 },
      {
        orient: "bottom",
        type: "band",
        label: {
          autoRotate: false,
          formatMethod: (val: string) => val.includes(':') ? val : ''
        }
      }
    ],
    legends: { visible: true, orient: "bottom" }
  };
}

export interface BuildCardOptions {
  /** 是否为日报（00:00 发送） */
  isDaily?: boolean;
}

export function buildMetricsCard(report: HourlyReport, options: BuildCardOptions = {}): LarkCard {
  const { isDaily = false } = options;

  // 累计同比
  const gmvGrowth = getGrowthData(report.todayTotal.gmv, report.yesterdayTotalAtSameTime.gmv);
  const orderGrowth = getGrowthData(report.todayTotal.paid, report.yesterdayTotalAtSameTime.paid);
  const regGrowth = getGrowthData(report.todayTotal.registered, report.yesterdayTotalAtSameTime.registered);
  const firstOrderGrowth = getGrowthData(report.todayTotal.firstOrderCount, report.yesterdayTotalAtSameTime.firstOrderCount);
  const newRateGrowth = getGrowthData(report.todayTotal.newRate, report.yesterdayTotalAtSameTime.newRate);

  // 小时同比（当前小时 vs 昨日同小时）
  const curr = report.currentHourMetrics;
  const prev = report.yesterdaySameHourMetrics;
  const hourGmvGrowth = curr && prev ? getGrowthData(curr.gmv, prev.gmv) : { text: "-", color: "grey" };
  const hourOrderGrowth = curr && prev ? getGrowthData(curr.paid, prev.paid) : { text: "-", color: "grey" };
  const hourRegGrowth = curr && prev ? getGrowthData(curr.registered, prev.registered) : { text: "-", color: "grey" };
  const hourFirstOrderGrowth = curr && prev ? getGrowthData(curr.firstOrderCount, prev.firstOrderCount) : { text: "-", color: "grey" };
  const hourNewRateGrowth = curr && prev ? getGrowthData(curr.newRate, prev.newRate) : { text: "-", color: "grey" };

  // 小时标签
  let hourLabel = "上小时";
  if (curr) {
    const h = parseInt(curr.hour.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric" }));
    hourLabel = `${h.toString().padStart(2, '0')}:00`;
  }

  // 日报模式下的标题调整
  const titlePrefix = isDaily ? "📅 日报" : "📊 营收看板";
  const totalLabel = isDaily ? "昨日累计" : "今日累计";
  const compareLabel = isDaily ? "vs前日" : "vs昨日";

  const tableRows = [
    {
      metric: "💰 GMV",
      hour_value: curr ? formatMoney(curr.gmv) : '-',
      hour_growth: [hourGmvGrowth],
      total_value: formatMoney(report.todayTotal.gmv),
      total_growth: [gmvGrowth]
    },
    {
      metric: "📦 订单",
      hour_value: curr ? String(curr.paid) : '-',
      hour_growth: [hourOrderGrowth],
      total_value: String(report.todayTotal.paid),
      total_growth: [orderGrowth]
    },
    {
      metric: "👥 注册",
      hour_value: curr ? String(curr.registered) : '-',
      hour_growth: [hourRegGrowth],
      total_value: String(report.todayTotal.registered),
      total_growth: [regGrowth]
    },
    {
      metric: "🆕 首单",
      hour_value: curr ? String(curr.firstOrderCount) : '-',
      hour_growth: [hourFirstOrderGrowth],
      total_value: String(report.todayTotal.firstOrderCount),
      total_growth: [firstOrderGrowth]
    },
    {
      metric: "📈 转化",
      hour_value: curr ? curr.newRate.toFixed(1) + '%' : '-',
      hour_growth: [hourNewRateGrowth],
      total_value: report.todayTotal.newRate.toFixed(1) + '%',
      total_growth: [newRateGrowth]
    }
  ];

  const { funnelBarData, funnelLineData, revenueBarData } = prepareChartData(report);

  const chartFunnelSpec = buildFunnelChartSpec(funnelBarData, funnelLineData);
  const chartRevenueSpec = buildRevenueChartSpec(revenueBarData);

  return {
    config: { wide_screen_mode: true },
    header: {
      template: isDaily ? "green" : "blue",
      title: {
        tag: "plain_text",
        content: `${titlePrefix} ${formatDate(report.reportTime)} (LA)`,
      },
    },
    elements: [
      {
        tag: "table",
        page_size: 5,
        header_style: {
          text_align: "center",
          text_size: "normal",
          background_style: "grey"
        },
        columns: [
          { name: "metric", display_name: "指标", data_type: "text", align: "left", width: "auto" },
          { name: "hour_value", display_name: hourLabel, data_type: "text", align: "right", width: "auto" },
          { name: "hour_growth", display_name: "同比", data_type: "options", align: "right", width: "auto" },
          { name: "total_value", display_name: totalLabel, data_type: "text", align: "right", width: "auto" },
          { name: "total_growth", display_name: compareLabel, data_type: "options", align: "right", width: "auto" }
        ],
        rows: tableRows
      },
      { tag: "hr" },
      {
        tag: "markdown",
        content: "**📉 拉新效率 (注册 vs 首单)**"
      },
      {
        tag: "chart",
        chart_spec: chartFunnelSpec,
        height: "auto",
      },
      {
        tag: "markdown",
        content: "**💰 营收构成 (首单 vs 复购)**"
      },
      {
        tag: "chart",
        chart_spec: chartRevenueSpec,
        height: "auto",
      },
      { tag: "hr" },
      {
        tag: "note",
        elements: [{ tag: "plain_text", content: `GMV单位: USD | 时间: 洛杉矶时间 | 同比: vs ${isDaily ? '前日' : '昨日'}同期` }]
      }
    ],
  };
}
