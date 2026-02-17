import { useState, useEffect } from "react";
import { CarouselSettings } from "../../data/bannerModel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CarouselSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    settings: CarouselSettings;
    onSave: (settings: CarouselSettings) => void;
}

export function CarouselSettingsDialog({
    open,
    onClose,
    settings,
    onSave,
}: CarouselSettingsDialogProps) {
    const [formData, setFormData] = useState<CarouselSettings>(settings);

    useEffect(() => {
        setFormData(settings);
    }, [settings, open]);

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>캐러셀 설정</DialogTitle>
                    <DialogDescription>
                        홈 화면 배너 캐러셀의 동작 방식을 설정합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Auto-rotate */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">자동 회전</Label>
                            <p className="text-xs text-gray-500">
                                배너가 자동으로 전환됩니다
                            </p>
                        </div>
                        <div
                            className={cn(
                                "w-11 h-6 rounded-full transition-colors relative cursor-pointer",
                                formData.autoRotate ? "bg-blue-600" : "bg-gray-300"
                            )}
                            onClick={() =>
                                setFormData({ ...formData, autoRotate: !formData.autoRotate })
                            }
                        >
                            <div
                                className={cn(
                                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                                    formData.autoRotate ? "translate-x-5" : "translate-x-0"
                                )}
                            />
                        </div>
                    </div>

                    {/* Interval */}
                    {formData.autoRotate && (
                        <div className="space-y-2">
                            <Label htmlFor="interval" className="text-sm font-semibold">
                                회전 간격 (초)
                            </Label>
                            <Input
                                id="interval"
                                type="number"
                                min={2}
                                max={10}
                                value={formData.intervalSec}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        intervalSec: parseInt(e.target.value) || 5,
                                    })
                                }
                            />
                            <p className="text-xs text-gray-500">권장: 4-6초</p>
                        </div>
                    )}

                    {/* Swipe enabled */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">스와이프 허용</Label>
                            <p className="text-xs text-gray-500">
                                사용자가 손가락으로 배너를 넘길 수 있습니다
                            </p>
                        </div>
                        <div
                            className={cn(
                                "w-11 h-6 rounded-full transition-colors relative cursor-pointer",
                                formData.swipeEnabled ? "bg-blue-600" : "bg-gray-300"
                            )}
                            onClick={() =>
                                setFormData({ ...formData, swipeEnabled: !formData.swipeEnabled })
                            }
                        >
                            <div
                                className={cn(
                                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                                    formData.swipeEnabled ? "translate-x-5" : "translate-x-0"
                                )}
                            />
                        </div>
                    </div>

                    {/* Show indicators */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">인디케이터 표시</Label>
                            <p className="text-xs text-gray-500">
                                점(dots)과 개수(1/4) 표시
                            </p>
                        </div>
                        <div
                            className={cn(
                                "w-11 h-6 rounded-full transition-colors relative cursor-pointer",
                                formData.showIndicators ? "bg-blue-600" : "bg-gray-300"
                            )}
                            onClick={() =>
                                setFormData({
                                    ...formData,
                                    showIndicators: !formData.showIndicators,
                                })
                            }
                        >
                            <div
                                className={cn(
                                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                                    formData.showIndicators ? "translate-x-5" : "translate-x-0"
                                )}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button onClick={handleSave} className="bg-[#0E4A84] hover:bg-[#0d4278]">
                        저장
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
