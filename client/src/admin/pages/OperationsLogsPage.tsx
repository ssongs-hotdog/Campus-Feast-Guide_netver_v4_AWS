import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  Copy,
  Download,
  Filter,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CORNERS, RESTAURANTS } from "../data/mock_canonical";
import {
  EVENT_CATEGORY_LABELS,
  PERIOD_LABELS,
  RESULT_LABELS,
  SEVERITY_LABELS,
  type AuditEvent,
  type CreateIncidentInput,
  type FilterState,
  type HealthSignal,
  type Incident,
  type OpsSnapshot,
  type SavedView,
} from "../data/opsModels";
import {
  addIncidentAction,
  createIncidentRecord,
  fetchOpsSnapshot,
  removeFilterView,
  saveAuditMemo,
  saveFilterView,
} from "../lib/opsPlatformApi";

const INITIAL_FILTER: FilterState = {
  period: "today",
  scopeType: "all",
  restaurantId: "all",
  cornerId: "all",
  category: "all",
  severity: "all",
  actor: "all",
  keyword: "",
};

function toDateOnly(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTimeKst(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function statusBadgeTone(status: "normal" | "warning" | "outage"): string {
  if (status === "normal") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function severityBadgeTone(level: string): string {
  if (level === "critical") return "bg-rose-50 text-rose-700 border-rose-200";
  if (level === "warn") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function resultBadgeTone(result: string): string {
  if (result === "success") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (result === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function getPeriodRange(filter: FilterState): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (filter.period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (filter.period === "this_week") {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (filter.period === "last_week") {
    end.setDate(now.getDate() - 7);
    end.setHours(23, 59, 59, 999);
    start.setDate(now.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const customStart = filter.customStart ? new Date(`${filter.customStart}T00:00:00`) : new Date(now.getTime() - 7 * 86400000);
  const customEnd = filter.customEnd ? new Date(`${filter.customEnd}T23:59:59`) : now;
  return { start: customStart, end: customEnd };
}

function asCsv(rows: AuditEvent[]): string {
  const header = ["timeKST", "eventType", "category", "severity", "target", "summary", "actor", "result", "auditEventId"];
  const body = rows.map((row) => [
    formatDateTimeKst(row.timestamp),
    row.eventTypeLabel,
    EVENT_CATEGORY_LABELS[row.category],
    SEVERITY_LABELS[row.severity],
    row.targetLabel,
    row.summary.replaceAll(",", " "),
    row.actor,
    RESULT_LABELS[row.result],
    row.id,
  ]);
  return [header, ...body].map((line) => line.map((cell) => `"${cell}"`).join(",")).join("\n");
}

function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OperationsLogsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [data, setData] = useState<OpsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [draftFilter, setDraftFilter] = useState<FilterState>(INITIAL_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(INITIAL_FILTER);
  const [rawKeyword, setRawKeyword] = useState("");
  const [selectedTab, setSelectedTab] = useState("audit");

  const [selectedAudit, setSelectedAudit] = useState<AuditEvent | null>(null);
  const [auditMemoDraft, setAuditMemoDraft] = useState("");
  const [selectedSignal, setSelectedSignal] = useState<HealthSignal | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentActionDraft, setIncidentActionDraft] = useState("");

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewNameDraft, setViewNameDraft] = useState("");
  const [createIncidentDialogOpen, setCreateIncidentDialogOpen] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState<CreateIncidentInput>({
    summary: "",
    impactScope: [],
    userImpact: "",
    severity: "warn",
    owner: "",
  });

  const actors = useMemo(() => {
    const set = new Set((data?.auditEvents ?? []).map((item) => item.actor));
    return Array.from(set).sort();
  }, [data?.auditEvents]);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const snapshot = await fetchOpsSnapshot();
      setData(snapshot);
      setLastUpdated(new Date());
    } catch {
      setError("운영 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDraftFilter((prev) => ({ ...prev, keyword: rawKeyword.trim() }));
    }, 250);
    return () => clearTimeout(timer);
  }, [rawKeyword]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(async () => {
      const snapshot = await fetchOpsSnapshot();
      setData(snapshot);
      setLastUpdated(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  useEffect(() => {
    if (!selectedAudit) return;
    setAuditMemoDraft(selectedAudit.memo ?? "");
  }, [selectedAudit]);

  const filteredAuditEvents = useMemo(() => {
    if (!data) return [];
    const { start, end } = getPeriodRange(appliedFilter);
    const keyword = appliedFilter.keyword.toLowerCase();

    return data.auditEvents.filter((row) => {
      const time = new Date(row.timestamp);
      if (time < start || time > end) return false;
      if (appliedFilter.category !== "all" && row.category !== appliedFilter.category) return false;
      if (appliedFilter.severity !== "all" && row.severity !== appliedFilter.severity) return false;
      if (appliedFilter.actor !== "all" && row.actor !== appliedFilter.actor) return false;
      if (appliedFilter.scopeType === "restaurant" && appliedFilter.restaurantId !== "all" && row.restaurantId !== appliedFilter.restaurantId) {
        return false;
      }
      if (appliedFilter.scopeType === "corner" && appliedFilter.cornerId !== "all" && row.cornerId !== appliedFilter.cornerId) {
        return false;
      }
      if (keyword.length > 0) {
        const hay = `${row.summary} ${row.targetLabel} ${row.eventTypeLabel} ${row.id} ${row.incidentId ?? ""}`.toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      return true;
    });
  }, [data, appliedFilter]);

  const filteredIncidents = useMemo(() => {
    if (!data) return [];
    const { start, end } = getPeriodRange(appliedFilter);
    const keyword = appliedFilter.keyword.toLowerCase();

    return data.incidents.filter((incident) => {
      const started = new Date(incident.startedAt);
      if (started < start || started > end) return false;
      if (appliedFilter.severity !== "all" && incident.severity !== appliedFilter.severity) return false;
      if (keyword.length > 0) {
        const hay = `${incident.id} ${incident.summary} ${incident.userImpact} ${incident.impactScope.join(" ")}`.toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      return true;
    });
  }, [data, appliedFilter]);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    chips.push(`기간: ${PERIOD_LABELS[appliedFilter.period]}`);
    if (appliedFilter.scopeType !== "all") chips.push(`범위: ${appliedFilter.scopeType === "restaurant" ? "식당" : "코너"}`);
    if (appliedFilter.restaurantId !== "all") chips.push(`식당: ${appliedFilter.restaurantId}`);
    if (appliedFilter.cornerId !== "all") chips.push(`코너: ${appliedFilter.cornerId}`);
    if (appliedFilter.category !== "all") chips.push(`타입: ${EVENT_CATEGORY_LABELS[appliedFilter.category]}`);
    if (appliedFilter.severity !== "all") chips.push(`심각도: ${SEVERITY_LABELS[appliedFilter.severity]}`);
    if (appliedFilter.actor !== "all") chips.push(`실행자: ${appliedFilter.actor}`);
    if (appliedFilter.keyword) chips.push(`검색: ${appliedFilter.keyword}`);
    return chips;
  }, [appliedFilter]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const snapshot = await fetchOpsSnapshot();
      setData(snapshot);
      setLastUpdated(new Date());
      toast({ title: "새로고침 완료", description: "운영 데이터가 최신 상태로 갱신되었습니다." });
    } finally {
      setIsRefreshing(false);
    }
  };

  const onApplyFilter = () => {
    setAppliedFilter(draftFilter);
  };

  const onResetFilter = () => {
    setDraftFilter(INITIAL_FILTER);
    setAppliedFilter(INITIAL_FILTER);
    setRawKeyword("");
  };

  const onSaveView = async () => {
    if (!viewNameDraft.trim()) return;
    const view: SavedView = {
      id: `VIEW-${Date.now()}`,
      name: viewNameDraft.trim(),
      filter: draftFilter,
      createdAt: new Date().toISOString(),
    };
    await saveFilterView(view);
    const snapshot = await fetchOpsSnapshot();
    setData(snapshot);
    setSaveDialogOpen(false);
    setViewNameDraft("");
    toast({ title: "저장된 보기 추가", description: "필터 조합이 저장되었습니다." });
  };

  const onLoadSavedView = (viewId: string) => {
    const view = data?.savedViews.find((item) => item.id === viewId);
    if (!view) return;
    setDraftFilter(view.filter);
    setAppliedFilter(view.filter);
    setRawKeyword(view.filter.keyword);
  };

  const onDeleteSavedView = async (viewId: string) => {
    await removeFilterView(viewId);
    const snapshot = await fetchOpsSnapshot();
    setData(snapshot);
  };

  const onExportCsv = () => {
    if (filteredAuditEvents.length === 0) {
      toast({ title: "내보낼 데이터 없음", description: "현재 필터 조건의 운영 이력이 없습니다." });
      return;
    }
    downloadCsv(`hy-eat-audit-${toDateOnly(new Date().toISOString())}.csv`, asCsv(filteredAuditEvents));
  };

  const onCopyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "복사 완료", description: `${value}를 복사했습니다.` });
    } catch {
      toast({ title: "복사 실패", description: "클립보드 접근 권한을 확인해주세요.", variant: "destructive" });
    }
  };

  const onSaveAuditMemo = async () => {
    if (!selectedAudit) return;
    await saveAuditMemo(selectedAudit.id, auditMemoDraft.trim());
    const snapshot = await fetchOpsSnapshot();
    setData(snapshot);
    const next = snapshot.auditEvents.find((row) => row.id === selectedAudit.id) ?? null;
    setSelectedAudit(next);
    toast({ title: "운영 메모 저장", description: "변경 사유 메모를 저장했습니다." });
  };

  const onCreateIncident = async () => {
    if (!incidentDraft.summary.trim() || !incidentDraft.userImpact.trim()) {
      toast({ title: "입력 확인", description: "요약과 사용자 영향은 필수입니다.", variant: "destructive" });
      return;
    }
    await createIncidentRecord({
      ...incidentDraft,
      summary: incidentDraft.summary.trim(),
      userImpact: incidentDraft.userImpact.trim(),
      owner: incidentDraft.owner?.trim(),
    });
    const snapshot = await fetchOpsSnapshot();
    setData(snapshot);
    setCreateIncidentDialogOpen(false);
    setIncidentDraft({ summary: "", impactScope: [], userImpact: "", severity: "warn", owner: "" });
    toast({ title: "사건 생성 완료", description: "신규 incident가 기록되었습니다." });
  };

  const onAddIncidentAction = async () => {
    if (!selectedIncident || !incidentActionDraft.trim()) return;
    await addIncidentAction(selectedIncident.id, incidentActionDraft.trim(), "admin@hyeat.com");
    const snapshot = await fetchOpsSnapshot();
    setData(snapshot);
    const next = snapshot.incidents.find((row) => row.id === selectedIncident.id) ?? null;
    setSelectedIncident(next);
    setIncidentActionDraft("");
  };

  const linkedEvents = useMemo(() => {
    if (!selectedIncident || !data) return [];
    const map = new Map(data.auditEvents.map((event) => [event.id, event]));
    return selectedIncident.linkedEventIds
      .map((id) => map.get(id))
      .filter((item): item is AuditEvent => !!item)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [selectedIncident, data]);

  return (
    <div className="space-y-4 pb-8">
      <AdminPageHeader
        title="운영 로그"
        subtitle="운영 이력, 시스템 상태, 사건/이슈를 통합 관제합니다."
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        isLoading={isRefreshing}
      />

      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#0E4A84]" />
            Global Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <Select value={draftFilter.period} onValueChange={(v) => setDraftFilter((p) => ({ ...p, period: v as FilterState["period"] }))}>
              <SelectTrigger><SelectValue placeholder="기간" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="this_week">이번주</SelectItem>
                <SelectItem value="last_week">지난주</SelectItem>
                <SelectItem value="custom">커스텀</SelectItem>
              </SelectContent>
            </Select>
            <Select value={draftFilter.scopeType} onValueChange={(v) => setDraftFilter((p) => ({ ...p, scopeType: v as FilterState["scopeType"] }))}>
              <SelectTrigger><SelectValue placeholder="범위" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="restaurant">식당</SelectItem>
                <SelectItem value="corner">코너</SelectItem>
              </SelectContent>
            </Select>
            <Select value={draftFilter.category} onValueChange={(v) => setDraftFilter((p) => ({ ...p, category: v as FilterState["category"] }))}>
              <SelectTrigger><SelectValue placeholder="이벤트 타입" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 타입</SelectItem>
                {Object.entries(EVENT_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draftFilter.severity} onValueChange={(v) => setDraftFilter((p) => ({ ...p, severity: v as FilterState["severity"] }))}>
              <SelectTrigger><SelectValue placeholder="심각도" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 심각도</SelectItem>
                {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <Select value={draftFilter.restaurantId} onValueChange={(v) => setDraftFilter((p) => ({ ...p, restaurantId: v }))}>
              <SelectTrigger><SelectValue placeholder="식당" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 식당</SelectItem>
                {RESTAURANTS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draftFilter.cornerId} onValueChange={(v) => setDraftFilter((p) => ({ ...p, cornerId: v }))}>
              <SelectTrigger><SelectValue placeholder="코너" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 코너</SelectItem>
                {CORNERS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draftFilter.actor} onValueChange={(v) => setDraftFilter((p) => ({ ...p, actor: v }))}>
              <SelectTrigger><SelectValue placeholder="실행자" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 실행자</SelectItem>
                {actors.map((actor) => (
                  <SelectItem key={actor} value={actor}>{actor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              <Input
                value={rawKeyword}
                onChange={(e) => setRawKeyword(e.target.value)}
                className="pl-8"
                placeholder="메뉴/공지/배너/incident id 검색"
              />
            </div>
          </div>

          {draftFilter.period === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input type="date" value={draftFilter.customStart ?? ""} onChange={(e) => setDraftFilter((p) => ({ ...p, customStart: e.target.value }))} />
              <Input type="date" value={draftFilter.customEnd ?? ""} onChange={(e) => setDraftFilter((p) => ({ ...p, customEnd: e.target.value }))} />
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm" onClick={onApplyFilter}>적용</Button>
            <Button size="sm" variant="outline" onClick={onResetFilter}>Reset</Button>
            <Button size="sm" variant="outline" onClick={() => setSaveDialogOpen(true)}>저장된 보기 저장</Button>
            <Select onValueChange={onLoadSavedView}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="저장된 보기 불러오기" /></SelectTrigger>
              <SelectContent>
                {(data?.savedViews.length ?? 0) === 0 ? (
                  <SelectItem value="none" disabled>저장된 보기 없음</SelectItem>
                ) : (
                  data?.savedViews.map((view) => (
                    <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {data?.savedViews.slice(0, 1).map((view) => (
              <Button key={view.id} size="sm" variant="ghost" onClick={() => onDeleteSavedView(view.id)}>최근 보기 삭제</Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {activeFilterChips.map((chip) => (
              <Badge key={chip} className="bg-slate-100 text-slate-700 border-slate-200">{chip}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!loading && error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div className="text-sm text-rose-700">{error}</div>
            <Button size="sm" variant="outline" onClick={load}>재시도</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="audit">운영 이력</TabsTrigger>
            <TabsTrigger value="health">시스템 상태</TabsTrigger>
            <TabsTrigger value="incident">사건/이슈</TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">누가, 언제, 무엇을 변경했는지 감사 추적을 제공합니다.</p>
              <Button size="sm" variant="outline" onClick={onExportCsv}>
                <Download className="w-4 h-4 mr-1" />
                CSV Export
              </Button>
            </div>

            {filteredAuditEvents.length === 0 ? (
              <Card><CardContent className="pt-6 text-sm text-gray-500">선택한 기간에 기록이 없습니다. 필터를 완화해 주세요.</CardContent></Card>
            ) : (
              <Card className="border-gray-200">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간(KST)</TableHead>
                        <TableHead>이벤트</TableHead>
                        <TableHead>대상</TableHead>
                        <TableHead>요약</TableHead>
                        <TableHead>실행자</TableHead>
                        <TableHead>결과</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditEvents.map((event) => (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedAudit(event)}
                        >
                          <TableCell className="text-xs text-gray-500">{formatDateTimeKst(event.timestamp)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge className={severityBadgeTone(event.severity)}>{event.eventTypeLabel}</Badge>
                              <div className="text-xs text-gray-500">{EVENT_CATEGORY_LABELS[event.category]}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{event.targetLabel}</TableCell>
                          <TableCell className="text-sm">{event.summary}</TableCell>
                          <TableCell className="text-xs text-gray-600">{event.actor}</TableCell>
                          <TableCell><Badge className={resultBadgeTone(event.result)}>{RESULT_LABELS[event.result]}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="health" className="space-y-3">
            <p className="text-sm text-gray-500">개발자 에러 덤프 대신 운영자 언어의 상태와 조치 가이드를 제공합니다.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {data.healthSignals.map((signal) => (
                <button
                  key={signal.id}
                  type="button"
                  className="text-left"
                  onClick={() => setSelectedSignal(signal)}
                >
                  <Card className="h-full hover:border-gray-300 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{signal.title}</CardTitle>
                        <Badge className={statusBadgeTone(signal.status)}>
                          {signal.status === "normal" ? "정상" : signal.status === "warning" ? "주의" : "장애"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm font-semibold text-gray-900">{signal.primaryMetricLabel}: {signal.primaryMetricValue}</div>
                      <div className="text-xs text-gray-500">{signal.secondaryMetricLabel}: {signal.secondaryMetricValue}</div>
                      <div className="text-xs text-gray-600">{signal.summary}</div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="incident" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">사건 단위로 영향 범위와 조치 이력을 남겨 증빙에 활용합니다.</p>
              <Button size="sm" onClick={() => setCreateIncidentDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Incident 생성
              </Button>
            </div>

            {filteredIncidents.length === 0 ? (
              <Card><CardContent className="pt-6 text-sm text-gray-500">선택한 조건의 사건/이슈가 없습니다.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredIncidents.map((incident) => (
                  <Card key={incident.id} className="border-gray-200">
                    <CardContent className="pt-6 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={severityBadgeTone(incident.severity)}>{SEVERITY_LABELS[incident.severity]}</Badge>
                          <Badge className={incident.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}>
                            {incident.status === "resolved" ? "해결" : "진행중"}
                          </Badge>
                          <span className="text-xs text-gray-500">{incident.id}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{incident.summary}</div>
                        <div className="text-xs text-gray-600">영향: {incident.userImpact}</div>
                        <div className="text-xs text-gray-500">범위: {incident.impactScope.join(", ")}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelectedIncident(incident)}>상세 보기</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Sheet open={!!selectedAudit} onOpenChange={(open) => !open && setSelectedAudit(null)}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
          {selectedAudit && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedAudit.eventTypeLabel}</SheetTitle>
                <SheetDescription>{selectedAudit.summary}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="text-xs text-gray-500">시간: {formatDateTimeKst(selectedAudit.timestamp)}</div>
                <div className="text-sm text-gray-700">{selectedAudit.detail}</div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">변경 전/후 요약</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {selectedAudit.diff.length === 0 ? (
                      <div className="text-xs text-gray-500">변경 diff 정보가 없습니다.</div>
                    ) : (
                      selectedAudit.diff.map((item) => (
                        <div key={item.key} className="text-xs grid grid-cols-3 gap-2">
                          <div className="font-medium text-gray-700">{item.key}</div>
                          <div className="text-gray-500">Before: {item.before}</div>
                          <div className="text-gray-900">After: {item.after}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <div className="flex gap-2">
                  {selectedAudit.relatedPath && (
                    <Button size="sm" variant="outline" onClick={() => setLocation(selectedAudit.relatedPath!)}>관련 화면으로 이동</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onCopyId(selectedAudit.id)}>
                    <Copy className="w-4 h-4 mr-1" />
                    auditEventId 복사
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">운영 메모(변경 사유)</label>
                  <Textarea value={auditMemoDraft} onChange={(e) => setAuditMemoDraft(e.target.value)} placeholder="예: 학생 불만 대응을 위해 즉시 수정" />
                  <Button size="sm" onClick={onSaveAuditMemo}>메모 저장</Button>
                </div>
                {selectedAudit.incidentId && (
                  <div className="text-xs text-gray-600">지원용 Incident: {selectedAudit.incidentId}</div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedSignal} onOpenChange={(open) => !open && setSelectedSignal(null)}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          {selectedSignal && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedSignal.title}</SheetTitle>
                <SheetDescription>{selectedSignal.summary}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className={statusBadgeTone(selectedSignal.status)}>
                    {selectedSignal.status === "normal" ? "정상" : selectedSignal.status === "warning" ? "주의" : "장애"}
                  </Badge>
                  <span className="text-xs text-gray-500">마지막 갱신: {formatDateTimeKst(selectedSignal.lastUpdated)}</span>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">최근 24h 추이</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-1 items-end h-14">
                      {selectedSignal.trend24h.map((v, idx) => (
                        <div key={`${selectedSignal.id}-24-${idx}`} className="flex-1 bg-blue-100 rounded-sm" style={{ height: `${Math.max(10, Math.min(100, v))}%` }} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">최근 7d 추이</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-1 items-end h-14">
                      {selectedSignal.trend7d.map((v, idx) => (
                        <div key={`${selectedSignal.id}-7-${idx}`} className="flex-1 bg-slate-200 rounded-sm" style={{ height: `${Math.max(10, Math.min(100, v))}%` }} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="text-sm">
                  <div className="font-medium text-gray-800 mb-1">영향 범위</div>
                  <div className="text-xs text-gray-600">{selectedSignal.impactScope.join(", ")}</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-800 mb-1">권장 조치</div>
                  <div className="text-xs text-gray-600">{selectedSignal.recommendation}</div>
                </div>
                {selectedSignal.incidentId && (
                  <Button size="sm" variant="outline" onClick={() => onCopyId(selectedSignal.incidentId!)}>
                    <ShieldAlert className="w-4 h-4 mr-1" />
                    incident id 복사
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
          {selectedIncident && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedIncident.id}</SheetTitle>
                <SheetDescription>{selectedIncident.summary}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={severityBadgeTone(selectedIncident.severity)}>{SEVERITY_LABELS[selectedIncident.severity]}</Badge>
                  <Badge className={selectedIncident.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"}>
                    {selectedIncident.status === "resolved" ? "해결" : "진행중"}
                  </Badge>
                  <span className="text-xs text-gray-500">발생: {formatDateTimeKst(selectedIncident.startedAt)}</span>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">영향 요약</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-xs text-gray-600">영향 범위: {selectedIncident.impactScope.join(", ")}</div>
                    <div className="text-xs text-gray-600">사용자 영향: {selectedIncident.userImpact}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">연결된 운영 이력</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {linkedEvents.length === 0 ? (
                      <div className="text-xs text-gray-500">자동 연결된 이력이 없습니다.</div>
                    ) : (
                      linkedEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className="w-full text-left border rounded-md px-3 py-2 hover:bg-gray-50"
                          onClick={() => setSelectedAudit(event)}
                        >
                          <div className="text-xs text-gray-500">{formatDateTimeKst(event.timestamp)}</div>
                          <div className="text-sm font-medium text-gray-800">{event.eventTypeLabel}</div>
                          <div className="text-xs text-gray-600">{event.summary}</div>
                        </button>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">조치 내역</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {selectedIncident.actions.map((action) => (
                      <div key={action.id} className="border rounded-md p-2">
                        <div className="text-xs text-gray-500">{action.author} · {formatDateTimeKst(action.createdAt)}</div>
                        <div className="text-sm text-gray-700">{action.note}</div>
                      </div>
                    ))}
                    <Textarea value={incidentActionDraft} onChange={(e) => setIncidentActionDraft(e.target.value)} placeholder="추가 조치 메모를 입력하세요." />
                    <Button size="sm" onClick={onAddIncidentAction}>조치 메모 추가</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">재발 방지 체크</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {selectedIncident.preventionChecklist.length === 0 ? (
                      <div className="text-xs text-gray-500">등록된 재발 방지 항목이 없습니다.</div>
                    ) : (
                      selectedIncident.preventionChecklist.map((item) => (
                        <div key={item} className="text-xs text-gray-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {item}
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

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>저장된 보기</DialogTitle>
            <DialogDescription>현재 필터 조합을 저장해 빠르게 재사용합니다.</DialogDescription>
          </DialogHeader>
          <Input value={viewNameDraft} onChange={(e) => setViewNameDraft(e.target.value)} placeholder="예: 결제·QR 중요 이슈" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>취소</Button>
            <Button onClick={onSaveView}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createIncidentDialogOpen} onOpenChange={setCreateIncidentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incident 생성</DialogTitle>
            <DialogDescription>운영자 언어로 사건을 기록해 후속 조치와 증빙에 활용합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={incidentDraft.summary}
              onChange={(e) => setIncidentDraft((p) => ({ ...p, summary: e.target.value }))}
              placeholder="사건 요약"
            />
            <Input
              value={incidentDraft.userImpact}
              onChange={(e) => setIncidentDraft((p) => ({ ...p, userImpact: e.target.value }))}
              placeholder="사용자 영향 (예: 결제 실패 12건)"
            />
            <Input
              value={incidentDraft.owner ?? ""}
              onChange={(e) => setIncidentDraft((p) => ({ ...p, owner: e.target.value }))}
              placeholder="담당자(선택)"
            />
            <Select
              value={incidentDraft.severity}
              onValueChange={(v) => setIncidentDraft((p) => ({ ...p, severity: v as CreateIncidentInput["severity"] }))}
            >
              <SelectTrigger><SelectValue placeholder="심각도" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">정보</SelectItem>
                <SelectItem value="warn">주의</SelectItem>
                <SelectItem value="critical">중요</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={incidentDraft.impactScope.join(", ")}
              onChange={(e) => setIncidentDraft((p) => ({ ...p, impactScope: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
              placeholder="영향 범위(쉼표 구분)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateIncidentDialogOpen(false)}>취소</Button>
            <Button onClick={onCreateIncident}>
              <Plus className="w-4 h-4 mr-1" />
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
