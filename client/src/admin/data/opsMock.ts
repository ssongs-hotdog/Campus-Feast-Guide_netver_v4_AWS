import { CORNERS, RESTAURANTS } from "./mock_canonical";
import type {
  AuditEvent,
  EventCategory,
  HealthSignal,
  Incident,
  SeverityLevel,
} from "./opsModels";

const ACTORS = ["admin@hyeat.com", "ops01@hanyang.ac.kr", "menu.pm@hyeat.com", "content.lead@hyeat.com"];

const EVENT_TEMPLATES: Array<{
  typeLabel: string;
  category: EventCategory;
  severity: SeverityLevel;
  result: "success" | "failed" | "partial";
  summary: string;
  detail: string;
  diff: Array<{ key: string; before: string; after: string }>;
  relatedPath?: string;
}> = [
  {
    typeLabel: "메뉴 수정",
    category: "menu",
    severity: "info",
    result: "success",
    summary: "생활과학관 중식 메뉴 가격이 조정되었습니다.",
    detail: "운영 정책 변경에 따라 중식 단가를 조정했습니다.",
    diff: [
      { key: "priceWon", before: "5000", after: "5500" },
      { key: "mainMenuName", before: "닭갈비덮밥", after: "매콤닭갈비덮밥" },
    ],
    relatedPath: "/admin/menu",
  },
  {
    typeLabel: "배너 예약",
    category: "banner",
    severity: "warn",
    result: "partial",
    summary: "신입생 주간 배너 예약 중 일정 충돌이 감지되었습니다.",
    detail: "동일 슬롯에 기존 배너가 있어 자동으로 후순위로 조정했습니다.",
    diff: [
      { key: "slot", before: "1", after: "2" },
      { key: "startAt", before: "2026-02-17 08:00", after: "2026-02-17 10:00" },
    ],
    relatedPath: "/admin/banners",
  },
  {
    typeLabel: "공지 발행",
    category: "notice",
    severity: "info",
    result: "success",
    summary: "점검 안내 공지가 즉시 발행되었습니다.",
    detail: "학생 대상 안내를 위해 예약 상태 공지를 즉시 발행으로 전환했습니다.",
    diff: [{ key: "status", before: "예약", after: "발행" }],
    relatedPath: "/admin/notices",
  },
  {
    typeLabel: "결제·QR 상태 경보",
    category: "payment_qr",
    severity: "critical",
    result: "failed",
    summary: "QR 결제 성공률이 임계치 이하로 하락했습니다.",
    detail: "일부 단말기 인증 지연으로 실패율이 상승했습니다. 운영 점검이 필요합니다.",
    diff: [
      { key: "successRate", before: "98.4%", after: "89.2%" },
      { key: "p95Latency", before: "1.1s", after: "2.7s" },
    ],
  },
  {
    typeLabel: "권한 변경",
    category: "auth_account",
    severity: "warn",
    result: "success",
    summary: "운영자 계정 권한이 콘텐츠 관리자에서 운영 관리자로 변경되었습니다.",
    detail: "야간 운영 대응을 위해 권한 정책을 상향했습니다.",
    diff: [{ key: "role", before: "content_manager", after: "ops_manager" }],
    relatedPath: "/admin/admins",
  },
  {
    typeLabel: "품질 경보",
    category: "review_quality",
    severity: "warn",
    result: "partial",
    summary: "특정 메뉴의 별점이 급락해 모니터링 상태로 전환되었습니다.",
    detail: "최근 3일 평균 대비 1.2점 하락이 감지되었습니다.",
    diff: [
      { key: "avgRating", before: "4.4", after: "3.2" },
      { key: "reviewVolume", before: "11", after: "36" },
    ],
    relatedPath: "/admin/reports",
  },
];

