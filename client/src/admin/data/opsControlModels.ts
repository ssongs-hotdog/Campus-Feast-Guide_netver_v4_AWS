export type OpsStatus = "open" | "paused" | "closed";

export type OpsReasonCode =
  | "ingredient_out"
  | "equipment_check"
  | "staff_shortage"
  | "safety_issue"
  | "other";

export type OpsActionType =
  | "status_close"
  | "status_resume"
  | "status_pause"
  | "soldout_on"
  | "soldout_off";

export interface CornerOpsState {
  restaurantId: string;
  cornerId: string;
  status: OpsStatus;
  soldOut: boolean;
  updatedAt: string;
  updatedBy?: string;
  reasonCode: OpsReasonCode;
  memo?: string;
}

export interface OpsActionEvent {
  id: string;
  ts: string;
  restaurantId: string;
  cornerId: string;
  actionType: OpsActionType;
  before: Pick<CornerOpsState, "status" | "soldOut">;
  after: Pick<CornerOpsState, "status" | "soldOut">;
  reasonCode: OpsReasonCode;
  memo?: string;
  scope: "today";
  actor?: string;
}

export const OPS_REASON_LABELS: Record<OpsReasonCode, string> = {
  ingredient_out: "재료 소진",
  equipment_check: "조리/설비 점검",
  staff_shortage: "인력 부족",
  safety_issue: "위생/안전 이슈",
  other: "기타(직접 입력)",
};

export const OPS_STATUS_LABELS: Record<OpsStatus, string> = {
  open: "운영중",
  paused: "임시휴식",
  closed: "강제마감",
};
