import type { AuditDiffEntry, AuditEvent, SeverityLevel } from "./opsModels";
import { appendAuditEvent, getOpsSnapshot } from "./opsStore";
import type {
  AccessControlSnapshot,
  AccessRequest,
  AdminScope,
  AdminUser,
  AdminUserStatus,
  PermissionGroup,
  RolePreset,
  SecurityPolicies,
} from "./accessControlModels";
import { ROLE_PRESET_SEED } from "./accessControlModels";
import { CORNERS, RESTAURANTS } from "./mock_canonical";

const KEY_USERS = "hyeat_admin_users_v1";
const KEY_ROLES = "hyeat_admin_roles_v1";
const KEY_REQUESTS = "hyeat_admin_access_requests_v1";
const KEY_POLICIES = "hyeat_admin_security_policies_v1";

interface InviteInput {
  name: string;
  email: string;
  roleId: string;
  scope: AdminScope;
  actorEmail: string;
}

interface ReviewRequestInput {
  requestId: string;
  decision: "approved" | "rejected";
  reviewerMemo?: string;
  actorEmail: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function cloneScope(scope: AdminScope): AdminScope {
  return {
    type: scope.type,
    restaurantId: scope.restaurantId,
    cornerId: scope.cornerId,
  };
}

function makeMockUsers(): AdminUser[] {
  return [
    {
      id: "USR-001",
      name: "김관리",
      email: "admin@hyeat.com",
      roleId: "super_admin",
      scope: { type: "all" },
      status: "active",
      invitedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
    {
      id: "USR-002",
      name: "박현장",
      email: "ops01@hanyang.ac.kr",
      roleId: "ops_manager",
      scope: { type: "restaurant", restaurantId: "hanyang_plaza" },
      status: "active",
      invitedAt: new Date(Date.now() - 86400000 * 16).toISOString(),
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
      id: "USR-003",
      name: "이콘텐츠",
      email: "content.lead@hyeat.com",
      roleId: "content_manager",
      scope: { type: "all" },
      status: "active",
      invitedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 62).toISOString(),
    },
    {
      id: "USR-004",
      name: "최메뉴",
      email: "menu.pm@hyeat.com",
      roleId: "menu_manager",
      scope: { type: "restaurant", restaurantId: "materials" },
      status: "suspended",
      invitedAt: new Date(Date.now() - 86400000 * 35).toISOString(),
      lastLoginAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      lastActivityAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: "USR-005",
      name: "정신규",
      email: "new.ops@hanyang.ac.kr",
      roleId: "report_viewer",
      scope: { type: "corner", restaurantId: "life_science", cornerId: "dam_a_lunch" },
      status: "pending",
      invitedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      lastLoginAt: undefined,
      lastActivityAt: undefined,
    },
  ];
}

function makeMockRequests(): AccessRequest[] {
  return [
    {
      id: "REQ-1001",
      requesterName: "박현장",
      requesterEmail: "ops01@hanyang.ac.kr",
      targetUserId: "USR-002",
      requestedRoleId: "super_admin",
      reason: "야간 긴급 장애 대응 시 계정 잠금 해제를 즉시 처리할 필요가 있습니다.",
      requestedAt: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
      status: "pending",
    },
    {
      id: "REQ-1002",
      requesterName: "정신규",
      requesterEmail: "new.ops@hanyang.ac.kr",
      targetUserId: "USR-005",
      requestedRoleId: "ops_manager",
      reason: "신입 운영자 온보딩 완료로 현장 운영 권한이 필요합니다.",
      requestedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      status: "pending",
    },
  ];
}

function makePolicies(): SecurityPolicies {
  return {
    requireSensitiveActionConfirm: true,
    inactiveAutoLockDays: 30,
    twoFactorPolicy: "recommended",
    sessionTimeoutMinutes: 60,
  };
}

function ensureSeeded(): void {
  const users = readJson<AdminUser[]>(KEY_USERS, []);
  if (users.length > 0) return;

  writeJson(KEY_USERS, makeMockUsers());
  writeJson(KEY_ROLES, ROLE_PRESET_SEED);
  writeJson(KEY_REQUESTS, makeMockRequests());
  writeJson(KEY_POLICIES, makePolicies());
}

function formatScopeLabel(scope: AdminScope): string {
  if (scope.type === "all") return "전체";
  if (scope.type === "restaurant") {
    const restaurant = RESTAURANTS.find((item) => item.id === scope.restaurantId);
    return `식당:${restaurant?.name ?? scope.restaurantId ?? "-"}`;
  }
  const restaurant = RESTAURANTS.find((item) => item.id === scope.restaurantId);
  const corner = CORNERS.find((item) => item.id === scope.cornerId);
  return `코너:${restaurant?.name ?? "-"} / ${corner?.name ?? scope.cornerId ?? "-"}`;
}

async function recordAccountAuditEvent(params: {
  actorEmail: string;
  targetLabel: string;
  summary: string;
  detail: string;
  diff?: AuditDiffEntry[];
  severity?: SeverityLevel;
  result?: "success" | "failed" | "partial";
}): Promise<void> {
  const timestamp = new Date().toISOString();
  const event: AuditEvent = {
    id: `AUD-${Date.now().toString().slice(-8)}-AC`,
    timestamp,
    eventTypeLabel: "권한/계정 변경",
    category: "auth_account",
    severity: params.severity ?? "warn",
    targetLabel: params.targetLabel,
    summary: params.summary,
    actor: params.actorEmail,
    result: params.result ?? "success",
    detail: params.detail,
    diff: params.diff ?? [],
    relatedPath: "/admin/admins",
  };
  await appendAuditEvent(event);
}

function writeUsers(users: AdminUser[]): void {
  writeJson(KEY_USERS, users);
}

function writeRoles(roles: RolePreset[]): void {
  writeJson(KEY_ROLES, roles);
}

function writeRequests(requests: AccessRequest[]): void {
  writeJson(KEY_REQUESTS, requests);
}

function writePolicies(policies: SecurityPolicies): void {
  writeJson(KEY_POLICIES, policies);
}

export async function getAccessControlSnapshot(): Promise<AccessControlSnapshot> {
  ensureSeeded();
  return {
    users: readJson<AdminUser[]>(KEY_USERS, []),
    roles: readJson<RolePreset[]>(KEY_ROLES, ROLE_PRESET_SEED),
    requests: readJson<AccessRequest[]>(KEY_REQUESTS, []),
    policies: readJson<SecurityPolicies>(KEY_POLICIES, makePolicies()),
  };
}

export async function inviteAdminUser(input: InviteInput): Promise<void> {
  ensureSeeded();
  const users = readJson<AdminUser[]>(KEY_USERS, []);
  const exists = users.find((item) => item.email.toLowerCase() === input.email.toLowerCase());
  if (exists) {
    throw new Error("이미 등록된 이메일입니다.");
  }

  const user: AdminUser = {
    id: `USR-${Date.now().toString().slice(-6)}`,
    name: input.name,
    email: input.email.toLowerCase(),
    roleId: input.roleId,
    scope: cloneScope(input.scope),
    status: "pending",
    invitedAt: new Date().toISOString(),
    lastLoginAt: undefined,
    lastActivityAt: undefined,
  };
  writeUsers([user, ...users]);
  await recordAccountAuditEvent({
    actorEmail: input.actorEmail,
    targetLabel: `${user.name} (${user.email})`,
    summary: "관리자 계정을 초대했습니다.",
    detail: `역할:${input.roleId}, 범위:${formatScopeLabel(input.scope)}`,
    diff: [
      { key: "status", before: "-", after: "pending" },
      { key: "role", before: "-", after: input.roleId },
      { key: "scope", before: "-", after: formatScopeLabel(input.scope) },
    ],
    severity: "info",
  });
}

export async function updateUserRole(params: {
  userId: string;
  roleId: string;
  actorEmail: string;
}): Promise<void> {
  ensureSeeded();
  const users = readJson<AdminUser[]>(KEY_USERS, []);
  const target = users.find((item) => item.id === params.userId);
  if (!target) throw new Error("사용자를 찾을 수 없습니다.");
  if (target.roleId === params.roleId) return;

  const updated = users.map((item) =>
    item.id === params.userId ? { ...item, roleId: params.roleId, lastActivityAt: new Date().toISOString() } : item
  );
  writeUsers(updated);
  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: `${target.name} (${target.email})`,
    summary: "관리자 역할을 변경했습니다.",
    detail: `${target.roleId} -> ${params.roleId}`,
    diff: [{ key: "role", before: target.roleId, after: params.roleId }],
  });
}

