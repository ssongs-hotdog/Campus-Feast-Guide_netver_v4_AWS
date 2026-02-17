import type {
  AccessControlSnapshot,
  AdminScope,
  AdminUserStatus,
  PermissionGroup,
  RolePreset,
  SecurityPolicies,
} from "../data/accessControlModels";
import {
  createCustomRole,
  getAccessControlSnapshot,
  getRecentUserActivities,
  inviteAdminUser,
  resendOrCancelInvite,
  reviewAccessRequest,
  updateRoleMeta,
  updateRolePermissions,
  updateSecurityPolicies,
  updateUserRole,
  updateUserScope,
  updateUserStatus,
} from "../data/accessControlStore";
import type { AuditEvent } from "../data/opsModels";

function simulateLatency<T>(payload: T, delay = 240): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(payload), delay);
  });
}

export async function fetchAccessControlSnapshot(): Promise<AccessControlSnapshot> {
  const snapshot = await getAccessControlSnapshot();
  return simulateLatency(snapshot, 320);
}

export async function inviteAdmin(input: {
  name: string;
  email: string;
  roleId: string;
  scope: AdminScope;
  actorEmail: string;
}): Promise<void> {
  await inviteAdminUser(input);
  await simulateLatency(undefined, 220);
}

export async function changeUserRole(input: {
  userId: string;
  roleId: string;
  actorEmail: string;
}): Promise<void> {
  await updateUserRole(input);
  await simulateLatency(undefined, 180);
}

export async function changeUserScope(input: {
  userId: string;
  scope: AdminScope;
  actorEmail: string;
}): Promise<void> {
  await updateUserScope(input);
  await simulateLatency(undefined, 180);
}

export async function changeUserStatus(input: {
  userId: string;
  status: AdminUserStatus;
  actorEmail: string;
}): Promise<void> {
  await updateUserStatus(input);
  await simulateLatency(undefined, 200);
}

export async function handleInviteAction(input: {
  userId: string;
  action: "resend" | "cancel";
  actorEmail: string;
}): Promise<void> {
  await resendOrCancelInvite(input);
  await simulateLatency(undefined, 180);
}

export async function createRole(input: {
  name: string;
  description: string;
  actorEmail: string;
}): Promise<RolePreset> {
  const role = await createCustomRole(input);
  return simulateLatency(role, 180);
}

export async function updateRolePermissionGroups(input: {
  roleId: string;
  permissionGroups: PermissionGroup[];
  actorEmail: string;
}): Promise<void> {
  await updateRolePermissions(input);
  await simulateLatency(undefined, 200);
}

export async function updateRoleInformation(input: {
  roleId: string;
  name: string;
  description: string;
  actorEmail: string;
}): Promise<void> {
  await updateRoleMeta(input);
  await simulateLatency(undefined, 180);
}

export async function reviewRequest(input: {
  requestId: string;
  decision: "approved" | "rejected";
  reviewerMemo?: string;
  actorEmail: string;
}): Promise<void> {
  await reviewAccessRequest(input);
  await simulateLatency(undefined, 220);
}

export async function updatePolicies(input: {
  policies: SecurityPolicies;
  actorEmail: string;
}): Promise<void> {
  await updateSecurityPolicies(input);
  await simulateLatency(undefined, 200);
}

export async function fetchUserRecentActivities(
  userEmail: string,
  limit = 10
): Promise<AuditEvent[]> {
  const rows = await getRecentUserActivities(userEmail, limit);
  return simulateLatency(rows, 160);
}
