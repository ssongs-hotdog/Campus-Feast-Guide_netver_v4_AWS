// Notice data model and types for admin CMS

export enum NoticeStatus {
    DRAFT = "draft",
    SCHEDULED = "scheduled",
    PUBLISHED = "published",
    EXPIRED = "expired",
    ARCHIVED = "archived",
}

export enum NoticeType {
    GENERAL = "general",    // 일반
    CAUTION = "caution",    // 주의
    URGENT = "urgent",      // 긴급
}

export enum PublishMode {
    DRAFT = "draft",
    PUBLISH_NOW = "publish_now",
    SCHEDULE = "schedule",
}

export enum TargetScope {
    ALL = "all",
    RESTAURANTS = "restaurants",
    CORNERS = "corners",
}

export interface Notice {
    id: string;
    title: string;
    body: string;
    type: NoticeType;
    status: NoticeStatus;

    // Placement
    placements: {
        inApp: boolean;
        popup: boolean;
    };

    // Priority
    pinned: boolean;

    // Targeting
    targetScope: TargetScope;
    restaurantIds?: string[];
    cornerIds?: string[];

    // Scheduling
    startAt: string | null;  // ISO string
    endAt: string | null;    // ISO string

    // Metadata
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

export interface NoticeFormData {
    title: string;
    body: string;
    type: NoticeType;
    publishMode: PublishMode;
    startAt: string;
    endAt: string;
    pinned: boolean;
    placements: {
        inApp: boolean;
        popup: boolean;
    };
    targetScope: TargetScope;
    restaurantIds: string[];
    cornerIds: string[];
}

export const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
    [NoticeType.GENERAL]: "일반",
    [NoticeType.CAUTION]: "주의",
    [NoticeType.URGENT]: "긴급",
};

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
    [NoticeStatus.DRAFT]: "초안",
    [NoticeStatus.SCHEDULED]: "예약됨",
    [NoticeStatus.PUBLISHED]: "발행중",
    [NoticeStatus.EXPIRED]: "종료됨",
    [NoticeStatus.ARCHIVED]: "보관됨",
};
