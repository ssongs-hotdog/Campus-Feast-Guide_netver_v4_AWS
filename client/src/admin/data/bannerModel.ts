// Banner data model and types for admin CMS

export enum BannerStatus {
    DRAFT = "draft",
    SCHEDULED = "scheduled",
    ACTIVE = "active",
    ENDED = "ended",
    ARCHIVED = "archived",
}

export enum LinkType {
    NONE = "none",
    EXTERNAL = "external",
    DEEPLINK = "deeplink",
}

export enum TargetScope {
    ALL = "all",
    RESTAURANTS = "restaurants",
    CORNERS = "corners",
}

export interface Banner {
    id: string;
    internalName: string;  // Operator label
    imageUrl: string;      // URL or local object URL
    altText: string;

    // Link
    linkType: LinkType;
    linkTarget: string;    // URL or deeplink path

    // Status & Schedule
    status: BannerStatus;
    startAt: string | null;  // ISO string
    endAt: string | null;    // ISO string

    // Targeting
    targetScope: TargetScope;
    restaurantIds?: string[];
    cornerIds?: string[];

    // Ordering
    order: number;

    // Internal memo
    memo?: string;

    // Metadata
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

export interface BannerFormData {
    internalName: string;
    imageUrl: string;
    imageFile?: File;      // For upload handling
    altText: string;
    linkType: LinkType;
    linkTarget: string;
    publishNow: boolean;   // true = publish now, false = draft or schedule
    schedule: boolean;     // true = schedule, false = publish now/draft
    startAt: string;
    endAt: string;
    targetScope: TargetScope;
    restaurantIds: string[];
    cornerIds: string[];
    memo: string;
}

export interface CarouselSettings {
    autoRotate: boolean;
    intervalSec: number;   // Default 4-6
    swipeEnabled: boolean;
    showIndicators: boolean;
}

export const BANNER_STATUS_LABELS: Record<BannerStatus, string> = {
    [BannerStatus.DRAFT]: "초안",
    [BannerStatus.SCHEDULED]: "예약됨",
    [BannerStatus.ACTIVE]: "노출중",
    [BannerStatus.ENDED]: "종료됨",
    [BannerStatus.ARCHIVED]: "보관됨",
};

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
    [LinkType.NONE]: "링크 없음",
    [LinkType.EXTERNAL]: "외부 URL",
    [LinkType.DEEPLINK]: "앱 내부 링크",
};

export const TARGET_SCOPE_LABELS: Record<TargetScope, string> = {
    [TargetScope.ALL]: "전체",
    [TargetScope.RESTAURANTS]: "특정 식당",
    [TargetScope.CORNERS]: "특정 코너",
};

// Deeplink examples for validation/guidance
export const DEEPLINK_EXAMPLES = [
    "/home",
    "/menu",
    "/notices",
    "/notice/:id",
    "/restaurant/:id",
    "/corner/:id",
];
