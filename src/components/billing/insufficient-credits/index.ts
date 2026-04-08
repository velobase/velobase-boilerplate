// Re-export all components from the insufficient-credits module
export { StandardFlow } from './flows/standard-flow';
export { TrialEndedFlow } from './flows/trial-ended-flow';
export { IpLimitFlow } from './flows/ip-limit-flow';

export { MicroHeader } from './shared/micro-header';
export { SpecialCaseHeader } from './shared/special-case-header';
export { CreditsGapStatusBar } from './shared/credits-gap-status-bar';

export { useUpgradeStrategy } from './hooks/use-upgrade-strategy';
export type { UserTier, PlanType } from './hooks/use-upgrade-strategy';

