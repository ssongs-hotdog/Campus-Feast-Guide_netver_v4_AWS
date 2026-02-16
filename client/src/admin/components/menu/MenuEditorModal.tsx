import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import type { MenuCornerData } from "../../data/mockMenuPlanData";

interface MenuEditorModalProps {
    open: boolean;
    onClose: () => void;
    corner: MenuCornerData | undefined;
    date: string;
    price: number;
    servings: number;
    onSave: (updates: Partial<MenuCornerData>) => void;
    onServingsChange: (val: number) => void;
}

export function MenuEditorModal({
    open,
    onClose,
    corner,
    date,
    price,
    servings,
    onSave,
    onServingsChange
}: MenuEditorModalProps) {
    const [localCorner, setLocalCorner] = useState<MenuCornerData | undefined>(corner);
    const [localServings, setLocalServings] = useState(servings);
    const [newItem, setNewItem] = useState("");
    const [newVariantItem, setNewVariantItem] = useState<Record<number, string>>({});

    // Sync with props when they change
    useEffect(() => {
        if (corner) {
            setLocalCorner(JSON.parse(JSON.stringify(corner)));
        } else if (open) {
            // Create new empty menu template
            const cornerName = "New Menu"; // Will be properly set in main component
            setLocalCorner({
                restaurantId: "",
                cornerId: "",
                cornerDisplayName: cornerName,
                mainMenuName: "",
                priceWon: price,
                items: []
            });
        }
        setLocalServings(servings);
    }, [corner, servings, open, price]);

    if (!localCorner) {
        return null;
    }

    const handleSave = () => {
        if (localCorner) {
            onSave(localCorner);
            onServingsChange(localServings);
        }
        onClose();
    };

    const handleCancel = () => {
        setLocalCorner(corner ? JSON.parse(JSON.stringify(corner)) : undefined);
        setLocalServings(servings);
        onClose();
    };

    const updateLocal = (updates: Partial<MenuCornerData>) => {
        setLocalCorner(prev => prev ? { ...prev, ...updates } : undefined);
    };

    const handleAddItem = () => {
        if (newItem.trim() && localCorner) {
            updateLocal({ items: [...localCorner.items, newItem.trim()] });
            setNewItem("");
        }
    };

    const removeItem = (index: number) => {
        if (localCorner) {
            updateLocal({ items: localCorner.items.filter((_, i) => i !== index) });
        }
    };

    const addVariant = () => {
        if (localCorner) {
            const variants = localCorner.variants || [];
            updateLocal({ variants: [...variants, { mainMenuName: "", items: [] }] });
        }
    };

    const removeVariant = (index: number) => {
        if (localCorner?.variants) {
            updateLocal({ variants: localCorner.variants.filter((_, i) => i !== index) });
        }
    };

    const updateVariant = (index: number, updates: Partial<{ mainMenuName: string; items: string[] }>) => {
        if (localCorner?.variants) {
            updateLocal({
                variants: localCorner.variants.map((v, i) => i === index ? { ...v, ...updates } : v)
            });
        }
    };

    const addVariantItem = (variantIndex: number) => {
        const item = newVariantItem[variantIndex];
        if (item?.trim() && localCorner?.variants) {
            const variant = localCorner.variants[variantIndex];
            updateVariant(variantIndex, { items: [...variant.items, item.trim()] });
            setNewVariantItem(prev => ({ ...prev, [variantIndex]: "" }));
        }
    };

    const removeVariantItem = (variantIndex: number, itemIndex: number) => {
        if (localCorner?.variants) {
            const variant = localCorner.variants[variantIndex];
            updateVariant(variantIndex, { items: variant.items.filter((_, i) => i !== itemIndex) });
        }
    };

    const dateLabel = new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {localCorner.cornerDisplayName} · {dateLabel}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Main Menu Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            메인메뉴명 *
                        </label>
                        <Input
                            value={localCorner.mainMenuName}
                            onChange={(e) => updateLocal({ mainMenuName: e.target.value })}
                            placeholder="예: 제육볶음"
                            className="text-lg h-12"
                            autoFocus
                        />
                    </div>

                    {/* Items */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            세부메뉴 항목
                        </label>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-lg border border-gray-200">
                                {localCorner.items.length === 0 ? (
                                    <span className="text-gray-400 text-sm">항목을 추가하세요</span>
                                ) : (
                                    localCorner.items.map((item, idx) => (
                                        <Badge key={idx} variant="secondary" className="gap-1 px-3 py-1.5 text-sm">
                                            {item}
                                            <X
                                                className="w-3.5 h-3.5 cursor-pointer hover:text-rose-600"
                                                onClick={() => removeItem(idx)}
                                            />
                                        </Badge>
                                    ))
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newItem}
                                    onChange={(e) => setNewItem(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                                    placeholder="항목 입력 후 Enter (예: 밥, 김치, 국)"
                                    className="flex-1"
                                />
                                <Button onClick={handleAddItem} variant="outline">
                                    <Plus className="w-4 h-4 mr-1" />추가
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Price (read-only) */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">가격</span>
                            <span className="text-lg font-bold text-gray-900">{price.toLocaleString()}원</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            우측 "코너 가격 설정"에서 변경 가능
                        </p>
                    </div>

                    {/* breakfast_1000 only: Variants */}
                    {localCorner.cornerId === "breakfast_1000" && (
                        <div className="border-t pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-gray-900">
                                    메뉴 Variants (선택사항)
                                </label>
                                <Button size="sm" variant="outline" onClick={addVariant}>
                                    <Plus className="w-4 h-4 mr-1" />Variant 추가
                                </Button>
                            </div>

                            {localCorner.variants && localCorner.variants.length > 0 ? (
                                <div className="space-y-3">
                                    {localCorner.variants.map((variant, vIdx) => (
                                        <Card key={vIdx} className="bg-gray-50">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-500">
                                                        Variant {vIdx + 1}
                                                    </span>
                                                    <X
                                                        className="w-4 h-4 cursor-pointer text-gray-400 hover:text-rose-600"
                                                        onClick={() => removeVariant(vIdx)}
                                                    />
                                                </div>
                                                <Input
                                                    value={variant.mainMenuName}
                                                    onChange={(e) => updateVariant(vIdx, { mainMenuName: e.target.value })}
                                                    placeholder="Variant 메뉴명 (예: 햄 정식)"
                                                    className="text-sm"
                                                />
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white rounded border">
                                                        {variant.items.length === 0 ? (
                                                            <span className="text-gray-400 text-xs">항목 없음</span>
                                                        ) : (
                                                            variant.items.map((item, itemIdx) => (
                                                                <Badge key={itemIdx} variant="secondary" className="text-xs gap-1">
                                                                    {item}
                                                                    <X
                                                                        className="w-3 h-3 cursor-pointer hover:text-rose-600"
                                                                        onClick={() => removeVariantItem(vIdx, itemIdx)}
                                                                    />
                                                                </Badge>
                                                            ))
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <Input
                                                            value={newVariantItem[vIdx] || ""}
                                                            onChange={(e) => setNewVariantItem(prev => ({ ...prev, [vIdx]: e.target.value }))}
                                                            onKeyPress={(e) => e.key === 'Enter' && addVariantItem(vIdx)}
                                                            placeholder="항목 추가"
                                                            className="flex-1 text-sm h-9"
                                                        />
                                                        <Button size="sm" className="h-9" onClick={() => addVariantItem(vIdx)}>
                                                            <Plus className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    Variant가 없습니다. 필요시 추가하세요.
                                </p>
                            )}
                        </div>
                    )}

                    {/* breakfast_1000 only: Servings */}
                    {localCorner.cornerId === "breakfast_1000" && (
                        <div className="border-t pt-6">
                            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-semibold text-gray-900">
                                                식수 (예상 제공량)
                                            </span>
                                            <Badge variant="outline" className="text-xs bg-white text-amber-700 border-amber-300">
                                                Coming soon
                                            </Badge>
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        value={localServings || ""}
                                        onChange={(e) => setLocalServings(parseInt(e.target.value) || 0)}
                                        placeholder="예: 120명"
                                        className="bg-white text-lg h-12 border-amber-300"
                                    />
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        💡 DB 스키마 업데이트 전 단계입니다. 현재 JSON 출력 및 게시에는 포함되지 않으며, UI에서만 입력/표시됩니다.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                        취소
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!localCorner.mainMenuName.trim()}
                    >
                        저장
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
