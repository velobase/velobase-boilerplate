/**
 * Conversion Alert Types
 */

export interface HourlyMetrics {
  hour: Date;
  registered: number;
  paid: number;
  gmv: number; // GMV (分)
  firstOrderCount: number;
  repurchaseCount: number;
  newRate: number;
}

export interface HourlyReport {
  reportTime: Date;
  todayTotal: {
    registered: number;
    paid: number;
    gmv: number;
    firstOrderCount: number;
    repurchaseCount: number;
    newRate: number;
  };
  yesterdayTotalAtSameTime: {
    registered: number;
    paid: number;
    gmv: number;
    firstOrderCount: number;
    repurchaseCount: number;
    newRate: number;
  };
  /** 当前小时（或日报时为昨日最后一小时）的数据 */
  currentHourMetrics: HourlyMetrics | null;
  /** 昨日同小时的数据 */
  yesterdaySameHourMetrics: HourlyMetrics | null;
  todayHourly: HourlyMetrics[];
  yesterdayHourly: HourlyMetrics[];
}

// Chart data types for VChart
export interface BarDataItem {
  hour: string;
  category: string;
  value: number;
}

export interface LineDataItem {
  hour: string;
  category: string;
  value: number;
  labelStr: string;
}

