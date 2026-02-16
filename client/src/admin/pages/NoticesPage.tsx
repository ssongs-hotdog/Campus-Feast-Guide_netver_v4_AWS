import { useState, useEffect } from "react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Copy, Archive, Clock } from "lucide-react";
import { noticeStore, computeNoticeStatus } from "../data/noticeStore";
import { Notice, NoticeStatus, NoticeType, NoticeFormData, PublishMode, NOTICE_STATUS_LABELS, NOTICE_TYPE_LABELS, TargetScope } from "../data/noticeModel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { NoticeEditor } from "../components/notices/NoticeEditor";
import { useToast } from "@/hooks/use-toast";

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<NoticeStatus | "all">("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

    // Load notices
    const loadNotices = () => {
        const allNotices = noticeStore.getAll();
        // Update computed statuses
        const updated = allNotices.map(n => ({
            ...n,
            status: computeNoticeStatus(n),
        }));
        setNotices(updated);
    };

    useEffect(() => {
        loadNotices();
    }, []);

    // Filter notices
    const filteredNotices = notices.filter(notice => {
        const matchesSearch = notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notice.body.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || notice.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Handlers
    const handleCreateNew = () => {
        setEditingNotice(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (notice: Notice) => {
        setEditingNotice(notice);
        setIsEditorOpen(true);
    };

    const handleDuplicate = (id: string) => {
        noticeStore.duplicate(id);
        loadNotices();
    };

    const handleArchive = (id: string) => {
        noticeStore.archive(id);
        loadNotices();
        if (selectedNotice?.id === id) {
            setSelectedNotice(null);
        }
    };

    const handleBulkArchive = () => {
        noticeStore.bulkArchive(Array.from(selectedIds));
        setSelectedIds(new Set());
        loadNotices();
    };

    const handleEndNow = (id: string) => {
        noticeStore.endNow(id);
        loadNotices();
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredNotices.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredNotices.map(n => n.id)));
        }
    };

    const { toast } = useToast();

    const handleSaveNotice = (data: NoticeFormData, isDraft: boolean) => {
        try {
            if (editingNotice) {
                // Update existing notice
                const updates: Partial<Notice> = {
                    title: data.title,
                    body: data.body,
                    type: data.type,
                    pinned: data.pinned,
                    placements: data.placements,
                    targetScope: data.targetScope,
                    restaurantIds: data.restaurantIds,
                    cornerIds: data.cornerIds,
                };

                if (!isDraft) {
                    if (data.publishMode === PublishMode.PUBLISH_NOW) {
                        updates.startAt = new Date().toISOString();
                        updates.endAt = data.endAt || null;
                        updates.status = NoticeStatus.PUBLISHED;
                    } else if (data.publishMode === PublishMode.SCHEDULE) {
                        updates.startAt = data.startAt;
                        updates.endAt = data.endAt || null;
                        updates.status = NoticeStatus.SCHEDULED;
                    }
                } else {
                    updates.status = NoticeStatus.DRAFT;
                }

                noticeStore.update(editingNotice.id, updates);
                toast({
                    title: "공지 수정 완료",
                    description: `"${data.title}" 공지가 수정되었습니다.`,
                });
            } else {
                // Create new notice
                const newNotice: Omit<Notice, "id" | "createdAt" | "updatedAt"> = {
                    title: data.title,
                    body: data.body,
                    type: data.type,
                    status: isDraft ? NoticeStatus.DRAFT :
                        data.publishMode === PublishMode.PUBLISH_NOW ? NoticeStatus.PUBLISHED :
                            NoticeStatus.SCHEDULED,
                    placements: data.placements,
                    pinned: data.pinned,
                    targetScope: data.targetScope,
                    restaurantIds: data.restaurantIds,
                    cornerIds: data.cornerIds,
                    startAt: isDraft ? null :
                        data.publishMode === PublishMode.PUBLISH_NOW ? new Date().toISOString() :
                            data.startAt,
                    endAt: data.endAt || null,
                };

                noticeStore.create(newNotice);
                toast({
                    title: "공지 작성 완료",
                    description: `"${data.title}" 공지가 작성되었습니다.`,
                });
            }

            loadNotices();
        } catch (error) {
            toast({
                title: "오류 발생",
                description: "공지 저장 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        }
    };

    // Status badge variant
    const getStatusVariant = (status: NoticeStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case NoticeStatus.PUBLISHED: return "default";
            case NoticeStatus.SCHEDULED: return "secondary";
            case NoticeStatus.DRAFT: return "outline";
            case NoticeStatus.EXPIRED: return "destructive";
            case NoticeStatus.ARCHIVED: return "outline";
            default: return "outline";
        }
    };

    // Type badge color
    const getTypeColor = (type: NoticeType): string => {
        switch (type) {
            case NoticeType.URGENT: return "text-red-600 bg-red-50 border-red-200";
            case NoticeType.CAUTION: return "text-amber-600 bg-amber-50 border-amber-200";
            case NoticeType.GENERAL: return "text-gray-600 bg-gray-50 border-gray-200";
            default: return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    // Format date
    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
    };

    // Get target summary
    const getTargetSummary = (notice: Notice): string => {
        if (notice.targetScope === TargetScope.ALL) return "전체";
        if (notice.targetScope === TargetScope.RESTAURANTS && notice.restaurantIds) {
            return `식당 ${notice.restaurantIds.length}개`;
        }
        if (notice.targetScope === TargetScope.CORNERS && notice.cornerIds) {
            return `코너 ${notice.cornerIds.length}개`;
        }
        return "-";
    };

    return (
        <div className="space-y-4 pb-8">
            {/* Page Header - matching Dashboard layout */}
            <AdminPageHeader
                title="공지사항"
                subtitle="앱 공지/긴급 공지/예약 발행을 관리합니다."
                lastUpdated={new Date()}
                autoRefresh={false}
                onAutoRefreshChange={() => { }}
                isLoading={false}
                rightAction={
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="제목 또는 내용 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Status Filter */}
                        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as NoticeStatus | "all")}>
                            <TabsList>
                                <TabsTrigger value="all">전체</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.PUBLISHED}>발행중</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.SCHEDULED}>예약됨</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.DRAFT}>초안</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.EXPIRED}>종료됨</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Create Button */}
                        <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-1" />
                            새 공지 작성
                        </Button>
                    </div>
                }
            />

            {/* Main 2-Column Layout */}
            <div className="grid grid-cols-[1fr_400px] gap-4">
                {/* LEFT: Notice List */}
                <div className="space-y-4">
                    {/* Bulk Actions Toolbar */}
                    {selectedIds.size > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-900">
                                {selectedIds.size}개 선택됨
                            </span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleBulkArchive}>
                                    보관
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                                    선택 해제
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Notice List Table */}
                    <div className="bg-white rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedIds.size === filteredNotices.length && filteredNotices.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-24">상태</TableHead>
                                    <TableHead className="w-20">유형</TableHead>
                                    <TableHead>제목</TableHead>
                                    <TableHead className="w-32">대상</TableHead>
                                    <TableHead className="w-40">시작~종료</TableHead>
                                    <TableHead className="w-32">수정일</TableHead>
                                    <TableHead className="w-32">작업</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredNotices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <p>공지사항이 없습니다.</p>
                                                <Button size="sm" onClick={handleCreateNew} variant="outline">
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    새 공지 작성
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredNotices.map((notice) => (
                                        <TableRow
                                            key={notice.id}
                                            className={cn(
                                                "cursor-pointer hover:bg-gray-50",
                                                selectedNotice?.id === notice.id && "bg-blue-50"
                                            )}
                                            onClick={() => setSelectedNotice(notice)}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.has(notice.id)}
                                                    onCheckedChange={() => toggleSelection(notice.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(notice.status)}>
                                                    {NOTICE_STATUS_LABELS[notice.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("border", getTypeColor(notice.type))}>
                                                    {NOTICE_TYPE_LABELS[notice.type]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {notice.pinned && <span className="text-blue-600">📌</span>}
                                                    <span className="font-medium">{notice.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {getTargetSummary(notice)}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {formatDate(notice.startAt)} ~ {formatDate(notice.endAt)}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {formatDate(notice.updatedAt)}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(notice)}
                                                        className="h-7 px-2"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDuplicate(notice.id)}
                                                        className="h-7 px-2"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleArchive(notice.id)}
                                                        className="h-7 px-2"
                                                    >
                                                        <Archive className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* RIGHT: Preview Panel */}
                <div className="bg-white rounded-lg border p-4 sticky top-4 h-fit">
                    {selectedNotice ? (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={getStatusVariant(selectedNotice.status)}>
                                        {NOTICE_STATUS_LABELS[selectedNotice.status]}
                                    </Badge>
                                    <Badge className={cn("border", getTypeColor(selectedNotice.type))}>
                                        {NOTICE_TYPE_LABELS[selectedNotice.type]}
                                    </Badge>
                                    {selectedNotice.pinned && <span className="text-blue-600">📌 고정</span>}
                                </div>
                                <h3 className="font-semibold text-lg">{selectedNotice.title}</h3>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedNotice.body}</p>
                            </div>

                            <div className="border-t pt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">대상:</span>
                                    <span className="font-medium">{getTargetSummary(selectedNotice)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">노출 위치:</span>
                                    <span className="font-medium">
                                        {selectedNotice.placements.inApp && "앱 내"}
                                        {selectedNotice.placements.inApp && selectedNotice.placements.popup && " + "}
                                        {selectedNotice.placements.popup && "팝업"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">시작:</span>
                                    <span className="font-medium">{formatDate(selectedNotice.startAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">종료:</span>
                                    <span className="font-medium">{formatDate(selectedNotice.endAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">최종 수정:</span>
                                    <span className="font-medium">{formatDate(selectedNotice.updatedAt)}</span>
                                </div>
                            </div>

                            <div className="border-t pt-4 flex gap-2">
                                <Button size="sm" onClick={() => handleEdit(selectedNotice)} className="flex-1">
                                    <Edit className="w-4 h-4 mr-1" />
                                    수정
                                </Button>
                                {selectedNotice.status === NoticeStatus.PUBLISHED && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEndNow(selectedNotice.id)}
                                    >
                                        <Clock className="w-4 h-4 mr-1" />
                                        즉시 종료
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                            목록에서 공지를 선택하면 미리보기가 표시됩니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Drawer */}
            <NoticeEditor
                notice={editingNotice}
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveNotice}
            />
        </div>
    );
}
