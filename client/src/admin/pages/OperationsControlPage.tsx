import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock3,
  PauseCircle,
  PlayCircle,
  PowerOff,
  RotateCw,
  Search,
  Settings2,
  XCircle,
} from "lucide-react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { RESTAURANTS, CORNERS } from "../data/mock_canonical";
import type {
  CornerOpsState,
  OpsActionEvent,
  OpsReasonCode,
  OpsStatus,
} from "../data/opsControlModels";
import {
  OPS_REASON_LABELS,
  OPS_STATUS_LABELS,
} from "../data/opsControlModels";
import {
  appendOpsEvent,
  getOpsStates,
  getRecentOpsEvents,
  setCornerSoldOut,
  setCornerStatus,
} from "../lib/opsControlApi";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type StatusFilter = "all" | OpsStatus | "soldout";

interface CornerRow {
  key: string;
  restaurantId: string;
  restaurantName: string;
  cornerId: string;
  cornerName: string;
  state: CornerOpsState;
}

interface ConfirmDraft {
  kind: "status" | "soldout";
  targets: CornerRow[];
  nextStatus?: OpsStatus;
  nextSoldOut?: boolean;
  reasonCode: OpsReasonCode;
  memo: string;
  otherReasonText: string;
}

const DEFAULT_REASON: OpsReasonCode = "ingredient_out";
const ACTOR_EMAIL = "admin@hyeat.com";

function kstDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function kstTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function statusTone(status: OpsStatus): string {
  if (status === "open") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "paused") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function soldOutTone(soldOut: boolean): string {
  return soldOut
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-slate-100 text-slate-700 border-slate-200";
}

function previewNotice(state: CornerOpsState): string {
  if (state.status === "closed") {
    return "현재 코너는 오늘 운영이 종료되었습니다. 이용에 불편을 드려 죄송합니다.";
  }
  if (state.status === "paused") {
    return "현재 코너는 임시 휴식 중입니다. 잠시 후 재개됩니다.";
  }
  if (state.soldOut) {
    return "현재 코너는 재료 소진으로 품절되었습니다. 다른 코너를 이용해 주세요.";
  }
  return "현재 코너는 정상 운영 중입니다.";
}

function actionLabelFromStatus(status: OpsStatus): string {
  if (status === "closed") return "강제마감";
  if (status === "paused") return "임시휴식";
  return "재개";
}

function eventActionLabel(actionType: OpsActionEvent["actionType"]): string {
  if (actionType === "status_close") return "강제마감";
  if (actionType === "status_pause") return "임시휴식";
  if (actionType === "status_resume") return "재개";
  if (actionType === "soldout_on") return "품절 ON";
  return "품절 OFF";
}

function withOtherReason(reasonCode: OpsReasonCode, otherReasonText: string, memo: string): string {
  if (reasonCode !== "other") return memo.trim();
  const extra = otherReasonText.trim();
  const base = memo.trim();
  if (!extra) return base;
  return base ? `${extra} | ${base}` : extra;
}

