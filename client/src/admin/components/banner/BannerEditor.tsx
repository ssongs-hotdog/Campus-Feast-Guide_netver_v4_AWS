import { useState, useEffect, useRef } from "react";
import { Banner, BannerFormData, LinkType, TargetScope, LINK_TYPE_LABELS, TARGET_SCOPE_LABELS, DEEPLINK_EXAMPLES, BannerStatus } from "../../data/bannerModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Upload, X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESTAURANTS } from "../../data/mock_canonical";

interface BannerEditorProps {
    open: boolean;
    onClose: () => void;
    banner?: Banner; // undefined = create, defined = edit
    onSave: (data: BannerFormData, isDraft: boolean) => void;
}

const RECOMMENDED_ASPECT_RATIO = 2.35;
const MAX_FILE_SIZE_MB = 5;

export function BannerEditor({ open, onClose, banner, onSave }: BannerEditorProps) {
    const [formData, setFormData] = useState<BannerFormData>({
        internalName: "",
        imageUrl: "",
        altText: "",
        linkType: LinkType.NONE,
        linkTarget: "",
        publishNow: false,
        schedule: false,
        startAt: "",
        endAt: "",
        targetScope: TargetScope.ALL,
        restaurantIds: [],
        cornerIds: [],
        memo: "",
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [imageWarning, setImageWarning] = useState<string>("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingIsDraft, setPendingIsDraft] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize form when banner changes
    useEffect(() => {
        if (banner) {
            // Edit mode
            setFormData({
                internalName: banner.internalName,
                imageUrl: banner.imageUrl,
                altText: banner.altText,
                linkType: banner.linkType,
                linkTarget: banner.linkTarget,
                publishNow: banner.status === BannerStatus.ACTIVE,
                schedule: banner.status === BannerStatus.SCHEDULED,
                startAt: banner.startAt || "",
                endAt: banner.endAt || "",
                targetScope: banner.targetScope,
                restaurantIds: banner.restaurantIds || [],
                cornerIds: banner.cornerIds || [],
                memo: banner.memo || "",
            });
            setImagePreview(banner.imageUrl);
        } else {
            // Create mode - reset
            setFormData({
                internalName: "",
                imageUrl: "",
                altText: "",
                linkType: LinkType.NONE,
                linkTarget: "",
                publishNow: false,
                schedule: false,
                startAt: "",
                endAt: "",
                targetScope: TargetScope.ALL,
                restaurantIds: [],
                cornerIds: [],
                memo: "",
            });
            setImageFile(null);
            setImagePreview("");
            setImageWarning("");
        }
    }, [banner, open]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // File size check
        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > MAX_FILE_SIZE_MB) {
            setImageWarning(`파일 크기가 ${sizeMB.toFixed(2)}MB입니다. ${MAX_FILE_SIZE_MB}MB 이하를 권장합니다.`);
        } else {
            setImageWarning("");
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setImagePreview(dataUrl);

            // Check aspect ratio
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                if (Math.abs(ratio - RECOMMENDED_ASPECT_RATIO) > 0.3) {
                    setImageWarning(
                        `권장 비율(2.35:1)과 다릅니다. 현재 비율: ${ratio.toFixed(2)}:1`
                    );
                }
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);

        setImageFile(file);
        setFormData({ ...formData, imageUrl: file.name });
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview("");
        setImageWarning("");
        setFormData({ ...formData, imageUrl: "" });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSaveClick = (isDraft: boolean) => {
        setPendingIsDraft(isDraft);
        if (!isDraft) {
            // Show confirmation for publish/schedule
            setShowConfirmDialog(true);
        } else {
            // Draft - save directly
            onSave({ ...formData, imageFile }, true);
            onClose();
        }
    };

    const handleConfirmPublish = () => {
        onSave({ ...formData, imageFile }, pendingIsDraft);
        setShowConfirmDialog(false);
        onClose();
    };

    const isFormValid = () => {
        if (!formData.internalName.trim()) return false;
        if (!formData.imageUrl && !imageFile) return false;
        if (!formData.altText.trim()) return false;
        if (formData.linkType === LinkType.EXTERNAL && !formData.linkTarget.trim()) return false;
        if (formData.linkType === LinkType.DEEPLINK && !formData.linkTarget.trim()) return false;
        return true;
    };

    const getConfirmationSummary = () => {
        const when = formData.schedule
            ? `예약: ${new Date(formData.startAt).toLocaleString("ko-KR")}`
            : "즉시 노출";
        const until = formData.endAt
            ? `종료: ${new Date(formData.endAt).toLocaleString("ko-KR")}`
            : "종료일 없음";
        const target = TARGET_SCOPE_LABELS[formData.targetScope];
        const link = formData.linkType === LinkType.NONE
            ? "링크 없음"
            : `${LINK_TYPE_LABELS[formData.linkType]}: ${formData.linkTarget}`;

        return { when, until, target, link };
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onClose}>
                <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{banner ? "배너 편집" : "새 배너 추가"}</SheetTitle>
                        <SheetDescription>
                            배너 이미지와 노출 일정을 설정하세요. 권장 비율은 2.35:1입니다.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {/* Internal Name */}
                        <div className="space-y-2">
                            <Label htmlFor="internalName" className="text-sm font-semibold">
                                내부 이름 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="internalName"
                                placeholder="운영진용 라벨 (예: 신학기 프로모션)"
                                value={formData.internalName}
                                onChange={(e) => setFormData({ ...formData, internalName: e.target.value })}
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                배너 이미지 <span className="text-red-500">*</span>
                            </Label>
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 h-8 w-8 bg-white/90 hover:bg-white shadow"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                    {imageWarning && (
                                        <div className="mt-2 flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>{imageWarning}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                                >
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600 font-medium">
                                        이미지 업로드
                                    </span>
                                    <span className="text-xs text-gray-400 mt-1">
                                        WebP, PNG, JPG (권장 비율 2.35:1)
                                    </span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>

                        {/* Alt Text */}
                        <div className="space-y-2">
                            <Label htmlFor="altText" className="text-sm font-semibold">
                                대체 텍스트 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="altText"
                                placeholder="이미지를 설명하는 텍스트"
                                value={formData.altText}
                                onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                            />
                        </div>

                        {/* Link Configuration */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">링크</Label>
                            <Select
                                value={formData.linkType}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, linkType: value as LinkType, linkTarget: "" })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={LinkType.NONE}>링크 없음</SelectItem>
                                    <SelectItem value={LinkType.EXTERNAL}>외부 URL</SelectItem>
                                    <SelectItem value={LinkType.DEEPLINK}>앱 내부 링크</SelectItem>
                                </SelectContent>
                            </Select>

                            {formData.linkType === LinkType.EXTERNAL && (
                                <Input
                                    placeholder="https://example.com"
                                    value={formData.linkTarget}
                                    onChange={(e) => setFormData({ ...formData, linkTarget: e.target.value })}
                                />
                            )}

                            {formData.linkType === LinkType.DEEPLINK && (
                                <div className="space-y-2">
                                    <Input
                                        placeholder="/home, /menu, /restaurant/:id"
                                        value={formData.linkTarget}
                                        onChange={(e) => setFormData({ ...formData, linkTarget: e.target.value })}
                                    />
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <p className="font-medium">예시:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {DEEPLINK_EXAMPLES.map((example) => (
                                                <code
                                                    key={example}
                                                    className="bg-gray-100 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-gray-200"
                                                    onClick={() => setFormData({ ...formData, linkTarget: example })}
                                                >
                                                    {example}
                                                </code>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Schedule */}
                        <div className="space-y-3 border-t pt-4">
                            <Label className="text-sm font-semibold">노출 일정</Label>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="schedule"
                                    checked={formData.schedule}
                                    onChange={(e) => setFormData({ ...formData, schedule: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="schedule" className="text-sm cursor-pointer">예약 노출</Label>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="startAt" className="text-xs text-gray-600">
                                        시작 일시 {!formData.schedule && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Input
                                        id="startAt"
                                        type="datetime-local"
                                        value={formData.startAt}
                                        onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="endAt" className="text-xs text-gray-600">
                                        종료 일시 (선택)
                                    </Label>
                                    <Input
                                        id="endAt"
                                        type="datetime-local"
                                        value={formData.endAt}
                                        onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Advanced Settings (Collapsible) */}
                        <div className="border-t pt-4">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 hover:text-gray-900"
                            >
                                <span>고급 설정</span>
                                {showAdvanced ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 space-y-4">
                                    {/* Targeting */}
                                    <div className="space-y-2">
                                        <Label className="text-sm">노출 대상</Label>
                                        <Select
                                            value={formData.targetScope}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    targetScope: value as TargetScope,
                                                    restaurantIds: [],
                                                    cornerIds: [],
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={TargetScope.ALL}>전체</SelectItem>
                                                <SelectItem value={TargetScope.RESTAURANTS}>특정 식당</SelectItem>
                                                <SelectItem value={TargetScope.CORNERS}>특정 코너</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {formData.targetScope === TargetScope.RESTAURANTS && (
                                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                                                <p className="font-medium mb-1">식당 선택 (플레이스홀더)</p>
                                                <p>API 연동 후 실제 식당 선택 UI 구현 예정</p>
                                            </div>
                                        )}

                                        {formData.targetScope === TargetScope.CORNERS && (
                                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                                                <p className="font-medium mb-1">코너 선택 (플레이스홀더)</p>
                                                <p>API 연동 후 실제 코너 선택 UI 구현 예정</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Memo */}
                                    <div className="space-y-2">
                                        <Label htmlFor="memo" className="text-sm">내부 메모</Label>
                                        <Textarea
                                            id="memo"
                                            placeholder="운영진용 메모 (선택)"
                                            value={formData.memo}
                                            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
                            <Button
                                variant="outline"
                                onClick={() => handleSaveClick(true)}
                                disabled={!isFormValid()}
                                className="flex-1"
                            >
                                초안 저장
                            </Button>
                            <Button
                                onClick={() => handleSaveClick(false)}
                                disabled={!isFormValid()}
                                className="flex-1 bg-[#0E4A84] hover:bg-[#0d4278]"
                            >
                                {formData.schedule ? "예약 확정" : "즉시 노출"}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>배너 노출 확정</DialogTitle>
                        <DialogDescription>
                            아래 내용으로 배너를 노출합니다. 확인해 주세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-4">
                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-32 object-cover rounded border"
                            />
                        )}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">배너 이름:</span>
                                <span className="font-medium">{formData.internalName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">노출 시작:</span>
                                <span className="font-medium">{getConfirmationSummary().when}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">노출 종료:</span>
                                <span className="font-medium">{getConfirmationSummary().until}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">노출 대상:</span>
                                <span className="font-medium">{getConfirmationSummary().target}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">링크:</span>
                                <span className="font-medium">{getConfirmationSummary().link}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            취소
                        </Button>
                        <Button onClick={handleConfirmPublish} className="bg-[#0E4A84] hover:bg-[#0d4278]">
                            확정
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
