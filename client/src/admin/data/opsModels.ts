export type EventCategory =
  | "menu"
  | "notice"
  | "banner"
  | "payment_qr"
  | "review_quality"
  | "auth_account"
  | "other";

export type SeverityLevel = "info" | "warn" | "critical";

export type EventResult = "success" | "failed" | "partial";

export type ScopeType = "all" | "restaurant" | "corner";

export type PeriodPreset = "today" | "this_week" | "last_week" | "custom";

export interface AuditDiffEntry {
  key: string;
  before: string;
  after: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventTypeLabel: string;
  category: EventCategory;
  severity: SeverityLevel;
  targetLabel: string;
  summary: string;
  actor: string;
  result: EventResult;
  detail: string;
  diff: AuditDiffEntry[];
  relatedPath?: string;
  memo?: string;
  incidentId?: string;
  restaurantId?: string;
  cornerId?: string;
}

export interface HealthSignal {
  id: string;
  title: string;
  status: "normal" | "warning" | "outage";
  summary: string;
  lastUpdated: string;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
  trend24h: number[];
  trend7d: number[];
  impactScope: string[];
  recommendation: string;
  incidentId?: string;
}

export interface IncidentAction {
  id: string;
  author: string;
  createdAt: string;
  note: string;
}

export interface Incident {
  id: string;
  status: "ongoing" | "resolved";
  severity: SeverityLevel;
  startedAt: string;
  resolvedAt?: string;
  impactScope: string[];
  userImpact: string;
  summary: string;
  owner?: string;
  linkedEventIds: string[];
  actions: IncidentAction[];
  preventionChecklist: string[];
}

export interface FilterState {
  period: PeriodPreset;
  customStart?: string;
  customEnd?: string;
  scopeType: ScopeType;
  restaurantId: string;
  cornerId: string;
  category: EventCategory | "all";
  severity: SeverityLevel | "all";
  actor: string;
  keyword: string;
}

export interface SavedView {
  id: string;
  name: string;
  filter: FilterState;
  createdAt: string;
}

export interface OpsSnapshot {
  auditEvents: AuditEvent[];
  healthSignals: HealthSignal[];
  incidents: Incident[];
  savedViews: SavedView[];
}

export interface CreateIncidentInput {
  summary: string;
  impactScope: string[];
  userImpact: string;
  severity: SeverityLevel;
  owner?: string;
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  menu: "메뉴",
  notice: "공지",
  banner: "배너",
  payment_qr: "결제·QR",
  review_quality: "리뷰·품질",
  auth_account: "권한·계정",
  other: "기타",
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  info: "정보",
  warn: "주의",
  critical: "중요",
};

export const RESULT_LABELS: Record<EventResult, string> = {
  success: "성공",
  failed: "실패",
  partial: "부분",
};

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "오늘",
  this_week: "이번주",
  last_week: "지난주",
  custom: "커스텀",
};