function toIso(date: Date): string {
  return date.toISOString();
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function buildTarget(idx: number): { label: string; restaurantId: string; cornerId: string } {
  const corner = CORNERS[idx % CORNERS.length];
  const restaurant = RESTAURANTS.find((r) => r.id === corner.restaurantId);
  return {
    label: `${restaurant?.name ?? corner.restaurantId} / ${corner.name}`,
    restaurantId: corner.restaurantId,
    cornerId: corner.id,
  };
}

export function createMockAuditEvents(): AuditEvent[] {
  const now = new Date();
  const events: AuditEvent[] = [];

  for (let i = 0; i < 56; i += 1) {
    const template = pick(EVENT_TEMPLATES, i);
    const target = buildTarget(i);
    const occurredAt = new Date(now.getTime() - i * 45 * 60 * 1000);
    const incidentId = template.severity === "critical" ? `INC-${occurredAt.getTime().toString().slice(-6)}` : undefined;

    events.push({
      id: `AUD-${occurredAt.getTime().toString().slice(-8)}-${String(i).padStart(2, "0")}`,
      timestamp: toIso(occurredAt),
      eventTypeLabel: template.typeLabel,
      category: template.category,
      severity: template.severity,
      targetLabel: target.label,
      summary: template.summary,
      actor: pick(ACTORS, i),
      result: template.result,
      detail: template.detail,
      diff: template.diff,
      relatedPath: template.relatedPath,
      incidentId,
      restaurantId: target.restaurantId,
      cornerId: target.cornerId,
      memo: "",
    });
  }

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function createMockHealthSignals(): HealthSignal[] {
  const now = new Date();
  return [
    {
      id: "health-freshness",
      title: "데이터 최신성",
      status: "warning",
      summary: "일부 코너의 최신 스냅샷이 지연 중입니다.",
      lastUpdated: toIso(now),
      primaryMetricLabel: "최신 지연",
      primaryMetricValue: "6분",
      secondaryMetricLabel: "지연 코너",
      secondaryMetricValue: "3개",
      trend24h: [98, 97, 99, 92, 93, 95, 96, 94],
      trend7d: [97, 96, 95, 93, 96, 98, 97],
      impactScope: ["한양플라자 / 라면", "신소재공학관 / 정식"],
      recommendation: "대기열 수집 장치 연결 상태를 확인하고 10분 내 재동기화하세요.",
      incidentId: "INC-771204",
    },
    {
      id: "health-menu-load",
      title: "메뉴 로딩 상태",
      status: "normal",
      summary: "최근 메뉴 로드가 안정적으로 유지되고 있습니다.",
      lastUpdated: toIso(now),
      primaryMetricLabel: "최근 성공률",
      primaryMetricValue: "99.6%",
      secondaryMetricLabel: "마지막 성공",
      secondaryMetricValue: "1분 전",
      trend24h: [99, 100, 99, 99, 100, 99, 100, 100],
      trend7d: [99, 99, 100, 99, 99, 100, 99],
      impactScope: ["전체 식당"],
      recommendation: "변경 없이 유지 가능합니다.",
    },
    {
      id: "health-payment",
      title: "결제/QR",
      status: "outage",
      summary: "피크 시간 결제 실패율이 증가했습니다.",
      lastUpdated: toIso(now),
      primaryMetricLabel: "성공률",
      primaryMetricValue: "89.2%",
      secondaryMetricLabel: "평균 처리시간",
      secondaryMetricValue: "2.4초",
      trend24h: [98, 97, 96, 95, 91, 89, 90, 92],
      trend7d: [98, 98, 97, 96, 95, 93, 89],
      impactScope: ["생활과학관 / 중식 Dam-A", "신소재공학관 / 일품"],
      recommendation: "오프라인 단말기 재기동 후 결제 게이트웨이 상태를 확인하세요.",
      incidentId: "INC-771204",
    },
    {
      id: "health-content",
      title: "공지/배너 배포",
      status: "warning",
      summary: "예약 배너 일부가 시간대 충돌로 후순위 적용되었습니다.",
      lastUpdated: toIso(now),
      primaryMetricLabel: "충돌 건수",
      primaryMetricValue: "2건",
      secondaryMetricLabel: "예약 대기",
      secondaryMetricValue: "7건",
      trend24h: [1, 1, 0, 2, 1, 1, 2, 2],
      trend7d: [1, 0, 1, 2, 1, 1, 2],
      impactScope: ["메인 홈 배너 슬롯"],
      recommendation: "중복 시간대를 정리하고 우선순위를 재배치하세요.",
    },
  ];
}

export function createMockIncidents(auditEvents: AuditEvent[]): Incident[] {
  const linked = auditEvents.filter((event) => event.incidentId === "INC-771204").slice(0, 8);
  return [
    {
      id: "INC-771204",
      status: "ongoing",
      severity: "critical",
      startedAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
      impactScope: ["생활과학관 / 중식 Dam-A", "신소재공학관 / 일품"],
      userImpact: "최근 60분 결제 실패 37건",
      summary: "점심 피크 시간 결제·QR 실패율 급증",
      owner: "ops01@hanyang.ac.kr",
      linkedEventIds: linked.map((item) => item.id),
      actions: [
        {
          id: "ACT-001",
          author: "ops01@hanyang.ac.kr",
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          note: "오프라인 단말기 재부팅 후 재시도 진행",
        },
        {
          id: "ACT-002",
          author: "admin@hyeat.com",
          createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          note: "현장 안내문 배포 및 수기 결제 임시 전환",
        },
      ],
      preventionChecklist: ["피크 전 단말기 상태 사전 점검", "장애 대응 플레이북 재교육"],
    },
    {
      id: "INC-771180",
      status: "resolved",
      severity: "warn",
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
      impactScope: ["메인 홈 배너 슬롯"],
      userImpact: "프로모션 배너 노출 지연 14분",
      summary: "배너 예약 충돌로 노출 순서가 비정상 적용",
      owner: "content.lead@hyeat.com",
      linkedEventIds: auditEvents.slice(10, 16).map((item) => item.id),
      actions: [
        {
          id: "ACT-101",
          author: "content.lead@hyeat.com",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString(),
          note: "중복 슬롯 정리 후 배포 재실행",
        },
      ],
      preventionChecklist: ["배너 예약 전 충돌 검사 체크리스트 적용"],
    },
  ];
}
