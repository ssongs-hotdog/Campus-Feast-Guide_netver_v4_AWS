import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, UserPlus, UserRoundCog } from "lucide-react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import type {
  AccessRequest,
  AdminScope,
  AdminUser,
  AdminUserStatus,
  PermissionGroup,
  RolePreset,
  ScopeType,
  SecurityPolicies,
} from "../data/accessControlModels";
import {
  PERMISSION_GROUP_DESCRIPTIONS,
  PERMISSION_GROUP_LABELS,
  SCOPE_LABELS,
  USER_STATUS_LABELS,
} from "../data/accessControlModels";
import { CORNERS, RESTAURANTS } from "../data/mock_canonical";
import {
  changeUserRole,
  changeUserScope,
  changeUserStatus,
  createRole,
  fetchAccessControlSnapshot,
  fetchUserRecentActivities,
  handleInviteAction,
  inviteAdmin,
  reviewRequest,
  updatePolicies,
  updateRoleInformation,
  updateRolePermissionGroups,
} from "../lib/accessControlApi";
import type { AuditEvent } from "../data/opsModels";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const ACTOR_EMAIL = "admin@hyeat.com";

type SensitiveKind = "change_role" | "change_status" | "approve" | "reject";

function formatDateTime(value?: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function scopeLabel(scope: AdminScope): string {
  if (scope.type === "all") return "전체";
  if (scope.type === "restaurant") {
    const restaurant = RESTAURANTS.find((r) => r.id === scope.restaurantId);
    return `식당:${restaurant?.name ?? scope.restaurantId ?? "-"}`;
  }
  const restaurant = RESTAURANTS.find((r) => r.id === scope.restaurantId);
  const corner = CORNERS.find((c) => c.id === scope.cornerId);
  return `코너:${restaurant?.name ?? "-"} / ${corner?.name ?? scope.cornerId ?? "-"}`;
}

function statusTone(status: AdminUserStatus): string {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function requestTone(status: AccessRequest["status"]): string {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function isEscalation(currentRole: RolePreset | undefined, nextRole: RolePreset | undefined): boolean {
  if (!currentRole || !nextRole || currentRole.id === nextRole.id) return false;
  const current = new Set(currentRole.permissionGroups);
  return nextRole.permissionGroups.some((item) => !current.has(item));
}

export default function AdminAccountsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RolePreset[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [policyDraft, setPolicyDraft] = useState<SecurityPolicies>({
    requireSensitiveActionConfirm: true,
    inactiveAutoLockDays: 30,
    twoFactorPolicy: "recommended",
    sessionTimeoutMinutes: 60,
  });

  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteDraft, setInviteDraft] = useState({
    name: "",
    email: "",
    roleId: "report_viewer",
    scopeType: "all" as ScopeType,
    restaurantId: "all",
    cornerId: "all",
  });

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userRoleDraft, setUserRoleDraft] = useState("");
  const [userScopeDraft, setUserScopeDraft] = useState<AdminScope>({ type: "all" });
  const [userActivities, setUserActivities] = useState<AuditEvent[]>([]);
  const [userActivitiesLoading, setUserActivitiesLoading] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [roleDescriptionDraft, setRoleDescriptionDraft] = useState("");
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleDraft, setNewRoleDraft] = useState({ name: "", description: "" });

  const [targetRequest, setTargetRequest] = useState<AccessRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [decisionMemo, setDecisionMemo] = useState("");

  const [sensitiveKind, setSensitiveKind] = useState<SensitiveKind | null>(null);
  const [sensitiveTitle, setSensitiveTitle] = useState("");
  const [sensitiveDescription, setSensitiveDescription] = useState("");
  const [sensitiveText, setSensitiveText] = useState("");

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const selectedRole = useMemo(
    () => roles.find((item) => item.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  const reload = async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await fetchAccessControlSnapshot();
      setUsers(snapshot.users);
      setRoles(snapshot.roles);
      setRequests(snapshot.requests);
      setPolicyDraft(snapshot.policies);
      if (!selectedRoleId && snapshot.roles.length > 0) setSelectedRoleId(snapshot.roles[0].id);
      setLastUpdated(new Date());
    } catch {
      setError("관리자 권한 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    setRoleNameDraft(selectedRole.name);
    setRoleDescriptionDraft(selectedRole.description);
  }, [selectedRole?.id]);

  useEffect(() => {
    if (!selectedUser) return;
    setUserRoleDraft(selectedUser.roleId);
    setUserScopeDraft({ ...selectedUser.scope });
    setUserActivitiesLoading(true);
    fetchUserRecentActivities(selectedUser.email, 10)
      .then((rows) => setUserActivities(rows))
      .catch(() => setUserActivities([]))
      .finally(() => setUserActivitiesLoading(false));
  }, [selectedUser?.id]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.roleId !== roleFilter) return false;
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (scopeFilter !== "all" && user.scope.type !== scopeFilter) return false;
      if (!keyword) return true;
      return `${user.name} ${user.email}`.toLowerCase().includes(keyword);
    });
  }, [users, roleFilter, statusFilter, scopeFilter, search]);

  const roleUseCount = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => map.set(u.roleId, (map.get(u.roleId) ?? 0) + 1));
    return map;
  }, [users]);

  const inviteCorners = useMemo(() => {
    if (inviteDraft.restaurantId === "all") return CORNERS;
    return CORNERS.filter((item) => item.restaurantId === inviteDraft.restaurantId);
  }, [inviteDraft.restaurantId]);

  const userCorners = useMemo(() => {
    if (!userScopeDraft.restaurantId) return CORNERS;
    return CORNERS.filter((item) => item.restaurantId === userScopeDraft.restaurantId);
  }, [userScopeDraft.restaurantId]);

  const openSensitive = (kind: SensitiveKind, title: string, description: string) => {
    setSensitiveKind(kind);
    setSensitiveTitle(title);
    setSensitiveDescription(description);
    setSensitiveText("");
  };

  const closeSensitive = () => {
    setSensitiveKind(null);
    setSensitiveText("");
  };

  const submitInvite = async () => {
    if (!inviteDraft.name.trim() || !inviteDraft.email.trim()) {
      toast({ title: "입력 확인", description: "이름과 이메일을 입력해 주세요.", variant: "destructive" });
      return;
    }
    const scope: AdminScope =
      inviteDraft.scopeType === "all"
        ? { type: "all" }
        : inviteDraft.scopeType === "restaurant"
          ? { type: "restaurant", restaurantId: inviteDraft.restaurantId === "all" ? undefined : inviteDraft.restaurantId }
          : {
              type: "corner",
              restaurantId: inviteDraft.restaurantId === "all" ? undefined : inviteDraft.restaurantId,
              cornerId: inviteDraft.cornerId === "all" ? undefined : inviteDraft.cornerId,
            };
    try {
      await inviteAdmin({
        name: inviteDraft.name.trim(),
        email: inviteDraft.email.trim(),
        roleId: inviteDraft.roleId,
        scope,
        actorEmail: ACTOR_EMAIL,
      });
      await reload();
      setInviteOpen(false);
      setInviteDraft({ name: "", email: "", roleId: "report_viewer", scopeType: "all", restaurantId: "all", cornerId: "all" });
      toast({ title: "관리자 초대 완료", description: "Pending 상태로 등록되었습니다." });
    } catch (e: any) {
      toast({ title: "초대 실패", description: e.message ?? "다시 시도해 주세요.", variant: "destructive" });
    }
  };

  const runSensitiveAction = async () => {
    if (sensitiveText !== "CONFIRM" || !sensitiveKind) return;
    try {
      if (sensitiveKind === "change_role" && selectedUser) {
        await changeUserRole({ userId: selectedUser.id, roleId: userRoleDraft, actorEmail: ACTOR_EMAIL });
      }
      if (sensitiveKind === "change_status" && selectedUser) {
        const nextStatus: AdminUserStatus = selectedUser.status === "suspended" ? "active" : "suspended";
        await changeUserStatus({ userId: selectedUser.id, status: nextStatus, actorEmail: ACTOR_EMAIL });
      }
      if ((sensitiveKind === "approve" || sensitiveKind === "reject") && targetRequest && decision) {
        await reviewRequest({
          requestId: targetRequest.id,
          decision,
          reviewerMemo: decisionMemo,
          actorEmail: ACTOR_EMAIL,
        });
        setTargetRequest(null);
        setDecision(null);
        setDecisionMemo("");
      }
      await reload();
      closeSensitive();
      toast({ title: "반영 완료", description: "변경 내역이 저장되었습니다." });
    } catch (e: any) {
      toast({ title: "처리 실패", description: e.message ?? "다시 시도해 주세요.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <AdminPageHeader
        title="관리자 계정 및 권한 관리"
        subtitle="초대, 역할, 승인, 보안 정책을 운영 관점으로 통합 관리합니다."
        lastUpdated={lastUpdated}
        onRefresh={reload}
        isLoading={loading}
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100">
          <TabsTrigger value="users">계정</TabsTrigger>
          <TabsTrigger value="roles">역할 및 권한</TabsTrigger>
          <TabsTrigger value="requests">승인 및 요청</TabsTrigger>
          <TabsTrigger value="policies">보안 & 정책</TabsTrigger>
        </TabsList>

        {loading && (
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}
        {!loading && error && (
          <Card>
            <CardContent className="pt-6 text-sm text-rose-700">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-1">
                      <div className="relative md:flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="이름/이메일 검색" />
                      </div>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="역할" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 역할</SelectItem>
                          {roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="상태" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 상태</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={scopeFilter} onValueChange={setScopeFilter}>
                        <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="범위" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 범위</SelectItem>
                          <SelectItem value="restaurant">식당</SelectItem>
                          <SelectItem value="corner">코너</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="bg-[#0E4A84] hover:bg-[#0c3f72]" onClick={() => setInviteOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-1.5" /> 관리자 초대
                    </Button>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="text-sm text-gray-500 border rounded-md py-10 text-center">계정이 없습니다.</div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>이름/이메일</TableHead>
                            <TableHead>역할</TableHead>
                            <TableHead>범위</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead>마지막 로그인</TableHead>
                            <TableHead>마지막 활동</TableHead>
                            <TableHead className="text-center">액션</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id} className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                              <TableCell>
                                <div className="font-medium text-sm">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </TableCell>
                              <TableCell className="text-sm">{roleMap.get(user.roleId)?.name ?? user.roleId}</TableCell>
                              <TableCell className="text-xs">{scopeLabel(user.scope)}</TableCell>
                              <TableCell><Badge className={statusTone(user.status)}>{USER_STATUS_LABELS[user.status]}</Badge></TableCell>
                              <TableCell className="text-xs">{formatDateTime(user.lastLoginAt)}</TableCell>
                              <TableCell className="text-xs">{formatDateTime(user.lastActivityAt)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}>보기</Button>
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}>편집</Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUser(user);
                                      openSensitive("change_status", "계정 상태 변경 재확인", "CONFIRM 입력 후 상태가 변경됩니다.");
                                    }}
                                  >
                                    비활성화
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <Card className="col-span-12 lg:col-span-4">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">역할 목록</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => setCreateRoleOpen(true)}><Plus className="w-4 h-4 mr-1" />새 역할</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        className={`w-full text-left border rounded-md p-3 ${selectedRoleId === role.id ? "border-[#0E4A84] bg-blue-50/50" : "hover:bg-gray-50"}`}
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{role.name}</span>
                          <Badge variant="outline">사용 {roleUseCount.get(role.id) ?? 0}</Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{role.isPreset ? "기본 역할" : "사용자 정의 역할"}</div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="col-span-12 lg:col-span-8">
                  {!selectedRole ? (
                    <CardContent className="pt-6 text-sm text-gray-500">역할을 선택해 주세요.</CardContent>
                  ) : (
                    <>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserRoundCog className="w-4 h-4 text-[#0E4A84]" />역할 상세 편집</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2"><Label>역할명</Label><Input value={roleNameDraft} disabled={selectedRole.isPreset} onChange={(e) => setRoleNameDraft(e.target.value)} /></div>
                          <div className="space-y-2"><Label>설명</Label><Input value={roleDescriptionDraft} disabled={selectedRole.isPreset} onChange={(e) => setRoleDescriptionDraft(e.target.value)} /></div>
                        </div>
                        {!selectedRole.isPreset && (
                          <div className="flex justify-end">
                            <Button size="sm" variant="outline" onClick={async () => {
                              await updateRoleInformation({ roleId: selectedRole.id, name: roleNameDraft, description: roleDescriptionDraft, actorEmail: ACTOR_EMAIL });
                              await reload();
                            }}>
                              역할 정보 저장
                            </Button>
                          </div>
                        )}
                        {(Object.keys(PERMISSION_GROUP_LABELS) as PermissionGroup[]).map((group) => {
                          const enabled = selectedRole.permissionGroups.includes(group);
                          return (
                            <div key={group} className="border rounded-md p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">{PERMISSION_GROUP_LABELS[group]}</div>
                                <Switch
                                  checked={enabled}
                                  disabled={selectedRole.isSystemLocked}
                                  onCheckedChange={async (next) => {
                                    const set = new Set(selectedRole.permissionGroups);
                                    if (next) set.add(group); else set.delete(group);
                                    await updateRolePermissionGroups({ roleId: selectedRole.id, permissionGroups: Array.from(set), actorEmail: ACTOR_EMAIL });
                                    await reload();
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-600 mt-1">{PERMISSION_GROUP_DESCRIPTIONS[group]}</div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">접근 요청 목록</CardTitle>
                  <CardDescription>승인/거절 처리 내역은 운영 로그와 연결됩니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <div className="text-sm text-gray-500 border rounded-md py-10 text-center">요청이 없습니다.</div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>요청자</TableHead><TableHead>요청 역할</TableHead><TableHead>사유</TableHead><TableHead>시각</TableHead><TableHead>상태</TableHead><TableHead className="text-right">처리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map((req) => (
                            <TableRow key={req.id}>
                              <TableCell><div className="text-sm font-medium">{req.requesterName}</div><div className="text-xs text-gray-500">{req.requesterEmail}</div></TableCell>
                              <TableCell className="text-sm">{roleMap.get(req.requestedRoleId)?.name ?? req.requestedRoleId}</TableCell>
                              <TableCell className="text-xs max-w-[320px]">{req.reason}</TableCell>
                              <TableCell className="text-xs">{formatDateTime(req.requestedAt)}</TableCell>
                              <TableCell><Badge className={requestTone(req.status)}>{req.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                {req.status !== "pending" ? (
                                  <span className="text-xs text-gray-500">{req.reviewedBy ?? "-"} {req.reviewedAt ? `· ${formatDateTime(req.reviewedAt)}` : ""}</span>
                                ) : (
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" onClick={() => { setTargetRequest(req); setDecision("approved"); setDecisionMemo(""); openSensitive("approve", "접근 요청 승인 재확인", "CONFIRM 입력 후 승인됩니다."); }}>승인</Button>
                                    <Button size="sm" variant="outline" onClick={() => { setTargetRequest(req); setDecision("rejected"); setDecisionMemo(""); openSensitive("reject", "접근 요청 거절 재확인", "CONFIRM 입력 후 거절됩니다."); }}>거절</Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-base">민감 작업 재확인</CardTitle></CardHeader><CardContent className="flex justify-between"><span className="text-sm">민감 작업 재확인 필수</span><Switch checked={policyDraft.requireSensitiveActionConfirm} onCheckedChange={(value) => setPolicyDraft((p) => ({ ...p, requireSensitiveActionConfirm: value }))} /></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-base">비활성 계정 자동 잠금</CardTitle></CardHeader><CardContent><Select value={String(policyDraft.inactiveAutoLockDays)} onValueChange={(value) => setPolicyDraft((p) => ({ ...p, inactiveAutoLockDays: Number(value) as 30 | 60 | 90 }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">30일</SelectItem><SelectItem value="60">60일</SelectItem><SelectItem value="90">90일</SelectItem></SelectContent></Select></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-base">2단계 인증 정책</CardTitle></CardHeader><CardContent><Select value={policyDraft.twoFactorPolicy} onValueChange={(value) => setPolicyDraft((p) => ({ ...p, twoFactorPolicy: value as SecurityPolicies["twoFactorPolicy"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recommended">권장</SelectItem><SelectItem value="required">필수</SelectItem></SelectContent></Select></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-base">세션 만료 시간</CardTitle></CardHeader><CardContent><Select value={String(policyDraft.sessionTimeoutMinutes)} onValueChange={(value) => setPolicyDraft((p) => ({ ...p, sessionTimeoutMinutes: Number(value) as 30 | 60 | 120 | 240 }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">30분</SelectItem><SelectItem value="60">60분</SelectItem><SelectItem value="120">120분</SelectItem><SelectItem value="240">240분</SelectItem></SelectContent></Select></CardContent></Card>
              </div>
              <div className="flex justify-end"><Button className="bg-[#0E4A84] hover:bg-[#0c3f72]" onClick={async () => { await updatePolicies({ policies: policyDraft, actorEmail: ACTOR_EMAIL }); await reload(); }}>정책 변경 저장</Button></div>
            </TabsContent>
          </>
        )}
      </Tabs>

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedUser.name}</SheetTitle>
                <SheetDescription>{selectedUser.email}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">기본정보</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <div>초대 시각: {formatDateTime(selectedUser.invitedAt)}</div>
                    <div>마지막 로그인: {formatDateTime(selectedUser.lastLoginAt)}</div>
                    <div>마지막 활동: {formatDateTime(selectedUser.lastActivityAt)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">역할 변경</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Select value={userRoleDraft} onValueChange={setUserRoleDraft}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => {
                        const curr = roleMap.get(selectedUser.roleId);
                        const next = roleMap.get(userRoleDraft);
                        openSensitive("change_role", "역할 변경 재확인", isEscalation(curr, next) ? "권한 상승이 포함됩니다. CONFIRM 입력 후 실행됩니다." : "CONFIRM 입력 후 역할을 변경합니다.");
                      }}
                      disabled={selectedUser.roleId === userRoleDraft}
                    >
                      역할 변경 적용
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">범위 변경</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Select value={userScopeDraft.type} onValueChange={(value) => setUserScopeDraft((prev) => ({ type: value as ScopeType, restaurantId: value === "all" ? undefined : prev.restaurantId, cornerId: value === "corner" ? prev.cornerId : undefined }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{SCOPE_LABELS.all}</SelectItem>
                        <SelectItem value="restaurant">{SCOPE_LABELS.restaurant}</SelectItem>
                        <SelectItem value="corner">{SCOPE_LABELS.corner}</SelectItem>
                      </SelectContent>
                    </Select>
                    {userScopeDraft.type !== "all" && (
                      <Select value={userScopeDraft.restaurantId ?? "all"} onValueChange={(value) => setUserScopeDraft((prev) => ({ ...prev, restaurantId: value === "all" ? undefined : value, cornerId: prev.type === "corner" ? prev.cornerId : undefined }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">식당 선택</SelectItem>
                          {RESTAURANTS.map((restaurant) => <SelectItem key={restaurant.id} value={restaurant.id}>{restaurant.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {userScopeDraft.type === "corner" && (
                      <Select value={userScopeDraft.cornerId ?? "all"} onValueChange={(value) => setUserScopeDraft((prev) => ({ ...prev, cornerId: value === "all" ? undefined : value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">코너 선택</SelectItem>
                          {userCorners.map((corner) => <SelectItem key={corner.id} value={corner.id}>{corner.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" variant="outline" onClick={async () => { await changeUserScope({ userId: selectedUser.id, scope: userScopeDraft, actorEmail: ACTOR_EMAIL }); await reload(); toast({ title: "범위 변경 완료", description: "접근 범위가 반영되었습니다." }); }}>범위 변경 저장</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">상태 변경</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Button size="sm" variant="outline" onClick={() => openSensitive("change_status", "계정 상태 변경 재확인", "CONFIRM 입력 후 상태가 변경됩니다.")}>비활성화/재활성화</Button>
                    {selectedUser.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={async () => { await handleInviteAction({ userId: selectedUser.id, action: "resend", actorEmail: ACTOR_EMAIL }); await reload(); }}>초대 재전송</Button>
                        <Button size="sm" variant="outline" onClick={async () => { await handleInviteAction({ userId: selectedUser.id, action: "cancel", actorEmail: ACTOR_EMAIL }); await reload(); setSelectedUser(null); }}>초대 취소</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">최근 운영 활동 요약</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {userActivitiesLoading ? (
                      <>
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </>
                    ) : userActivities.length === 0 ? (
                      <div className="text-xs text-gray-500">연결된 활동 이력이 없습니다.</div>
                    ) : (
                      userActivities.map((item) => (
                        <div key={item.id} className="border rounded-md p-2">
                          <div className="text-xs text-gray-500">{formatDateTime(item.timestamp)}</div>
                          <div className="text-sm font-medium">{item.eventTypeLabel}</div>
                          <div className="text-xs text-gray-600">{item.summary}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관리자 초대</DialogTitle>
            <DialogDescription>초대는 Pending 상태로 시작됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>이름</Label><Input value={inviteDraft.name} onChange={(e) => setInviteDraft((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>이메일</Label><Input value={inviteDraft.email} onChange={(e) => setInviteDraft((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Select value={inviteDraft.roleId} onValueChange={(value) => setInviteDraft((p) => ({ ...p, roleId: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>범위</Label>
              <Select value={inviteDraft.scopeType} onValueChange={(value) => setInviteDraft((p) => ({ ...p, scopeType: value as ScopeType, restaurantId: value === "all" ? "all" : p.restaurantId, cornerId: value === "corner" ? p.cornerId : "all" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{SCOPE_LABELS.all}</SelectItem>
                  <SelectItem value="restaurant">{SCOPE_LABELS.restaurant}</SelectItem>
                  <SelectItem value="corner">{SCOPE_LABELS.corner}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteDraft.scopeType !== "all" && (
              <div className="space-y-2">
                <Label>식당</Label>
                <Select value={inviteDraft.restaurantId} onValueChange={(value) => setInviteDraft((p) => ({ ...p, restaurantId: value, cornerId: "all" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">식당 선택</SelectItem>
                    {RESTAURANTS.map((restaurant) => <SelectItem key={restaurant.id} value={restaurant.id}>{restaurant.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {inviteDraft.scopeType === "corner" && (
              <div className="space-y-2">
                <Label>코너</Label>
                <Select value={inviteDraft.cornerId} onValueChange={(value) => setInviteDraft((p) => ({ ...p, cornerId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">코너 선택</SelectItem>
                    {inviteCorners.map((corner) => <SelectItem key={corner.id} value={corner.id}>{corner.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setInviteOpen(false)}>취소</Button><Button onClick={submitInvite}>초대 등록</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 역할 만들기</DialogTitle>
            <DialogDescription>운영 목적에 맞는 사용자 정의 역할을 만듭니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>역할명</Label>
              <Input value={newRoleDraft.name} onChange={(e) => setNewRoleDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea value={newRoleDraft.description} onChange={(e) => setNewRoleDraft((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoleOpen(false)}>취소</Button>
            <Button onClick={async () => {
              const created = await createRole({ name: newRoleDraft.name, description: newRoleDraft.description, actorEmail: ACTOR_EMAIL });
              await reload();
              setSelectedRoleId(created.id);
              setCreateRoleOpen(false);
              setNewRoleDraft({ name: "", description: "" });
            }}>생성</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sensitiveKind} onOpenChange={(open) => !open && closeSensitive()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {sensitiveTitle}
            </DialogTitle>
            <DialogDescription>{sensitiveDescription}</DialogDescription>
          </DialogHeader>
          {(sensitiveKind === "approve" || sensitiveKind === "reject") && (
            <div className="space-y-2">
              <Label>검토 메모</Label>
              <Textarea value={decisionMemo} onChange={(e) => setDecisionMemo(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>확인 문구</Label>
            <Input value={sensitiveText} onChange={(e) => setSensitiveText(e.target.value)} placeholder="CONFIRM" />
            <div className="text-xs text-gray-500">정확히 CONFIRM 입력 시 실행됩니다.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSensitive}>취소</Button>
            <Button disabled={sensitiveText !== "CONFIRM"} onClick={runSensitiveAction}>확정 실행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
