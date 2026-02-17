import { useState, useEffect } from "react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { BannerList } from "../components/banner/BannerList";
import { CarouselPreview } from "../components/banner/CarouselPreview";
import { BannerEditor } from "../components/banner/BannerEditor";
import { CarouselSettingsDialog } from "../components/banner/CarouselSettingsDialog";
import { bannerStore, computeBannerStatus } from "../data/bannerStore";
import { Banner, BannerFormData, BannerStatus } from "../data/bannerModel";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [carouselSettings, setCarouselSettings] = useState(bannerStore.getSettings());
    const [isLoading, setIsLoading] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined);
    const { toast } = useToast();

    // Load banners
    const loadBanners = () => {
        setIsLoading(true);
        // Simulate async load
        setTimeout(() => {
            const allBanners = bannerStore.getAll();
            setBanners(allBanners);
            setIsLoading(false);
        }, 300);
    };

    useEffect(() => {
        loadBanners();
    }, []);

    // Get active banners for preview
    const activeBanners = banners.filter((b) => {
        const status = computeBannerStatus(b);
        return status === BannerStatus.ACTIVE;
    });

    const handleCreateBanner = () => {
        setEditingBanner(undefined);
        setEditorOpen(true);
    };

    const handleEditBanner = (banner: Banner) => {
        setEditingBanner(banner);
        setEditorOpen(true);
    };

    const handleDuplicateBanner = (banner: Banner) => {
        const duplicated = bannerStore.duplicate(banner.id);
        if (duplicated) {
            loadBanners();
            toast({
                title: "배너 복사 완료",
                description: `"${duplicated.internalName}"이(가) 생성되었습니다.`,
            });
        }
    };

    const handleArchiveBanner = (banner: Banner) => {
        const archived = bannerStore.archive(banner.id);
        if (archived) {
            loadBanners();
            toast({
                title: "배너 보관 완료",
                description: `"${banner.internalName}"을(를) 보관했습니다.`,
            });
        }
    };

    const handleReorderBanners = (ids: string[]) => {
        bannerStore.reorder(ids);
        loadBanners();
        toast({
            title: "순서 변경 완료",
            description: "배너 순서가 업데이트되었습니다.",
        });
    };

    const handleSaveBanner = (data: BannerFormData, isDraft: boolean) => {
        // Determine status
        let status: BannerStatus = BannerStatus.DRAFT;
        if (!isDraft) {
            if (data.schedule) {
                status = BannerStatus.SCHEDULED;
            } else {
                status = BannerStatus.ACTIVE;
            }
        }

        // In real implementation, upload image file here and get URL
        // For now, use preview URL or existing URL
        const imageUrl = data.imageFile
            ? URL.createObjectURL(data.imageFile)
            : data.imageUrl;

        if (editingBanner) {
            // Update existing
            bannerStore.update(editingBanner.id, {
                internalName: data.internalName,
                imageUrl,
                altText: data.altText,
                linkType: data.linkType,
                linkTarget: data.linkTarget,
                status,
                startAt: data.startAt || null,
                endAt: data.endAt || null,
                targetScope: data.targetScope,
                restaurantIds: data.restaurantIds.length > 0 ? data.restaurantIds : undefined,
                cornerIds: data.cornerIds.length > 0 ? data.cornerIds : undefined,
                memo: data.memo || undefined,
            });
            toast({
                title: "배너 수정 완료",
                description: `"${data.internalName}"이(가) 수정되었습니다.`,
            });
        } else {
            // Create new
            const maxOrder = Math.max(...banners.map((b) => b.order), 0);
            bannerStore.create({
                internalName: data.internalName,
                imageUrl,
                altText: data.altText,
                linkType: data.linkType,
                linkTarget: data.linkTarget,
                status,
                startAt: data.startAt || null,
                endAt: data.endAt || null,
                targetScope: data.targetScope,
                restaurantIds: data.restaurantIds.length > 0 ? data.restaurantIds : undefined,
                cornerIds: data.cornerIds.length > 0 ? data.cornerIds : undefined,
                order: maxOrder + 1,
                memo: data.memo || undefined,
            });
            toast({
                title: "배너 생성 완료",
                description: `"${data.internalName}"이(가) 생성되었습니다.`,
            });
        }

        loadBanners();
    };

    const handleSaveSettings = (settings: typeof carouselSettings) => {
        bannerStore.updateSettings(settings);
        setCarouselSettings(settings);
        toast({
            title: "설정 저장 완료",
            description: "캐러셀 설정이 업데이트되었습니다.",
        });
    };

    return (
        <div className="space-y-4 pb-8">
            {/* Page Header */}
            <AdminPageHeader
                title="배너 관리"
                subtitle="홈 배너 캐러셀과 노출 기간/순서를 관리합니다."
                rightAction={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setSettingsOpen(true)}
                            className="h-9 px-3 text-sm"
                        >
                            <Settings className="w-4 h-4 mr-1.5" />
                            캐러셀 설정
                        </Button>
                        <Button
                            onClick={handleCreateBanner}
                            className="h-9 px-4 text-sm bg-[#0E4A84] hover:bg-[#0d4278]"
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            새 배너 추가
                        </Button>
                    </div>
                }
            />

            {/* Two-column Layout */}
            <div className="grid grid-cols-12 gap-6">
                {/* Left: Banner List */}
                <div className="col-span-12 lg:col-span-7">
                    <BannerList
                        banners={banners}
                        onEdit={handleEditBanner}
                        onDuplicate={handleDuplicateBanner}
                        onArchive={handleArchiveBanner}
                        onReorder={handleReorderBanners}
                        isLoading={isLoading}
                    />
                </div>

                {/* Right: Live Preview */}
                <div className="col-span-12 lg:col-span-5">
                    <div className="sticky top-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">
                                실시간 미리보기
                            </h3>
                            <span className="text-xs text-gray-500">
                                노출중 배너 {activeBanners.length}개
                            </span>
                        </div>
                        <div className="aspect-[2.35/1] w-full">
                            <CarouselPreview
                                banners={activeBanners}
                                autoRotate={carouselSettings.autoRotate}
                                intervalSec={carouselSettings.intervalSec}
                                showIndicators={carouselSettings.showIndicators}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            앱에서 사용자에게 표시되는 모습입니다
                        </p>
                    </div>
                </div>
            </div>

            {/* Banner Editor Drawer */}
            <BannerEditor
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                banner={editingBanner}
                onSave={handleSaveBanner}
            />

            {/* Carousel Settings Dialog */}
            <CarouselSettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={carouselSettings}
                onSave={handleSaveSettings}
            />
        </div>
    );
}