export async function updateUserScope(params: {
  userId: string;
  scope: AdminScope;
  actorEmail: string;
}): Promise<void> {
  ensureSeeded();
  const users = readJson<AdminUser[]>(KEY_USERS, []);
  const target = users.find((item) => item.id === params.userId);
  if (!target) throw new Error("사용자를 찾을 수 없습니다.");

  const before = formatScopeLabel(target.scope);
  const after = formatScopeLabel(params.scope);
  if (before === after) return;

  const updated = users.map((item) =>
    item.id === params.userId ? { ...item, scope: cloneScope(params.scope), lastActivityAt: new Date().toISOString() } : item
  );
  writeUsers(updated);
  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: `${target.name} (${target.email})`,
    summary: "접근 범위를 변경했습니다.",
    detail: `${before} -> ${after}`,
    diff: [{ key: "scope", before, after }],
  });
}

export async function updateUserStatus(params: {
  userId: string;
  status: AdminUserStatus;
  actorEmail: string;
}): Promise<void> {
  ensureSeeded();
  const users = readJson<AdminUser[]>(KEY_USERS, []);
  const target = users.find((item) => item.id === params.userId);
  if (!target) throw new Error("사용자를 찾을 수 없습니다.");
  if (target.status === params.status) return;

  const now = new Date().toISOString();
  const updated = users.map((item) =>
    item.id === params.userId
      ? {
          ...item,
          status: params.status,
          lastActivityAt: now,
          lastLoginAt: params.status === "active" && !item.lastLoginAt ? now : item.lastLoginAt,
        }
      : item
  );
  writeUsers(updated);

  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: `${target.name} (${target.email})`,
    summary: "계정 상태를 변경했습니다.",
    detail: `${target.status} -> ${params.status}`,
    diff: [{ key: "status", before: target.status, after: params.status }],
    severity: params.status === "suspended" ? "critical" : "warn",
  });
}

