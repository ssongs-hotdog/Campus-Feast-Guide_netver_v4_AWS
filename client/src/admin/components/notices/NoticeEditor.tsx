// Notice Editor Drawer Component

import { useState, useEffect } from "react";
import { Notice, NoticeType, NoticeFormData, PublishMode, TargetScope, NOTICE_TYPE_LABELS } from "../../data/noticeModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface NoticeEditorProps {
    notice: Notice | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NoticeFormData, isDraft: boolean) => void;
}

export function NoticeEditor({ notice, isOpen, onClose, onSave }: NoticeEditorProps) {
    const [formData, setFormData] = useState<NoticeFormData>({
        title: "",
        body: "",
        type: NoticeType.GENERAL,
        publishMode: PublishMode.DRAFT,
        startAt: "",
        endAt: "",
        pinned: false,
        placements: {
            inApp: true,
            popup: false,
        },
        targetScope: TargetScope.ALL,
        restaurantIds: [],
        cornerIds: [],
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingPublish, setPendingPublish] = useState(false);

    // Initialize form from notice
    useEffect(() => {
        if (notice) {
            setFormData({
                title: notice.title,
                body: notice.body,
                type: notice.type,
                publishMode: notice.startAt ? PublishMode.SCHEDULE : PublishMode.DRAFT,
                startAt: notice.startAt || "",
                endAt: notice.endAt || "",
                pinned: notice.pinned,
                placements: notice.placements,
                targetScope: notice.targetScope,
                restaurantIds: notice.restaurantIds || [],
                cornerIds: notice.cornerIds || [],
            });
        } else {
            // Reset for new notice
            setFormData({
                title: "",
                body: "",
                type: NoticeType.GENERAL,
                publishMode: PublishMode.DRAFT,
                startAt: "",
                endAt: "",
                pinned: false,
                placements: {
                    inApp: true,
                    popup: false,
                },
                targetScope: TargetScope.ALL,
                restaurantIds: [],
                cornerIds: [],
            });
        }
    }, [notice, isOpen]);

    const handleSaveDraft = () => {
        onSave(formData, true);
        onClose();
    };

    const handlePublishClick = () => {
        // Show confirmation dialog
        setShowConfirmDialog(true);
        setPendingPublish(true);
    };

    const handleConfirmPublish = () => {
        onSave(formData, false);
        setShowConfirmDialog(false);
        onClose();
    };

    const isValid = formData.title.trim() !== "" && formData.body.trim() !== "";

    if (!isOpen) return null;

    return (
        <>
            {/* Drawer Overlay */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end" onClick={onClose}>
                <div
                    className="bg-white h-full w-full max-w-2xl shadow-xl overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            {notice ? "공지 수정" : "새 공지 작성"}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Form Content */}
                    <div className="p-6 space-y-6">
                        {/* Section 1: Required Fields */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">기본 정보</h3>

                            {/* Title */}
                            <div>
                                <Label htmlFor="title">제목 *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="공지 제목을 입력하세요"
                                    className="mt-1"
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <Label htmlFor="body">내용 *</Label>
                                <Textarea
                                    id="body"
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    placeholder="공지 내용을 입력하세요 (Markdown 지원)"
                                    rows={6}
                                    className="mt-1"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <Label>유형 *</Label>
                                <RadioGroup
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value as NoticeType })}
                                    className="flex gap-4 mt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={NoticeType.GENERAL} id="type-general" />
                                        <Label htmlFor="type-general">{NOTICE_TYPE_LABELS[NoticeType.GENERAL]}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={NoticeType.CAUTION} id="type-caution" />
                                        <Label htmlFor="type-caution">{NOTICE_TYPE_LABELS[NoticeType.CAUTION]}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={NoticeType.URGENT} id="type-urgent" />
                                        <Label htmlFor="type-urgent">{NOTICE_TYPE_LABELS[NoticeType.URGENT]}</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* Section 2: Publishing */}
                        <div className="space-y-4 border-t pt-6">
                            <h3 className="font-semibold text-lg">발행 설정</h3>

                            {/* Publish Mode */}
                            <div>
                                <Label>발행 모드</Label>
                                <RadioGroup
                                    value={formData.publishMode}
                                    onValueChange={(value) => setFormData({ ...formData, publishMode: value as PublishMode })}
                                    className="flex flex-col gap-3 mt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={PublishMode.DRAFT} id="mode-draft" />
                                        <Label htmlFor="mode-draft">초안 (발행하지 않음)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={PublishMode.PUBLISH_NOW} id="mode-now" />
                                        <Label htmlFor="mode-now">즉시 발행</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value={PublishMode.SCHEDULE} id="mode-schedule" />
                                        <Label htmlFor="mode-schedule">예약 발행</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Start/End Dates */}
                            {(formData.publishMode === PublishMode.PUBLISH_NOW || formData.publishMode === PublishMode.SCHEDULE) && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="startAt">시작 일시 *</Label>
                                        <Input
                                            id="startAt"
                                            type="datetime-local"
                                            value={formData.startAt}
                                            onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="endAt">종료 일시</Label>
                                        <Input
                                            id="endAt"
                                            type="datetime-local"
                                            value={formData.endAt}
                                            onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Pinned */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pinned">상단 고정</Label>
                                <Switch
                                    id="pinned"
                                    checked={formData.pinned}
                                    onCheckedChange={(checked) => setFormData({ ...formData, pinned: checked })}
                                />
                            </div>

                            {/* Popup */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="popup">팝업으로 표시</Label>
                                <Switch
                                    id="popup"
                                    checked={formData.placements.popup}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, placements: { ...formData.placements, popup: checked } })
                                    }
                                />
                            </div>
                        </div>

                        {/* Section 3: Targeting (Advanced, Collapsible) */}
                        <div className="border-t pt-6">
                            <button
                                className="flex items-center justify-between w-full text-left"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                                <h3 className="font-semibold text-lg">대상 설정 (고급)</h3>
                                {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <Label>대상 범위</Label>
                                        <Select
                                            value={formData.targetScope}
                                            onValueChange={(value) => setFormData({ ...formData, targetScope: value as TargetScope })}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={TargetScope.ALL}>전체 사용자</SelectItem>
                                                <SelectItem value={TargetScope.RESTAURANTS}>특정 식당</SelectItem>
                                                <SelectItem value={TargetScope.CORNERS}>특정 코너</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.targetScope === TargetScope.RESTAURANTS && (
                                        <div>
                                            <Label>식당 선택</Label>
                                            <p className="text-sm text-gray-500 mt-1">
                                                (식당 선택 UI - 구현 예정)
                                            </p>
                                        </div>
                                    )}

                                    {formData.targetScope === TargetScope.CORNERS && (
                                        <div>
                                            <Label>코너 선택</Label>
                                            <p className="text-sm text-gray-500 mt-1">
                                                (코너 선택 UI - 구현 예정)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end">
                        <Button variant="outline" onClick={onClose}>
                            취소
                        </Button>
                        <Button variant="secondary" onClick={handleSaveDraft} disabled={!isValid}>
                            초안 저장
                        </Button>
                        <Button
                            onClick={handlePublishClick}
                            disabled={!isValid || formData.publishMode === PublishMode.DRAFT}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            발행/예약 확정
                        </Button>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>공지 발행 확인</DialogTitle>
                        <DialogDescription>
                            다음 내용으로 공지를 발행하시겠습니까?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">제목:</span>
                            <span className="font-medium">{formData.title}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">유형:</span>
                            <span className="font-medium">{NOTICE_TYPE_LABELS[formData.type]}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">대상:</span>
                            <span className="font-medium">
                                {formData.targetScope === TargetScope.ALL ? "전체" :
                                    formData.targetScope === TargetScope.RESTAURANTS ? `식당 ${formData.restaurantIds.length}개` :
                                        `코너 ${formData.cornerIds.length}개`}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">노출 위치:</span>
                            <span className="font-medium">
                                {formData.placements.inApp && "앱 내"}
                                {formData.placements.inApp && formData.placements.popup && " + "}
                                {formData.placements.popup && "팝업"}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">시작:</span>
                            <span className="font-medium">{formData.startAt || "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">종료:</span>
                            <span className="font-medium">{formData.endAt || "-"}</span>
                        </div>
                        {formData.pinned && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">고정:</span>
                                <span className="font-medium text-blue-600">상단 고정됨</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            취소
                        </Button>
                        <Button onClick={handleConfirmPublish} className="bg-blue-600 hover:bg-blue-700">
                            확인
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
