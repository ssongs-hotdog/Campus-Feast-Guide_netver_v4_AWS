import { useState, useRef } from "react";
import { Banner, BannerStatus, BANNER_STATUS_LABELS, LINK_TYPE_LABELS, TARGET_SCOPE_LABELS } from "../../data/bannerModel";
import { Button } from "@/components/ui/button";
import { GripVertical, Edit, Copy, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface BannerListProps {
    banners: Banner[];
    onEdit: (banner: Banner) => void;
    onDuplicate: (banner: Banner) => void;
    onArchive: (banner: Banner) => void;
    onReorder: (ids: string[]) => void;
    isLoading?: boolean;
}

export function BannerList({
    banners,
    onEdit,
    onDuplicate,
    onArchive,
    onReorder,
    isLoading = false,
}: BannerListProps) {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

    // Filter banners
    const filteredBanners = banners.filter(banner => {
        if (statusFilter !== "all" && banner.status !== statusFilter) {
            return false;
        }

        if (dateRangeFilter === "today") {
            const now = new Date();
            const start = banner.startAt ? new Date(banner.startAt) : null;
            const end = banner.endAt ? new Date(banner.endAt) : null;
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (start && (start < today || start >= tomorrow)) return false;
        } else if (dateRangeFilter === "week") {
            const now = new Date();
            const start = banner.startAt ? new Date(banner.startAt) : null;
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            if (start && (start < weekStart || start >= weekEnd)) return false;
        }

        return true;
    });

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(filteredBanners);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        onReorder(items.map(b => b.id));
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

    const getStatusColor = (status: BannerStatus) => {
        switch (status) {
            case BannerStatus.ACTIVE:
                return "bg-green-100 text-green-800 border-green-200";
            case BannerStatus.SCHEDULED:
                return "bg-blue-100 text-blue-800 border-blue-200";
            case BannerStatus.DRAFT:
                return "bg-gray-100 text-gray-800 border-gray-200";
            case BannerStatus.ENDED:
                return "bg-orange-100 text-orange-800 border-orange-200";
            case BannerStatus.ARCHIVED:
                return "bg-slate-100 text-slate-600 border-slate-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getTargetSummary = (banner: Banner) => {
        if (banner.targetScope === "all") return "전체";
        if (banner.targetScope === "restaurants") {
            const count = banner.restaurantIds?.length || 0;
            return `식당 ${count}개`;
        }
        if (banner.targetScope === "corners") {
            const count = banner.cornerIds?.length || 0;
            return `코너 ${count}개`;
        }
        return "-";
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (filteredBanners.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-100 rounded-xl">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">배너가 없습니다</h3>
                <p className="text-sm text-gray-500">새 배너를 추가하여 시작하세요.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 h-9 text-sm">
                        <SelectValue placeholder="상태 필터" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">전체 상태</SelectItem>
                        <SelectItem value={BannerStatus.ACTIVE}>노출중</SelectItem>
                        <SelectItem value={BannerStatus.SCHEDULED}>예약됨</SelectItem>
                        <SelectItem value={BannerStatus.DRAFT}>초안</SelectItem>
                        <SelectItem value={BannerStatus.ENDED}>종료됨</SelectItem>
                        <SelectItem value={BannerStatus.ARCHIVED}>보관됨</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                    <SelectTrigger className="w-36 h-9 text-sm">
                        <SelectValue placeholder="기간 필터" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">전체 기간</SelectItem>
                        <SelectItem value="today">오늘</SelectItem>
                        <SelectItem value="week">이번 주</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Banner List */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="banners">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                        >
                            {filteredBanners.map((banner, index) => (
                                <Draggable
                                    key={banner.id}
                                    draggableId={banner.id}
                                    index={index}
                                    isDragDisabled={banner.status === BannerStatus.ARCHIVED}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={cn(
                                                "bg-white border rounded-lg p-3 transition-shadow",
                                                snapshot.isDragging ? "shadow-lg border-blue-300" : "shadow-none border-gray-200 hover:shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Drag Handle */}
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className={cn(
                                                        "flex items-center justify-center",
                                                        banner.status === BannerStatus.ARCHIVED
                                                            ? "cursor-not-allowed opacity-30"
                                                            : "cursor-grab active:cursor-grabbing"
                                                    )}
                                                >
                                                    <GripVertical className="w-5 h-5 text-gray-400" />
                                                </div>

                                                {/* Order Index */}
                                                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded text-xs font-bold text-gray-600">
                                                    {banner.order}
                                                </div>

                                                {/* Thumbnail */}
                                                <img
                                                    src={banner.imageUrl}
                                                    alt={banner.altText}
                                                    className="w-32 h-14 object-cover rounded border border-gray-100"
                                                />

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Row 1: Title + Status (single line, no wrap) */}
                                                    <div className="flex items-center gap-2 mb-1 whitespace-nowrap overflow-hidden">
                                                        <h4 className="font-semibold text-sm text-gray-800 overflow-hidden text-ellipsis">
                                                            {banner.internalName}
                                                        </h4>
                                                        <span
                                                            className={cn(
                                                                "px-2 py-0.5 text-xs font-medium border rounded shrink-0",
                                                                getStatusColor(banner.status)
                                                            )}
                                                        >
                                                            {BANNER_STATUS_LABELS[banner.status]}
                                                        </span>
                                                    </div>

                                                    {/* Row 2: Date + Link Type + Action Buttons (single line, no wrap) */}
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 whitespace-nowrap">
                                                        <span>
                                                            {formatDate(banner.startAt)} ~ {formatDate(banner.endAt)}
                                                        </span>
                                                        <span className="text-gray-300">|</span>
                                                        <span>{LINK_TYPE_LABELS[banner.linkType]}</span>

                                                        {/* Action Buttons (icon-only, right-aligned) */}
                                                        <div className="flex items-center gap-0.5 ml-auto">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onEdit(banner)}
                                                                className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600"
                                                                title="편집"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onDuplicate(banner)}
                                                                className="h-7 w-7 hover:bg-gray-50"
                                                                title="복사"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => onArchive(banner)}
                                                                disabled={banner.status === BannerStatus.ARCHIVED}
                                                                className="h-7 w-7 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                                                title="삭제"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
}