export default function OperationsControlPage() {
  const { toast } = useToast();

  const [states, setStates] = useState<CornerOpsState[]>([]);
  const [events, setEvents] = useState<OpsActionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [restaurantFilter, setRestaurantFilter] = useState<string>("all");
  const [cornerFilter, setCornerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const [confirmDraft, setConfirmDraft] = useState<ConfirmDraft | null>(null);
  const [applying, setApplying] = useState(false);

  const [drawerStatusReasonCode, setDrawerStatusReasonCode] = useState<OpsReasonCode>(DEFAULT_REASON);
  const [drawerStatusMemo, setDrawerStatusMemo] = useState("");
  const [drawerStatusOther, setDrawerStatusOther] = useState("");
  const [drawerSoldReasonCode, setDrawerSoldReasonCode] = useState<OpsReasonCode>(DEFAULT_REASON);
  const [drawerSoldMemo, setDrawerSoldMemo] = useState("");
  const [drawerSoldOther, setDrawerSoldOther] = useState("");
  const [drawerSoldOutDraft, setDrawerSoldOutDraft] = useState(false);

  const restaurantNameMap = useMemo(() => {
    return Object.fromEntries(RESTAURANTS.map((r) => [r.id, r.name]));
  }, []);

  const stateMap = useMemo(() => {
    return new Map(states.map((row) => [`${row.restaurantId}:${row.cornerId}`, row]));
  }, [states]);

  const allRows = useMemo<CornerRow[]>(() => {
    return CORNERS.map((corner) => {
      const key = `${corner.restaurantId}:${corner.id}`;
      const fallback: CornerOpsState = {
        restaurantId: corner.restaurantId,
        cornerId: corner.id,
        status: "open",
        soldOut: false,
        updatedAt: new Date().toISOString(),
        updatedBy: ACTOR_EMAIL,
        reasonCode: "other",
      };
      return {
        key,
        restaurantId: corner.restaurantId,
        restaurantName: restaurantNameMap[corner.restaurantId] ?? corner.restaurantId,
        cornerId: corner.id,
        cornerName: corner.name,
        state: stateMap.get(key) ?? fallback,
      };
    }).sort((a, b) => {
      if (a.restaurantName !== b.restaurantName) return a.restaurantName.localeCompare(b.restaurantName);
      return a.cornerName.localeCompare(b.cornerName);
    });
  }, [restaurantNameMap, stateMap]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (restaurantFilter !== "all" && row.restaurantId !== restaurantFilter) return false;
      if (cornerFilter !== "all" && row.cornerId !== cornerFilter) return false;
      if (statusFilter === "open" || statusFilter === "paused" || statusFilter === "closed") {
        if (row.state.status !== statusFilter) return false;
      }
      if (statusFilter === "soldout" && !row.state.soldOut) return false;
      if (term.length > 0) {
        const hay = `${row.restaurantName} ${row.cornerName}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allRows, restaurantFilter, cornerFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const open = allRows.filter((row) => row.state.status === "open").length;
    const paused = allRows.filter((row) => row.state.status === "paused").length;
    const closed = allRows.filter((row) => row.state.status === "closed").length;
    const soldOut = allRows.filter((row) => row.state.soldOut).length;
    return { open, paused, closed, soldOut };
  }, [allRows]);

  const attentionBadges = useMemo(() => {
    const badges: string[] = [];
    if (summary.closed > 0) badges.push(`주의 상태: 강제마감 ${summary.closed}`);
    if (summary.soldOut > 0) badges.push(`주의 상태: 품절 ${summary.soldOut}`);
    return badges;
  }, [summary.closed, summary.soldOut]);

  const cornerOptions = useMemo(() => {
    if (restaurantFilter === "all") return CORNERS;
    return CORNERS.filter((corner) => corner.restaurantId === restaurantFilter);
  }, [restaurantFilter]);

  const detailRow = useMemo(() => {
    if (!detailKey) return null;
    return allRows.find((row) => row.key === detailKey) ?? null;
  }, [allRows, detailKey]);

  const detailEvents = useMemo(() => {
    if (!detailRow) return [];
    return events
      .filter(
        (event) =>
          event.restaurantId === detailRow.restaurantId &&
          event.cornerId === detailRow.cornerId
      )
      .slice(0, 3);
  }, [detailRow, events]);

  const selectedRows = useMemo(() => {
    const keySet = selectedRowKeys;
    return allRows.filter((row) => keySet.has(row.key));
  }, [allRows, selectedRowKeys]);

  const visibleKeys = useMemo(() => filteredRows.map((row) => row.key), [filteredRows]);
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedRowKeys.has(key));
  const someVisibleSelected =
    !allVisibleSelected && visibleKeys.some((key) => selectedRowKeys.has(key));

  const load = async (showRefreshing = false) => {
    try {
      setError(null);
      if (!showRefreshing) setLoading(true);
      if (showRefreshing) setRefreshing(true);
      const [nextStates, nextEvents] = await Promise.all([getOpsStates(), getRecentOpsEvents(300)]);
      setStates(nextStates);
      setEvents(nextEvents);
      setLastUpdated(new Date());
    } catch {
      setError("운영 제어 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      load(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  useEffect(() => {
    if (cornerFilter === "all") return;
    const valid = cornerOptions.some((corner) => corner.id === cornerFilter);
    if (!valid) setCornerFilter("all");
  }, [cornerFilter, cornerOptions]);

  useEffect(() => {
    if (!detailRow) return;
    setDrawerSoldOutDraft(detailRow.state.soldOut);
  }, [detailRow]);

  const openConfirm = (draft: ConfirmDraft) => {
    setConfirmDraft(draft);
  };

  const openStatusConfirm = (
    targets: CornerRow[],
    nextStatus: OpsStatus,
    prefill?: { reasonCode: OpsReasonCode; memo: string; otherReasonText: string }
  ) => {
    openConfirm({
      kind: "status",
      targets,
      nextStatus,
      reasonCode: prefill?.reasonCode ?? DEFAULT_REASON,
      memo: prefill?.memo ?? "",
      otherReasonText: prefill?.otherReasonText ?? "",
    });
  };

  const openSoldOutConfirm = (
    targets: CornerRow[],
    nextSoldOut: boolean,
    prefill?: { reasonCode: OpsReasonCode; memo: string; otherReasonText: string }
  ) => {
    openConfirm({
      kind: "soldout",
      targets,
      nextSoldOut,
      reasonCode: prefill?.reasonCode ?? DEFAULT_REASON,
      memo: prefill?.memo ?? "",
      otherReasonText: prefill?.otherReasonText ?? "",
    });
  };

  const handleResetFilters = () => {
    setRestaurantFilter("all");
    setCornerFilter("all");
    setStatusFilter("all");
    setSearch("");
    setSelectedRowKeys(new Set());
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    const next = new Set(selectedRowKeys);
    if (checked) {
      visibleKeys.forEach((key) => next.add(key));
    } else {
      visibleKeys.forEach((key) => next.delete(key));
    }
    setSelectedRowKeys(next);
  };

  const toggleRowSelection = (key: string, checked: boolean) => {
    const next = new Set(selectedRowKeys);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    setSelectedRowKeys(next);
  };

  const applyConfirm = async () => {
    if (!confirmDraft) return;
    if (confirmDraft.targets.length === 0) return;
    if (confirmDraft.reasonCode === "other" && confirmDraft.otherReasonText.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "사유를 입력해 주세요",
        description: "기타 사유를 선택한 경우 직접 입력이 필요합니다.",
      });
      return;
    }

    const memo = withOtherReason(
      confirmDraft.reasonCode,
      confirmDraft.otherReasonText,
      confirmDraft.memo
    );

    let successCount = 0;
    let failCount = 0;
    setApplying(true);

    for (const row of confirmDraft.targets) {
      try {
        if (confirmDraft.kind === "status" && confirmDraft.nextStatus) {
          const result = await setCornerStatus({
            restaurantId: row.restaurantId,
            cornerId: row.cornerId,
            status: confirmDraft.nextStatus,
            reasonCode: confirmDraft.reasonCode,
            memo,
            actor: ACTOR_EMAIL,
          });
          await appendOpsEvent({
            restaurantId: row.restaurantId,
            cornerId: row.cornerId,
            actionType:
              confirmDraft.nextStatus === "closed"
                ? "status_close"
                : confirmDraft.nextStatus === "paused"
                  ? "status_pause"
                  : "status_resume",
            before: { status: result.before.status, soldOut: result.before.soldOut },
            after: { status: result.after.status, soldOut: result.after.soldOut },
            reasonCode: confirmDraft.reasonCode,
            memo,
            actor: ACTOR_EMAIL,
          });
        }

        if (confirmDraft.kind === "soldout" && typeof confirmDraft.nextSoldOut === "boolean") {
          const result = await setCornerSoldOut({
            restaurantId: row.restaurantId,
            cornerId: row.cornerId,
            soldOut: confirmDraft.nextSoldOut,
            reasonCode: confirmDraft.reasonCode,
            memo,
            actor: ACTOR_EMAIL,
          });
          await appendOpsEvent({
            restaurantId: row.restaurantId,
            cornerId: row.cornerId,
            actionType: confirmDraft.nextSoldOut ? "soldout_on" : "soldout_off",
            before: { status: result.before.status, soldOut: result.before.soldOut },
            after: { status: result.after.status, soldOut: result.after.soldOut },
            reasonCode: confirmDraft.reasonCode,
            memo,
            actor: ACTOR_EMAIL,
          });
        }
        successCount += 1;
      } catch {
        failCount += 1;
      }
    }

    await load(true);
    setApplying(false);
    setConfirmDraft(null);

    if (successCount > 0 && failCount === 0) {
      toast({
        title: "적용 완료(오늘만)",
        description: `${successCount}개 코너에 반영되었습니다.`,
      });
    } else if (successCount > 0 && failCount > 0) {
      toast({
        variant: "destructive",
        title: "부분 반영",
        description: `${successCount}개 성공, ${failCount}개 실패했습니다. 실패 항목은 다시 시도해 주세요.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "반영 실패",
        description: "일시 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const actionFilterChips = useMemo(() => {
    const chips: string[] = [];
    chips.push(restaurantFilter === "all" ? "전체 식당" : restaurantNameMap[restaurantFilter] ?? "전체 식당");
    if (cornerFilter !== "all") {
      const cornerName = CORNERS.find((corner) => corner.id === cornerFilter)?.name;
      chips.push(cornerName ?? "코너");
    }
    if (statusFilter === "open") chips.push("운영중");
    if (statusFilter === "paused") chips.push("임시휴식");
    if (statusFilter === "closed") chips.push("강제마감");
    if (statusFilter === "soldout") chips.push("품절");
    if (search.trim().length > 0) chips.push(`검색: ${search.trim()}`);
    return chips;
  }, [cornerFilter, restaurantFilter, restaurantNameMap, search, statusFilter]);

  if (error && !loading) {
    return (
      <div className="space-y-4 pb-8">
        <AdminPageHeader
          title="운영 제어"
          subtitle="오늘 운영 상태를 즉시 조정하고 품절/휴식을 반영합니다."
          lastUpdated={lastUpdated}
          onRefresh={() => load(true)}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          isLoading={refreshing}
        />
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-sm text-gray-600">{error}</p>
            <Button variant="outline" onClick={() => load()}>
              재시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <AdminPageHeader
        title="운영 제어"
        subtitle="오늘 운영 상태를 즉시 조정하고 품절/휴식을 반영합니다."
        lastUpdated={lastUpdated}
        onRefresh={() => load(true)}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        isLoading={refreshing}
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-800">오늘 {kstDateLabel(new Date())}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {attentionBadges.map((label) => (
                    <Badge key={label} variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs text-gray-500">운영중</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{summary.open}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs text-gray-500">임시휴식</p>
                  <p className="text-lg font-semibold text-amber-700 mt-1">{summary.paused}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs text-gray-500">강제마감</p>
                  <p className="text-lg font-semibold text-rose-700 mt-1">{summary.closed}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs text-gray-500">품절</p>
                  <p className="text-lg font-semibold text-rose-700 mt-1">{summary.soldOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">식당</Label>
                  <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="식당 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {RESTAURANTS.map((restaurant) => (
                        <SelectItem key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">코너</Label>
                  <Select value={cornerFilter} onValueChange={setCornerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="코너 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {cornerOptions.map((corner) => (
                        <SelectItem key={`${corner.restaurantId}:${corner.id}`} value={corner.id}>
                          {corner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">상태</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="open">운영중</SelectItem>
                      <SelectItem value="paused">임시휴식</SelectItem>
                      <SelectItem value="closed">강제마감</SelectItem>
                      <SelectItem value="soldout">품절</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">검색</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="코너명/식당명"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {actionFilterChips.map((chip) => (
                    <Badge key={chip} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      {chip}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedRows.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-blue-900 font-medium">{selectedRows.length}개 코너 선택됨</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openStatusConfirm(selectedRows, "closed")}
                  >
                    일괄 강제마감
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openStatusConfirm(selectedRows, "open")}
                  >
                    일괄 재개
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSoldOutConfirm(selectedRows, true)}
                  >
                    일괄 품절 ON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSoldOutConfirm(selectedRows, false)}
                  >
                    일괄 품절 OFF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {filteredRows.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-center px-4">
                  <XCircle className="w-9 h-9 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-700">조건에 맞는 코너가 없습니다</p>
                  <p className="text-xs text-gray-500 mt-1">필터를 초기화하거나 검색어를 조정해 주세요.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="w-[48px]">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => toggleSelectAllVisible(checked === true)}
                          aria-label="전체 선택"
                        />
                      </TableHead>
                      <TableHead>식당</TableHead>
                      <TableHead>코너</TableHead>
                      <TableHead>현재 상태</TableHead>
                      <TableHead>품절</TableHead>
                      <TableHead>마지막 변경</TableHead>
                      <TableHead className="text-right">Quick Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const canClose = row.state.status === "open" || row.state.status === "paused";
                      const canResume = row.state.status === "closed" || row.state.status === "paused";
                      const canPause = row.state.status === "open";
                      const isSelected = selectedRowKeys.has(row.key);
                      return (
                        <TableRow key={row.key}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleRowSelection(row.key, checked === true)}
                              aria-label={`${row.cornerName} 선택`}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{row.restaurantName}</TableCell>
                          <TableCell className="font-medium text-gray-900">{row.cornerName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-medium", statusTone(row.state.status))}>
                              {OPS_STATUS_LABELS[row.state.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-medium", soldOutTone(row.state.soldOut))}>
                              {row.state.soldOut ? "품절" : "정상"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {kstTimeLabel(row.state.updatedAt)}
                            <span className="text-gray-400 ml-1">
                              {row.state.updatedBy ? `· ${row.state.updatedBy}` : ""}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStatusConfirm([row], "closed")}
                                disabled={!canClose}
                                className="h-8 px-2.5"
                              >
                                강제마감
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStatusConfirm([row], "open")}
                                disabled={!canResume}
                                className="h-8 px-2.5"
                              >
                                재개
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStatusConfirm([row], "paused")}
                                disabled={!canPause}
                                className="h-8 px-2.5"
                              >
                                임시휴식
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSoldOutConfirm([row], !row.state.soldOut)}
                                className="h-8 px-2.5"
                              >
                                품절 토글
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setDetailKey(row.key)}
                                className="h-8 px-2.5"
                              >
                                상세
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!confirmDraft} onOpenChange={(open) => !open && setConfirmDraft(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>변경 적용 확인</DialogTitle>
            <DialogDescription>민감 조치는 사유 입력 후 오늘만 즉시 반영됩니다.</DialogDescription>
          </DialogHeader>
          {confirmDraft && (
            <div className="space-y-4">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="font-medium text-gray-900">
                  {confirmDraft.kind === "status" && confirmDraft.nextStatus
                    ? `${actionLabelFromStatus(confirmDraft.nextStatus)} 적용`
                    : `${confirmDraft.nextSoldOut ? "품절 ON" : "품절 OFF"} 적용`}
                </p>
                <p className="mt-1 text-xs text-gray-600">적용 범위: 오늘만(Override)</p>
                <p className="mt-1 text-xs text-gray-600">대상: {confirmDraft.targets.length}개 코너</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {confirmDraft.targets.slice(0, 6).map((target) => (
                    <Badge key={target.key} variant="outline" className="bg-white">
                      {target.cornerName}
                    </Badge>
                  ))}
                  {confirmDraft.targets.length > 6 && (
                    <Badge variant="outline" className="bg-white">
                      +{confirmDraft.targets.length - 6}개
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>사유 (필수)</Label>
                <Select
                  value={confirmDraft.reasonCode}
                  onValueChange={(value) =>
                    setConfirmDraft((prev) => (prev ? { ...prev, reasonCode: value as OpsReasonCode } : prev))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="사유 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingredient_out">재료 소진</SelectItem>
                    <SelectItem value="equipment_check">조리/설비 점검</SelectItem>
                    <SelectItem value="staff_shortage">인력 부족</SelectItem>
                    <SelectItem value="safety_issue">위생/안전 이슈</SelectItem>
                    <SelectItem value="other">기타(직접 입력)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {confirmDraft.reasonCode === "other" && (
                <div className="space-y-2">
                  <Label>기타 사유 입력 (필수)</Label>
                  <Input
                    value={confirmDraft.otherReasonText}
                    onChange={(e) =>
                      setConfirmDraft((prev) =>
                        prev ? { ...prev, otherReasonText: e.target.value } : prev
                      )
                    }
                    placeholder="예: 내부 일정으로 임시 운영 조정"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>메모 (선택)</Label>
                <Textarea
                  value={confirmDraft.memo}
                  onChange={(e) =>
                    setConfirmDraft((prev) => (prev ? { ...prev, memo: e.target.value } : prev))
                  }
                  placeholder="운영팀 공유 메모를 입력해 주세요."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDraft(null)} disabled={applying}>
              취소
            </Button>
            <Button onClick={applyConfirm} disabled={applying}>
              {applying ? (
                <>
                  <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                  적용 중
                </>
              ) : (
                "적용"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detailRow} onOpenChange={(open) => !open && setDetailKey(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailRow && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>코너 상세 제어</SheetTitle>
                <SheetDescription>
                  {detailRow.restaurantName} · {detailRow.cornerName}
                </SheetDescription>
              </SheetHeader>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">{detailRow.restaurantName}</p>
                      <p className="text-base font-semibold text-gray-900">{detailRow.cornerName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("font-medium", statusTone(detailRow.state.status))}>
                        {OPS_STATUS_LABELS[detailRow.state.status]}
                      </Badge>
                      <Badge variant="outline" className={cn("font-medium", soldOutTone(detailRow.state.soldOut))}>
                        {detailRow.state.soldOut ? "품절" : "정상"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    마지막 변경 {kstTimeLabel(detailRow.state.updatedAt)}
                    {detailRow.state.updatedBy ? ` · ${detailRow.state.updatedBy}` : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-900">상태 변경</p>
                    <Badge variant="outline" className="text-xs bg-slate-50">오늘만 적용</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>사유 (필수)</Label>
                    <Select
                      value={drawerStatusReasonCode}
                      onValueChange={(value) => setDrawerStatusReasonCode(value as OpsReasonCode)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="사유 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OPS_REASON_LABELS).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {drawerStatusReasonCode === "other" && (
                    <div className="space-y-2">
                      <Label>기타 사유 입력 (필수)</Label>
                      <Input
                        value={drawerStatusOther}
                        onChange={(e) => setDrawerStatusOther(e.target.value)}
                        placeholder="기타 사유를 입력해 주세요."
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>메모 (선택)</Label>
                    <Textarea
                      value={drawerStatusMemo}
                      onChange={(e) => setDrawerStatusMemo(e.target.value)}
                      placeholder="상태 변경 메모"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() =>
                        openStatusConfirm([detailRow], "closed", {
                          reasonCode: drawerStatusReasonCode,
                          memo: drawerStatusMemo,
                          otherReasonText: drawerStatusOther,
                        })
                      }
                      disabled={detailRow.state.status === "closed"}
                    >
                      <PowerOff className="w-4 h-4 mr-1.5" />
                      강제마감
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        openStatusConfirm([detailRow], "open", {
                          reasonCode: drawerStatusReasonCode,
                          memo: drawerStatusMemo,
                          otherReasonText: drawerStatusOther,
                        })
                      }
                      disabled={detailRow.state.status === "open"}
                    >
                      <PlayCircle className="w-4 h-4 mr-1.5" />
                      재개
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        openStatusConfirm([detailRow], "paused", {
                          reasonCode: drawerStatusReasonCode,
                          memo: drawerStatusMemo,
                          otherReasonText: drawerStatusOther,
                        })
                      }
                      disabled={detailRow.state.status !== "open"}
                    >
                      <PauseCircle className="w-4 h-4 mr-1.5" />
                      임시휴식
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">품절</p>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="drawer-soldout-switch" className="text-sm">코너 품절</Label>
                      <Switch
                        id="drawer-soldout-switch"
                        checked={drawerSoldOutDraft}
                        onCheckedChange={setDrawerSoldOutDraft}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>사유 (필수)</Label>
                    <Select
                      value={drawerSoldReasonCode}
                      onValueChange={(value) => setDrawerSoldReasonCode(value as OpsReasonCode)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="사유 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OPS_REASON_LABELS).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {drawerSoldReasonCode === "other" && (
                    <div className="space-y-2">
                      <Label>기타 사유 입력 (필수)</Label>
                      <Input
                        value={drawerSoldOther}
                        onChange={(e) => setDrawerSoldOther(e.target.value)}
                        placeholder="기타 사유를 입력해 주세요."
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>메모 (선택)</Label>
                    <Textarea
                      value={drawerSoldMemo}
                      onChange={(e) => setDrawerSoldMemo(e.target.value)}
                      placeholder="품절 변경 메모"
                      rows={2}
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      openSoldOutConfirm([detailRow], drawerSoldOutDraft, {
                        reasonCode: drawerSoldReasonCode,
                        memo: drawerSoldMemo,
                        otherReasonText: drawerSoldOther,
                      })
                    }
                    disabled={drawerSoldOutDraft === detailRow.state.soldOut}
                  >
                    {drawerSoldOutDraft ? "품절 ON 적용" : "품절 OFF 적용"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">사용자 노출 문구 미리보기</p>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    {previewNotice(detailRow.state)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">적용 기록 요약 (최근 3건)</p>
                  {detailEvents.length === 0 ? (
                    <p className="text-xs text-gray-500">아직 변경 기록이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailEvents.map((event) => (
                        <div key={event.id} className="rounded-md border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{eventActionLabel(event.actionType)}</p>
                            <p className="text-xs text-gray-500">{kstTimeLabel(event.ts)}</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            사유: {OPS_REASON_LABELS[event.reasonCode]}
                            {event.memo ? ` · ${event.memo}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
