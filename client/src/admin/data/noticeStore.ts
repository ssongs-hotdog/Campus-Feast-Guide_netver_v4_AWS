// Mock notice store for admin CMS (client-side, API-ready)

import { Notice, NoticeStatus, NoticeType, TargetScope } from "./noticeModel";

// Mock data
const MOCK_NOTICES: Notice[] = [
    {
        id: "notice-001",
        title: "설 연휴 운영 안내",
        body: "설 연휴 기간(2월 9일~11일) 동안 모든 식당이 휴무입니다. 2월 12일부터 정상 운영됩니다.",
        type: NoticeType.GENERAL,
        status: NoticeStatus.PUBLISHED,
        placements: { inApp: true, popup: false },
        pinned: true,
        targetScope: TargetScope.ALL,
        startAt: "2026-02-05T00:00:00Z",
        endAt: "2026-02-12T00:00:00Z",
        createdAt: "2026-02-04T10:00:00Z",
        updatedAt: "2026-02-04T10:00:00Z",
        createdBy: "admin",
    },
    {
        id: "notice-002",
        title: "[긴급] 한양플라자 임시 휴무",
        body: "한양플라자 식당이 설비 점검으로 2월 17일 점심 영업을 하지 않습니다. 신소재공학관 또는 생활과학관을 이용해 주세요.",
        type: NoticeType.URGENT,
        status: NoticeStatus.PUBLISHED,
        placements: { inApp: true, popup: true },
        pinned: true,
        targetScope: TargetScope.RESTAURANTS,
        restaurantIds: ["hanyang_plaza"],
        startAt: "2026-02-17T00:00:00Z",
        endAt: "2026-02-17T23:59:59Z",
        createdAt: "2026-02-16T15:30:00Z",
        updatedAt: "2026-02-16T15:30:00Z",
        createdBy: "admin",
    },
    {
        id: "notice-003",
        title: "천원의 아침밥 메뉴 변경 안내",
        body: "2월 20일부터 천원의 아침밥 메뉴가 새롭게 변경됩니다. 자세한 메뉴는 앱에서 확인하세요.",
        type: NoticeType.GENERAL,
        status: NoticeStatus.SCHEDULED,
        placements: { inApp: true, popup: false },
        pinned: false,
        targetScope: TargetScope.CORNERS,
        cornerIds: ["breakfast_1000"],
        startAt: "2026-02-20T00:00:00Z",
        endAt: null,
        createdAt: "2026-02-15T09:00:00Z",
        updatedAt: "2026-02-15T09:00:00Z",
        createdBy: "admin",
    },
    {
        id: "notice-004",
        title: "3월 식단표 사전 공개",
        body: "3월 한 달간의 식단표가 미리 공개되었습니다. 앱에서 확인하세요.",
        type: NoticeType.GENERAL,
        status: NoticeStatus.DRAFT,
        placements: { inApp: true, popup: false },
        pinned: false,
        targetScope: TargetScope.ALL,
        startAt: null,
        endAt: null,
        createdAt: "2026-02-16T14:00:00Z",
        updatedAt: "2026-02-16T14:00:00Z",
        createdBy: "admin",
    },
    {
        id: "notice-005",
        title: "겨울방학 운영 시간 변경",
        body: "겨울방학 기간 동안 모든 식당의 운영 시간이 단축됩니다.",
        type: NoticeType.CAUTION,
        status: NoticeStatus.EXPIRED,
        placements: { inApp: true, popup: false },
        pinned: false,
        targetScope: TargetScope.ALL,
        startAt: "2026-01-01T00:00:00Z",
        endAt: "2026-02-01T00:00:00Z",
        createdAt: "2025-12-20T10:00:00Z",
        updatedAt: "2025-12-20T10:00:00Z",
        createdBy: "admin",
    },
];

// Client-side store (will be replaced by API calls)
class NoticeStore {
    private notices: Notice[] = [...MOCK_NOTICES];
    private nextId = 6;

    getAll(): Notice[] {
        return [...this.notices];
    }

    getById(id: string): Notice | undefined {
        return this.notices.find(n => n.id === id);
    }

    create(notice: Omit<Notice, "id" | "createdAt" | "updatedAt">): Notice {
        const now = new Date().toISOString();
        const newNotice: Notice = {
            ...notice,
            id: `notice-${String(this.nextId++).padStart(3, "0")}`,
            createdAt: now,
            updatedAt: now,
        };
        this.notices.unshift(newNotice);
        return newNotice;
    }

    update(id: string, updates: Partial<Notice>): Notice | null {
        const index = this.notices.findIndex(n => n.id === id);
        if (index === -1) return null;

        const updated: Notice = {
            ...this.notices[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        this.notices[index] = updated;
        return updated;
    }

    delete(id: string): boolean {
        const index = this.notices.findIndex(n => n.id === id);
        if (index === -1) return false;
        this.notices.splice(index, 1);
        return true;
    }

    archive(id: string): Notice | null {
        return this.update(id, { status: NoticeStatus.ARCHIVED });
    }

    bulkArchive(ids: string[]): number {
        let count = 0;
        ids.forEach(id => {
            if (this.archive(id)) count++;
        });
        return count;
    }

    duplicate(id: string): Notice | null {
        const original = this.getById(id);
        if (!original) return null;

        const { id: _, createdAt, updatedAt, ...rest } = original;
        return this.create({
            ...rest,
            title: `${original.title} (복사본)`,
            status: NoticeStatus.DRAFT,
            startAt: null,
            endAt: null,
        });
    }

    endNow(id: string): Notice | null {
        return this.update(id, {
            endAt: new Date().toISOString(),
            status: NoticeStatus.EXPIRED,
        });
    }
}

export const noticeStore = new NoticeStore();

// Helper to compute status based on dates
export function computeNoticeStatus(notice: Notice): NoticeStatus {
    if (notice.status === NoticeStatus.DRAFT || notice.status === NoticeStatus.ARCHIVED) {
        return notice.status;
    }

    const now = new Date();
    const start = notice.startAt ? new Date(notice.startAt) : null;
    const end = notice.endAt ? new Date(notice.endAt) : null;

    if (end && end < now) {
        return NoticeStatus.EXPIRED;
    }

    if (start && start > now) {
        return NoticeStatus.SCHEDULED;
    }

    return NoticeStatus.PUBLISHED;
}
