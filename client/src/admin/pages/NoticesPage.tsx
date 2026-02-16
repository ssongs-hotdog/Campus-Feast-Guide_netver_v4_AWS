import { useState, useEffect } from "react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Copy, Archive, Clock, Trash2 } from "lucide-react";
import { noticeStore, computeNoticeStatus } from "../data/noticeStore";
import { Notice, NoticeStatus, NoticeType, NoticeFormData, PublishMode, NOTICE_STATUS_LABELS, NOTICE_TYPE_LABELS, TargetScope } from "../data/noticeModel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { NoticeEditor } from "../components/notices/NoticeEditor";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [previewNotice, setPreviewNotice] = useState<Notice | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<NoticeStatus | "all">("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

    // Load notices
    const loadNotices = () => {
        const allNotices = noticeStore.getAll();
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

    const { toast } = useToast();

    // Handlers
    const handleCreateNew = () => {
        setEditingNotice(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (notice: Notice) => {
        setEditingNotice(notice);
        setIsEditorOpen(true);
        setPreviewNotice(null);
    };

    const handleDuplicate = (id: string) => {
        noticeStore.duplicate(id);
        loadNotices();
    };

    const handleArchive = (id: string) => {
        noticeStore.archive(id);
        loadNotices();
        toast({ title: "보관 완료", description: "공지가 보관함으로 이동되었습니다." });
    };

    const handleDelete = (id: string) => {
        if (confirm("정말로 이 공지를 삭제하시겠습니까?")) {
            noticeStore.delete(id);
            loadNotices();
            setPreviewNotice(null);
            toast({ title: "삭제 완료", description: "공지가 삭제되었습니다." });
        }
    };

    const handleBulkArchive = () => {
        noticeStore.bulkArchive(Array.from(selectedIds));
        setSelectedIds(new Set());
        loadNotices();
        toast({ title: "일괄 보관 완료", description: `${selectedIds.size}개의 공지가 보관되었습니다.` });
    };

    const handleBulkDelete = () => {
        if (confirm(`선택한 ${selectedIds.size}개의 공지를 삭제하시겠습니까?`)) {
            noticeStore.bulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
            loadNotices();
            toast({ title: "일괄 삭제 완료", description: "공지가 삭제되었습니다." });
        }
    };

    const handleEndNow = (id: string) => {
        noticeStore.endNow(id);
        loadNotices();
        toast({ title: "즉시 종료", description: "공지가 종료 처리되었습니다." });
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

    const handleSaveNotice = (data: NoticeFormData, isDraft: boolean) => {
        try {
            if (editingNotice) {
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
                toast({ title: "수정 완료", description: `"${data.title}" 공지가 수정되었습니다.` });
            } else {
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
                toast({ title: "작성 완료", description: `"${data.title}" 공지가 발행되었습니다.` });
            }
            loadNotices();
        } catch (error) {
            toast({ title: "오류", description: "저장 중 문제가 발생했습니다.", variant: "destructive" });
        }
    };

    // UI Helpers
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

    const getTypeColor = (type: NoticeType): string => {
        switch (type) {
            case NoticeType.URGENT: return "text-red-600 bg-red-50 border-red-200";
            case NoticeType.CAUTION: return "text-amber-600 bg-amber-50 border-amber-200";
            case NoticeType.GENERAL: return "text-gray-600 bg-gray-50 border-gray-200";
            default: return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    const formatDateShort = (dateStr: string | null): string => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yy}/${mm}/${dd}`;
    };

    const getTargetSummary = (notice: Notice): string => {
        if (notice.targetScope === TargetScope.ALL) return "전체";
        if (notice.targetScope === TargetScope.RESTAURANTS) return `식당 ${notice.restaurantIds?.length || 0}개`;
        if (notice.targetScope === TargetScope.CORNERS) return `코너 ${notice.cornerIds?.length || 0}개`;
        return "-";
    };

    return (
        <div className="space-y-4 pb-8">
            {/* Standard Header */}
            <AdminPageHeader
                title="공지사항"
                subtitle="앱 공지, 긴급 공지, 예약 발행 등 콘텐츠 발행을 관리합니다."
            />

            {/* Sub-Header Actions Tray */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    {/* Search Bar - Stretched */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="제목 또는 내용 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 w-full bg-white shadow-sm"
                        />
                    </div>

                    {/* Filters & Create Tray */}
                    <div className="flex items-center gap-3">
                        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as NoticeStatus | "all")} className="shadow-sm">
                            <TabsList className="h-10">
                                <TabsTrigger value="all">전체</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.PUBLISHED}>발행중</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.SCHEDULED}>예약됨</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.DRAFT}>초안</TabsTrigger>
                                <TabsTrigger value={NoticeStatus.EXPIRED}>종료됨</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 h-10 px-5 shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            새 공지 작성
                        </Button>
                    </div>
                </div>

                {/* Bulk Action Context Bar */}
                {selectedIds.size > 0 && (
                    <div className="bg-blue-600 text-white rounded-lg p-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-3">
                            <span className="font-semibold">{selectedIds.size}개 공지 선택됨</span>
                            <div className="h-4 w-px bg-white/30" />
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={handleBulkArchive} className="bg-white/10 hover:bg-white/20 border-white/20 text-white h-8">
                                    <Archive className="w-3.5 h-3.5 mr-1" />
                                    보관
                                </Button>
                                <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 h-8">
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    삭제
                                </Button>
                            </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-white hover:bg-white/10 h-8">
                            선택 해제
                        </Button>
                    </div>
                )}
            </div>

            {/* Notice List - Full Width Email Style */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-12 text-center">
                                <Checkbox
                                    checked={selectedIds.size === filteredNotices.length && filteredNotices.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-24 px-2">상태</TableHead>
                            <TableHead className="w-20 px-2">유형</TableHead>
                            <TableHead className="min-w-[400px]">제목</TableHead>
                            <TableHead className="w-28 px-2 text-center">대상</TableHead>
                            <TableHead className="w-40 px-2 text-center">노출 기간</TableHead>
                            <TableHead className="w-28 px-2 text-center">수정일</TableHead>
                            <TableHead className="w-32 text-center">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredNotices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <Search className="w-8 h-8 opacity-20" />
                                        <p>검색 결과가 없습니다.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredNotices.map((notice) => (
                                <TableRow
                                    key={notice.id}
                                    className={cn(
                                        "group cursor-pointer hover:bg-blue-50/30 transition-colors border-b last:border-0",
                                        selectedIds.has(notice.id) && "bg-blue-50/50"
                                    )}
                                    onClick={() => setPreviewNotice(notice)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()} className="py-2 text-center">
                                        <Checkbox
                                            checked={selectedIds.has(notice.id)}
                                            onCheckedChange={() => toggleSelection(notice.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="py-2 px-2">
                                        <Badge variant={getStatusVariant(notice.status)} className="font-normal px-2 py-0.5">
                                            {NOTICE_STATUS_LABELS[notice.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-2 px-2">
                                        <Badge className={cn("border font-normal px-2 py-0.5 shadow-none", getTypeColor(notice.type))}>
                                            {NOTICE_TYPE_LABELS[notice.type]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {notice.pinned && <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 flex-shrink-0">📌 고정</Badge>}
                                            <span className="font-medium text-gray-900 truncate">{notice.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 px-2 text-sm text-gray-500 text-center">
                                        {getTargetSummary(notice)}
                                    </TableCell>
                                    <TableCell className="py-2 px-2 text-xs text-gray-500 text-center">
                                        {formatDateShort(notice.startAt)} ~ {formatDateShort(notice.endAt)}
                                    </TableCell>
                                    <TableCell className="py-2 px-2 text-sm text-gray-500 text-center">
                                        {formatDateShort(notice.updatedAt)}
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()} className="py-2 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" onClick={() => handleEdit(notice)} className="w-8 h-8 rounded-full text-blue-600 hover:bg-blue-100 hover:text-blue-700">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleDuplicate(notice.id)} className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100">
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleDelete(notice.id)} className="w-8 h-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Preview Popup Dialog */}
            <Dialog open={!!previewNotice} onOpenChange={(open) => !open && setPreviewNotice(null)}>
                <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-xl">
                    <DialogHeader className="p-6 border-b bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-3">
                            {previewNotice && (
                                <>
                                    <Badge variant={getStatusVariant(previewNotice.status)}>{NOTICE_STATUS_LABELS[previewNotice.status]}</Badge>
                                    <Badge className={cn("border shadow-none", getTypeColor(previewNotice.type))}>{NOTICE_TYPE_LABELS[previewNotice.type]}</Badge>
                                </>
                            )}
                        </div>
                        <DialogTitle className="text-2xl font-bold leading-tight">
                            {previewNotice?.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {previewNotice?.body}
                        </div>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-4 border-t pt-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">노출 대상</span>
                                <span className="font-medium text-gray-900">{previewNotice && getTargetSummary(previewNotice)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">노출 위치</span>
                                <span className="font-medium text-gray-900">
                                    {previewNotice?.placements.inApp && "앱 내 메인"}
                                    {previewNotice?.placements.inApp && previewNotice?.placements.popup && " / "}
                                    {previewNotice?.placements.popup && "공지 팝업"}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">시작 일시</span>
                                <span className="font-medium text-gray-900">{previewNotice?.startAt ? new Date(previewNotice.startAt).toLocaleString() : "즉시"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">종료 일시</span>
                                <span className="font-medium text-gray-900">{previewNotice?.endAt ? new Date(previewNotice.endAt).toLocaleString() : "종료 없음"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                        {previewNotice && previewNotice.status === NoticeStatus.PUBLISHED && (
                            <Button variant="outline" onClick={() => handleEndNow(previewNotice.id)}>
                                <Clock className="w-4 h-4 mr-2" />
                                즉시 종료
                            </Button>
                        )}
                        <Button onClick={() => handleEdit(previewNotice!)} className="bg-blue-600 hover:bg-blue-700">
                            <Edit className="w-4 h-4 mr-2" />
                            공지 수정하기
                        </Button>
                        <Button variant="ghost" onClick={() => setPreviewNotice(null)}>닫기</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Editor Popup Dialog Component */}
            <NoticeEditor
                notice={editingNotice}
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveNotice}
            />
        </div>
    );
}
