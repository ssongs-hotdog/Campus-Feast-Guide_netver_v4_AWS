export type AdminUserStatus = "pending" | "active" | "suspended";

export type ScopeType = "all" | "restaurant" | "corner";

export type PermissionGroup =
  | "menu_manage"
  | "notice_manage"
  | "banner_manage"
  | "report_view"
  | "ops_log_view"
  | "system_status_view"
  | "account_manage";

export type TwoFactorPolicy = "recommended" | "required";

export interface AdminScope {
  type: ScopeType;
  restaurantId?: string;
  cornerId?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  scope: AdminScope;
  status: AdminUserStatus;
  invitedAt?: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
}

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
  isSystemLocked?: boolean;
  permissionGroups: PermissionGroup[];
}

export interface AccessRequest {
  id: string;
  requesterName: string;
  requesterEmail: string;
  targetUserId: string;
  requestedRoleId: string;
  reason: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewerMemo?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface SecurityPolicies {
  requireSensitiveActionConfirm: boolean;
  inactiveAutoLockDays: 30 | 60 | 90;
  twoFactorPolicy: TwoFactorPolicy;
  sessionTimeoutMinutes: 30 | 60 | 120 | 240;
}

export interface AccessControlSnapshot {
  users: AdminUser[];
  roles: RolePreset[];
  requests: AccessRequest[];
  policies: SecurityPolicies;
}

export const ROLE_PRESET_SEED: RolePreset[] = [
  {
    id: "super_admin",
    name: "슈퍼 관리자",
    description: "학교 총괄 권한. 모든 기능 접근 및 승인 가능",
    isPreset: true,
    isSystemLocked: true,
    permissionGroups: [
      "menu_manage",
      "notice_manage",
      "banner_manage",
      "report_view",
      "ops_log_view",
      "system_status_view",
      "account_manage",
    ],
  },
  {
    id: "ops_manager",
    name: "운영 관리자",
    description: "현장 총괄. 메뉴/공지/배너/운영 제어 담당",
    isPreset: true,
    permissionGroups: [
      "menu_manage",
      "notice_manage",
      "banner_manage",
      "report_view",
      "ops_log_view",
      "system_status_view",
    ],
  },
  {
    id: "content_manager",
    name: "콘텐츠 관리자",
    description: "공지/배너 발행 및 일정 운영 담당",
    isPreset: true,
    permissionGroups: ["notice_manage", "banner_manage", "report_view"],
  },
  {
    id: "menu_manager",
    name: "메뉴 관리자",
    description: "식단 편성/수정과 노출 품질 점검 담당",
    isPreset: true,
    permissionGroups: ["menu_manage", "report_view"],
  },
  {
    id: "report_viewer",
    name: "리포트 뷰어",
    description: "성과 리포트/운영로그/상태 모니터링 전용",
    isPreset: true,
    permissionGroups: ["report_view", "ops_log_view", "system_status_view"],
  },
];

export const USER_STATUS_LABELS: Record<AdminUserStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
};

export const SCOPE_LABELS: Record<ScopeType, string> = {
  all: "전체",
  restaurant: "식당",
  corner: "코너",
};

export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
  menu_manage: "메뉴 관리",
  notice_manage: "공지 관리",
  banner_manage: "배너 관리",
  report_view: "리포트 보기",
  ops_log_view: "운영 로그 보기",
  system_status_view: "시스템 상태 보기",
  account_manage: "계정/권한 관리",
};

export const PERMISSION_GROUP_DESCRIPTIONS: Record<PermissionGroup, string> = {
  menu_manage: "식단 등록/수정/임시중단/노출 상태 변경을 수행합니다.",
  notice_manage: "공지 작성/발행/회수/대상 범위 설정을 수행합니다.",
  banner_manage: "배너 업로드/노출 스케줄/우선순위 조정을 수행합니다.",
  report_view: "성과 지표, 만족도, 혼잡 분석 리포트를 조회합니다.",
  ops_log_view: "운영 이력/감사 로그/사건 대응 기록을 조회합니다.",
  system_status_view: "모니터링 상태판 및 경보 상태를 확인합니다.",
  account_manage: "관리자 초대, 역할/범위 부여, 승인 처리를 수행합니다.",
};
