// Mock banner store for admin CMS (client-side, API-ready)

import { Banner, BannerStatus, LinkType, TargetScope, CarouselSettings } from "./bannerModel";

// Mock banner data
const MOCK_BANNERS: Banner[] = [
    {
        id: "banner-001",
        internalName: "신학기 특별 할인 프로모션",
        imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=340&fit=crop",
        altText: "신학기 특별 할인 프로모션 배너",
        linkType: LinkType.DEEPLINK,
        linkTarget: "/menu",
        status: BannerStatus.ACTIVE,
        startAt: "2026-02-10T00:00:00Z",
        endAt: "2026-02-28T23:59:59Z",
        targetScope: TargetScope.ALL,
        order: 1,
        memo: "신학기 시작 프로모션",
        createdAt: "2026-02-08T10:00:00Z",
        updatedAt: "2026-02-08T10:00:00Z",
        createdBy: "admin",
    },
    {
        id: "banner-002",
        internalName: "천원의 아침밥 신메뉴 출시",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=340&fit=crop",
        altText: "천원의 아침밥 신메뉴 안내",
        linkType: LinkType.DEEPLINK,
        linkTarget: "/corner/breakfast_1000",
        status: BannerStatus.ACTIVE,
        startAt: "2026-02-15T00:00:00Z",
        endAt: null,
        targetScope: TargetScope.CORNERS,
        cornerIds: ["breakfast_1000"],
        order: 2,
        memo: "아침 메뉴 홍보",
        createdAt: "2026-02-14T09:00:00Z",
        updatedAt: "2026-02-14T09:00:00Z",
        createdBy: "admin",
    },
    {
        id: "banner-003",
        internalName: "한양플라자 리뉴얼 안내",
        imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=340&fit=crop",
        altText: "한양플라자 리뉴얼 안내",
        linkType: LinkType.DEEPLINK,
        linkTarget: "/restaurant/hanyang_plaza",
        status: BannerStatus.SCHEDULED,
        startAt: "2026-03-01T00:00:00Z",
        endAt: "2026-03-31T23:59:59Z",
        targetScope: TargetScope.RESTAURANTS,
        restaurantIds: ["hanyang_plaza"],
        order: 3,
        memo: "3월 리뉴얼 홍보",
        createdAt: "2026-02-16T14:00:00Z",
        updatedAt: "2026-02-16T14:00:00Z",
        createdBy: "admin",
    },
    {
        id: "banner-004",
        internalName: "설문조사 참여 이벤트",
        imageUrl: "https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?w=800&h=340&fit=crop",
        altText: "설문조사 참여 이벤트",
        linkType: LinkType.EXTERNAL,
        linkTarget: "https://forms.gle/example",
        status: BannerStatus.DRAFT,
        startAt: null,
        endAt: null,
        targetScope: TargetScope.ALL,
        order: 4,
        memo: "설문조사 배너 (초안)",
        createdAt: "2026-02-17T10:00:00Z",
        updatedAt: "2026-02-17T10:00:00Z",
        createdBy: "admin",
    },
];

// Default carousel settings
const DEFAULT_CAROUSEL_SETTINGS: CarouselSettings = {
    autoRotate: true,
    intervalSec: 5,
    swipeEnabled: true,
    showIndicators: true,
};

// Client-side store (will be replaced by API calls)
class BannerStore {
    private banners: Banner[] = [...MOCK_BANNERS];
    private nextId = 5;
    private settings: CarouselSettings = { ...DEFAULT_CAROUSEL_SETTINGS };

    getAll(): Banner[] {
        return [...this.banners].sort((a, b) => a.order - b.order);
    }

    getById(id: string): Banner | undefined {
        return this.banners.find(b => b.id === id);
    }

    getActive(): Banner[] {
        return this.banners
            .filter(b => b.status === BannerStatus.ACTIVE)
            .sort((a, b) => a.order - b.order);
    }

    create(banner: Omit<Banner, "id" | "createdAt" | "updatedAt">): Banner {
        const now = new Date().toISOString();
        const newBanner: Banner = {
            ...banner,
            id: `banner-${String(this.nextId++).padStart(3, "0")}`,
            createdAt: now,
            updatedAt: now,
        };
        this.banners.push(newBanner);
        return newBanner;
    }

    update(id: string, updates: Partial<Banner>): Banner | null {
        const index = this.banners.findIndex(b => b.id === id);
        if (index === -1) return null;

        const updated: Banner = {
            ...this.banners[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        this.banners[index] = updated;
        return updated;
    }

    delete(id: string): boolean {
        const index = this.banners.findIndex(b => b.id === id);
        if (index === -1) return false;
        this.banners.splice(index, 1);
        return true;
    }

    archive(id: string): Banner | null {
        return this.update(id, { status: BannerStatus.ARCHIVED });
    }

    duplicate(id: string): Banner | null {
        const original = this.getById(id);
        if (!original) return null;

        const { id: _, createdAt, updatedAt, ...rest } = original;
        const maxOrder = Math.max(...this.banners.map(b => b.order), 0);
        return this.create({
            ...rest,
            internalName: `${original.internalName} (복사본)`,
            status: BannerStatus.DRAFT,
            startAt: null,
            endAt: null,
            order: maxOrder + 1,
        });
    }

    // Reorder banners
    reorder(ids: string[]): void {
        ids.forEach((id, index) => {
            const banner = this.banners.find(b => b.id === id);
            if (banner) {
                banner.order = index + 1;
                banner.updatedAt = new Date().toISOString();
            }
        });
    }

    // Carousel settings
    getSettings(): CarouselSettings {
        return { ...this.settings };
    }

    updateSettings(updates: Partial<CarouselSettings>): CarouselSettings {
        this.settings = { ...this.settings, ...updates };
        return { ...this.settings };
    }
}

export const bannerStore = new BannerStore();

// Helper to compute status based on dates (similar to notice)
export function computeBannerStatus(banner: Banner): BannerStatus {
    if (banner.status === BannerStatus.DRAFT || banner.status === BannerStatus.ARCHIVED) {
        return banner.status;
    }

    const now = new Date();
    const start = banner.startAt ? new Date(banner.startAt) : null;
    const end = banner.endAt ? new Date(banner.endAt) : null;

    if (end && end < now) {
        return BannerStatus.ENDED;
    }

    if (start && start > now) {
        return BannerStatus.SCHEDULED;
    }

    return BannerStatus.ACTIVE;
}