export async function resendOrCancelInvite(params: {
  userId: string;
  action: "resend" | "cancel";
  actorEmail: string;
}): Promise<void> {
  ensureSeeded();
  const users = readJson<AdminUser[]>(KEY_USERS, []);
  const target = users.find((item) => item.id === params.userId);
  if (!target || target.status !== "pending") throw new Error("대기중인 초대만 처리할 수 있습니다.");

  if (params.action === "resend") {
    const next = users.map((item) =>
      item.id === params.userId ? { ...item, invitedAt: new Date().toISOString() } : item
    );
    writeUsers(next);
    await recordAccountAuditEvent({
      actorEmail: params.actorEmail,
      targetLabel: `${target.name} (${target.email})`,
      summary: "초대 메일을 재전송했습니다.",
      detail: "Pending 계정 초대를 재발송 처리했습니다.",
      severity: "info",
    });
    return;
  }

  writeUsers(users.filter((item) => item.id !== params.userId));
  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: `${target.name} (${target.email})`,
    summary: "초대를 취소했습니다.",
    detail: "Pending 계정을 조직에서 제거했습니다.",
    severity: "warn",
  });
}

export async function createCustomRole(params: {
  name: string;
  description: string;
  actorEmail: string;
}): Promise<RolePreset> {
  ensureSeeded();
  const roles = readJson<RolePreset[]>(KEY_ROLES, ROLE_PRESET_SEED);
  const role: RolePreset = {
    id: `custom_${Date.now().toString().slice(-7)}`,
    name: params.name.trim(),
    description: params.description.trim(),
    isPreset: false,
    permissionGroups: [],
  };
  writeRoles([role, ...roles]);
  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: role.name,
    summary: "사용자 정의 역할을 생성했습니다.",
    detail: role.description || "설명 없음",
    severity: "info",
  });
  return role;
}

export async function updateRolePermissions(params: {
  roleId: string;
  permissionGroups: PermissionGroup[];
  actorEmail: string;
}): Promise<void> {
  ensureSeeded();
  const roles = readJson<RolePreset[]>(KEY_ROLES, ROLE_PRESET_SEED);
  const target = roles.find((item) => item.id === params.roleId);
  if (!target) throw new Error("역할을 찾을 수 없습니다.");
  if (target.isSystemLocked) throw new Error("슈퍼 관리자 역할은 수정할 수 없습니다.");

  const afterGroups = Array.from(new Set(params.permissionGroups));
  const updated = roles.map((item) =>
    item.id === params.roleId ? { ...item, permissionGroups: afterGroups } : item
  );
  writeRoles(updated);
  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: target.name,
    summary: "역할 권한 구성을 변경했습니다.",
    detail: `${target.permissionGroups.join(", ")} -> ${afterGroups.join(", ")}`,
    diff: [{ key: "permissionGroups", before: target.permissionGroups.join(","), after: afterGroups.join(",") }],
  });
}

export async function updateRoleMeta(params: {
  roleId: string;
  name: string;
  description: string;
  actorEmail: string;
}): Promise<void> {
  ensureSeeded();
  const roles = readJson<RolePreset[]>(KEY_ROLES, ROLE_PRESET_SEED);
  const target = roles.find((item) => item.id === params.roleId);
  if (!target) throw new Error("역할을 찾을 수 없습니다.");
  if (target.isPreset) throw new Error("기본 역할의 이름/설명은 변경할 수 없습니다.");

  const updated = roles.map((item) =>
    item.id === params.roleId ? { ...item, name: params.name.trim(), description: params.description.trim() } : item
  );
  writeRoles(updated);
  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: target.name,
    summary: "역할 정보를 수정했습니다.",
    detail: "역할명/설명을 변경했습니다.",
    diff: [
      { key: "name", before: target.name, after: params.name.trim() },
      { key: "description", before: target.description, after: params.description.trim() },
    ],
  });
}

export async function reviewAccessRequest(input: ReviewRequestInput): Promise<void> {
  ensureSeeded();
  const requests = readJson<AccessRequest[]>(KEY_REQUESTS, []);
  const users = readJson<AdminUser[]>(KEY_USERS, []);
  const targetRequest = requests.find((item) => item.id === input.requestId);
  if (!targetRequest) throw new Error("요청 정보를 찾을 수 없습니다.");
  if (targetRequest.status !== "pending") throw new Error("이미 처리된 요청입니다.");

  const now = new Date().toISOString();
  const nextRequests: AccessRequest[] = requests.map((item) =>
    item.id === input.requestId
      ? {
          ...item,
          status: input.decision,
          reviewerMemo: input.reviewerMemo?.trim(),
          reviewedAt: now,
          reviewedBy: input.actorEmail,
        }
      : item
  );
  writeRequests(nextRequests);

  if (input.decision === "approved") {
    const nextUsers: AdminUser[] = users.map((user) =>
      user.id === targetRequest.targetUserId
        ? { ...user, roleId: targetRequest.requestedRoleId, status: "active" as const, lastActivityAt: now }
        : user
    );
    writeUsers(nextUsers);
  }

  await recordAccountAuditEvent({
    actorEmail: input.actorEmail,
    targetLabel: `${targetRequest.requesterName} (${targetRequest.requesterEmail})`,
    summary: `접근 요청을 ${input.decision === "approved" ? "승인" : "거절"}했습니다.`,
    detail: targetRequest.reason,
    diff: [
      { key: "requestStatus", before: "pending", after: input.decision },
      { key: "requestedRole", before: "-", after: targetRequest.requestedRoleId },
    ],
    severity: input.decision === "approved" ? "warn" : "info",
  });
}

export async function updateSecurityPolicies(params: {
  policies: SecurityPolicies;
  actorEmail: string;
}): Promise<void> {
  ensureSeeded();
  const current = readJson<SecurityPolicies>(KEY_POLICIES, makePolicies());
  writePolicies(params.policies);

  await recordAccountAuditEvent({
    actorEmail: params.actorEmail,
    targetLabel: "보안 정책",
    summary: "보안 정책 구성을 변경했습니다.",
    detail: "민감 작업 재확인, 자동 잠금, 2단계 인증, 세션 만료 정책이 갱신되었습니다.",
    diff: [
      {
        key: "sensitiveConfirm",
        before: String(current.requireSensitiveActionConfirm),
        after: String(params.policies.requireSensitiveActionConfirm),
      },
      {
        key: "autoLockDays",
        before: String(current.inactiveAutoLockDays),
        after: String(params.policies.inactiveAutoLockDays),
      },
      {
        key: "twoFactor",
        before: current.twoFactorPolicy,
        after: params.policies.twoFactorPolicy,
      },
      {
        key: "sessionTimeout",
        before: String(current.sessionTimeoutMinutes),
        after: String(params.policies.sessionTimeoutMinutes),
      },
    ],
  });
}

export async function getRecentUserActivities(userEmail: string, limit = 10): Promise<AuditEvent[]> {
  const snapshot = await getOpsSnapshot();
  const directMatch = snapshot.auditEvents
    .filter((event) => event.actor.toLowerCase() === userEmail.toLowerCase())
    .slice(0, limit);

  if (directMatch.length > 0) return directMatch;
  return snapshot.auditEvents
    .filter((event) => event.category === "auth_account")
    .slice(0, limit);
}
