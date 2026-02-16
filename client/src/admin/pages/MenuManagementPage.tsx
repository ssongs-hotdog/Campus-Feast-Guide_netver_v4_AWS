import { useState, useMemo } from "react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { MenuEditorModal } from "../components/menu/MenuEditorModal";
import {
    MOCK_MENU_BY_DATE,
    INITIAL_PRICE_CATALOG,
    getCornersForDate,
    getCornerForDate,
    getDateString,
    getWeekDates,
    validateMenuData,
    type MenuCornerData,
    type MenuDataByDate,
    type PriceCatalogEntry,
    type ValidationResult
} from "../data/mockMenuPlanData";
import { RESTAURANTS, CORNERS } from "../data/mock_canonical";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, X, CheckCircle2, AlertCircle, AlertTriangle, Copy, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Upload } from "lucide-react";

// Planning mode removed - only weekly (Mon-Sat) supported

// Corner metadata (without menu data)
interface CornerMetadata {
    restaurantId: string;
    cornerId: string;
    cornerDisplayName: string;
    restaurantDisplayName: string;
}

export default function MenuManagementPage() {
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Data state
    const [menuData, setMenuData] = useState<MenuDataByDate>(JSON.parse(JSON.stringify(MOCK_MENU_BY_DATE)));
    const [priceCatalog, setPriceCatalog] = useState<PriceCatalogEntry[]>(JSON.parse(JSON.stringify(INITIAL_PRICE_CATALOG)));
    const [hasChanges, setHasChanges] = useState(false);

    // UI state - Planning bar
    const [selectedRestaurant, setSelectedRestaurant] = useState<string>("hanyang_plaza");
    const [selectedCorner, setSelectedCorner] = useState<string>("all");

    // Date/week state
    const today = new Date();
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
        const d = new Date(today);
        d.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
        return d;
    });

    // Editor state
    const [editingCell, setEditingCell] = useState<{ date: string; restaurantId: string; cornerId: string } | null>(null);
    const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false);
    const [priceCatalogExpanded, setPriceCatalogExpanded] = useState(false);
    const [isUploadingJson, setIsUploadingJson] = useState(false);

    // breakfast_1000 staged feature
    const [servingsMap, setServingsMap] = useState<Record<string, number>>({});

    // Computed values - Weekly dates (Mon-Sat)
    const currentDates = useMemo(() => {
        return getWeekDates(selectedWeekStart);
    }, [selectedWeekStart]);

    const weekdayLabels = ["월", "화", "수", "목", "금", "토"];

    // Get corners to display - ALWAYS show all corners (no filtering)
    const displayedCorners = useMemo((): CornerMetadata[] => {
        if (selectedRestaurant === "all") {
            // Show all corners from all restaurants
            return CORNERS.map(c => ({
                restaurantId: c.restaurantId,
                cornerId: c.id,
                cornerDisplayName: c.name,
                restaurantDisplayName: RESTAURANTS.find(r => r.id === c.restaurantId)?.name || "",
            }));
        } else {
            // Show all corners from selected restaurant
            return CORNERS
                .filter(c => c.restaurantId === selectedRestaurant)
                .map(c => ({
                    restaurantId: c.restaurantId,
                    cornerId: c.id,
                    cornerDisplayName: c.name,
                    restaurantDisplayName: RESTAURANTS.find(r => r.id === selectedRestaurant)?.name || "",
                }));
        }
    }, [selectedRestaurant]);

    // Validation
    const validation = useMemo(() => validateMenuData(menuData, currentDates), [menuData, currentDates]);

    const handleRefresh = () => {
        setIsLoading(true);
        setTimeout(() => {
            setLastUpdated(new Date());
            setIsLoading(false);
            toast({ title: "새로고침 완료" });
        }, 500);
    };

    const updateMenu = (date: string, restaurantId: string, cornerId: string, updates: Partial<MenuCornerData>) => {
        setMenuData(prev => ({
            ...prev,
            [date]: {
                ...prev[date],
                [restaurantId]: {
                    ...prev[date]?.[restaurantId],
                    [cornerId]: {
                        ...prev[date]?.[restaurantId]?.[cornerId],
                        ...updates
                    } as MenuCornerData
                }
            }
        }));
        setHasChanges(true);
    };

    const updatePrice = (restaurantId: string, cornerId: string, newPrice: number) => {
        setPriceCatalog(prev => prev.map(entry =>
            entry.restaurantId === restaurantId && entry.cornerId === cornerId
                ? { ...entry, priceWon: newPrice }
                : entry
        ));
        // Update all dates for this corner
        Object.keys(menuData).forEach(date => {
            if (menuData[date]?.[restaurantId]?.[cornerId]) {
                updateMenu(date, restaurantId, cornerId, { priceWon: newPrice });
            }
        });
    };

    const getPrice = (restaurantId: string, cornerId: string): number => {
        return priceCatalog.find(p => p.restaurantId === restaurantId && p.cornerId === cornerId)?.priceWon || 0;
    };

    const getStatus = (date: string, corner: CornerMetadata): { label: string; variant: "default" | "destructive" | "secondary" } => {
        const errors = validation.errors.filter(e => e.date === date && e.restaurantId === corner.restaurantId && e.cornerId === corner.cornerId);
        const warnings = validation.warnings.filter(w => w.date === date && w.restaurantId === corner.restaurantId && w.cornerId === corner.cornerId);

        if (errors.length > 0) return { label: "오류", variant: "destructive" };
        if (warnings.length > 0) return { label: "경고", variant: "secondary" };
        return { label: "정상", variant: "default" };
    };

    const handleSave = () => {
        toast({ title: "임시저장 완료" });
        setHasChanges(false);
    };

    const handlePublish = () => {
        toast({ title: "게시 기능 준비중" });
    };

    const copyJson = () => {
        const jsonData = Object.fromEntries(currentDates.map(d => [d, menuData[d]]));
        navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
        toast({ title: "JSON 복사 완료" });
    };

    const handleJsonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploadingJson(true);
        const errors: string[] = [];
        const successes: string[] = [];

        try {
            for (const file of Array.from(files)) {
                // 파일명에서 날짜 추출 (YYYY-MM-DD.json)
                const match = file.name.match(/^(\d{4}-\d{2}-\d{2})\.json$/);

                if (!match) {
                    errors.push(`${file.name}: 파일명 형식이 잘못되었습니다 (YYYY-MM-DD.json 형식 필요)`);
                    continue;
                }

                const dateKey = match[1];

                try {
                    const text = await file.text();
                    const jsonData = JSON.parse(text);

                    // menuData 병합
                    setMenuData(prev => ({
                        ...prev,
                        [dateKey]: jsonData,
                    }));

                    successes.push(dateKey);
                } catch (parseError) {
                    errors.push(`${file.name}: JSON 파싱 실패`);
                }
            }

            // 결과 알림
            if (successes.length > 0) {
                toast({
                    title: "JSON 파일 업로드 완료",
                    description: `${successes.length}개 파일 업로드 성공`,
                });
                setHasChanges(true);
            }

            if (errors.length > 0) {
                toast({
                    title: "일부 파일 업로드 실패",
                    description: errors.slice(0, 3).join(", ") + (errors.length > 3 ? ` 외 ${errors.length - 3}개` : ""),
                    variant: "destructive",
                });
            }
        } finally {
            setIsUploadingJson(false);
            // input 초기화 (같은 파일 재업로드 가능하도록)
            event.target.value = "";
        }
    };

    // Navigation helpers
    const goToPrevPeriod = () => {
        const prev = new Date(selectedWeekStart);
        prev.setDate(prev.getDate() - 7);
        setSelectedWeekStart(prev);
    };

    const goToNextPeriod = () => {
        const next = new Date(selectedWeekStart);
        next.setDate(next.getDate() + 7);
        setSelectedWeekStart(next);
    };





    if (isLoading) {
        return (
            <div className="space-y-4 pb-8">
                <AdminPageHeader
                    title="메뉴 관리"
                    subtitle="식당/코너별 메뉴를 등록·검증·게시합니다."
                    lastUpdated={lastUpdated}
                    onRefresh={handleRefresh}
                    autoRefresh={autoRefresh}
                    onAutoRefreshChange={setAutoRefresh}
                    isLoading={isLoading}
                />
                <div className="h-64 flex items-center justify-center text-gray-500">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-8">
            <AdminPageHeader
                title="메뉴 관리"
                subtitle="식당/코너별 메뉴를 등록·검증·게시합니다."
                lastUpdated={lastUpdated}
                onRefresh={handleRefresh}
                autoRefresh={autoRefresh}
                onAutoRefreshChange={setAutoRefresh}
                isLoading={isLoading}
            />

            {/* Filter & Action Bar */}
            <div className="flex items-center justify-between gap-3">
                {/* LEFT: Filters */}
                <div className="flex items-center gap-3">
                    {/* Restaurant / Corner selectors */}
                    <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RESTAURANTS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            <SelectItem value="all">전체 식당</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedCorner} onValueChange={setSelectedCorner}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 코너</SelectItem>
                            <SelectItem value="instant">즉석조리</SelectItem>
                            <SelectItem value="cupbap">컵밥</SelectItem>
                            <SelectItem value="breakfast_1000">천원의 아침밥</SelectItem>
                            <SelectItem value="dam_a_lunch">Dam-A 중식</SelectItem>
                            <SelectItem value="dam_a_dinner">Dam-A 석식</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Week navigation */}
                    <div className="flex items-center gap-0">
                        <Button size="sm" variant="ghost" onClick={goToPrevPeriod} className="px-2">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="text-sm font-medium min-w-[200px] text-center flex items-center justify-center">
                            {(() => {
                                const start = selectedWeekStart;
                                const end = new Date(start);
                                end.setDate(end.getDate() + 5);  // Saturday
                                const weekNum = Math.ceil(start.getDate() / 7);
                                const startStr = `${start.getMonth() + 1}.${start.getDate()}`;
                                const endStr = `${end.getMonth() + 1}.${end.getDate()}`;
                                return `${start.getMonth() + 1}월 ${weekNum}주차 (${startStr}~${endStr})`;
                            })()}
                        </div>
                        <Button size="sm" variant="ghost" onClick={goToNextPeriod} className="px-2">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setJsonPreviewOpen(true)}>JSON 보기</Button>
                    <Button variant="secondary" onClick={handleSave}>임시저장</Button>
                    <Button onClick={handlePublish} className="bg-blue-600 hover:bg-blue-700" disabled>게시</Button>
                </div>
            </div>

            {/* MAIN: Weekly Grid */}
            <div className="space-y-4">
                <WeeklyGrid
                    corners={displayedCorners}
                    dates={currentDates}
                    weekdayLabels={weekdayLabels}
                    menuData={menuData}
                    onSelectCell={selectedRestaurant === "all" ? () => { } : setEditingCell}
                    getStatus={getStatus}
                    onJsonUpload={handleJsonUpload}
                    isUploading={isUploadingJson}
                />
            </div>

            {/* JSON Preview Dialog */}
            <Dialog open={jsonPreviewOpen} onOpenChange={setJsonPreviewOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>JSON 미리보기</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                            식수는 준비 중 기능으로 현재 JSON에 포함되지 않습니다.
                        </div>
                        <Tabs defaultValue={currentDates[0]}>
                            <TabsList>
                                {currentDates.map((date, idx) => (
                                    <TabsTrigger key={date} value={date}>{weekdayLabels[idx]}</TabsTrigger>
                                ))}
                            </TabsList>
                            {currentDates.map(date => (
                                <TabsContent key={date} value={date}>
                                    <div className="relative">
                                        <Button size="sm" variant="outline" className="absolute top-2 right-2 z-10" onClick={copyJson}>
                                            <Copy className="w-4 h-4 mr-1" />복사
                                        </Button>
                                        <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                                            {JSON.stringify({ [date]: menuData[date] }, null, 2)}
                                        </pre>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                        ) : (
                        <div className="relative">
                            <Button size="sm" variant="outline" className="absolute top-2 right-2 z-10" onClick={copyJson}>
                                <Copy className="w-4 h-4 mr-1" />복사
                            </Button>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                                {JSON.stringify({ [currentDates[0]]: menuData[currentDates[0]] }, null, 2)}
                            </pre>
                        </div>
                        )
                    </div>
                </DialogContent>
            </Dialog>

            {/* Menu Editor Modal */}
            {
                editingCell && (
                    <MenuEditorModal
                        open={!!editingCell}
                        onClose={() => setEditingCell(null)}
                        corner={getCornerForDate(editingCell.date, editingCell.restaurantId, editingCell.cornerId)}
                        date={editingCell.date}
                        price={getPrice(editingCell.restaurantId, editingCell.cornerId)}
                        servings={servingsMap[`${editingCell.date}_${editingCell.restaurantId}_${editingCell.cornerId}`] || 0}
                        onSave={(updates) => {
                            updateMenu(editingCell.date, editingCell.restaurantId, editingCell.cornerId, updates);
                            setEditingCell(null);
                        }}
                        onServingsChange={(val) => setServingsMap(prev => ({ ...prev, [`${editingCell.date}_${editingCell.restaurantId}_${editingCell.cornerId}`]: val }))}
                    />
                )
            }
        </div >
    );
}

// Single Date Corner List Component
interface SingleDateCornerListProps {
    corners: MenuCornerData[];
    date: string;
    onSelectCell: (cell: { date: string; restaurantId: string; cornerId: string }) => void;
    getStatus: (date: string, corner: MenuCornerData) => { label: string; variant: "default" | "destructive" | "secondary" };
    getPrice: (restaurantId: string, cornerId: string) => number;
}

function SingleDateCornerList({ corners, date, onSelectCell, getStatus, getPrice }: SingleDateCornerListProps) {
    if (corners.length === 0) {
        return (
            <Card>
                <CardContent className="h-32 flex items-center justify-center text-gray-500">
                    선택한 조건에 맞는 코너가 없습니다.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">코너 목록 ({date})</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">코너명</TableHead>
                            <TableHead>메인메뉴명</TableHead>
                            <TableHead className="w-[80px] text-center">세부메뉴</TableHead>
                            <TableHead className="w-[100px] text-center">가격</TableHead>
                            <TableHead className="w-[80px] text-center">상태</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {corners.map(corner => {
                            const status = getStatus(date, corner);

                            return (
                                <TableRow
                                    key={`${corner.restaurantId}_${corner.cornerId}`}
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => onSelectCell({ date, restaurantId: corner.restaurantId, cornerId: corner.cornerId })}
                                >
                                    <TableCell className="font-medium">{corner.cornerDisplayName}</TableCell>
                                    <TableCell>{corner.mainMenuName}</TableCell>
                                    <TableCell className="text-center text-sm">{corner.items.length}개</TableCell>
                                    <TableCell className="text-center font-semibold">{getPrice(corner.restaurantId, corner.cornerId)}원</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// Weekly Grid Component
interface WeeklyGridProps {
    corners: CornerMetadata[];
    dates: string[];
    weekdayLabels: string[];
    menuData: MenuDataByDate;
    onSelectCell: (cell: { date: string; restaurantId: string; cornerId: string }) => void;
    getStatus: (date: string, corner: CornerMetadata) => { label: string; variant: "default" | "destructive" | "secondary" };
    onJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isUploading: boolean;
}

function WeeklyGrid({ corners, dates, weekdayLabels, menuData, onSelectCell, getStatus, onJsonUpload, isUploading }: WeeklyGridProps) {
    if (corners.length === 0) {
        return (
            <Card>
                <CardContent className="h-32 flex items-center justify-center text-gray-500">
                    선택한 조건에 맞는 코너가 없습니다.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                        주간 식단표 ({dates[0]} ~ {dates[dates.length - 1]})
                    </CardTitle>

                    {/* JSON 파일 업로드 버튼 */}
                    <div>
                        <input
                            type="file"
                            accept=".json"
                            multiple
                            onChange={onJsonUpload}
                            className="hidden"
                            id="json-upload-input"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('json-upload-input')?.click()}
                            disabled={isUploading}
                        >
                            <Upload className="w-4 h-4 mr-1" />
                            JSON 파일 추가
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px] sticky left-0 bg-gray-50 z-10">코너명</TableHead>
                                {weekdayLabels.map((label, idx) => (
                                    <TableHead key={dates[idx]} className="text-center min-w-[140px]">
                                        {label}
                                        <div className="text-xs font-normal text-gray-500">{dates[idx].substring(5)}</div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {corners.map(corner => (
                                <TableRow key={`${corner.restaurantId}_${corner.cornerId}`}>
                                    <TableCell className="font-medium sticky left-0 bg-white z-10">{corner.cornerDisplayName}</TableCell>
                                    {dates.map(date => {
                                        const dayMenu = menuData[date]?.[corner.restaurantId]?.[corner.cornerId];
                                        const status = getStatus(date, corner);

                                        return (
                                            <TableCell
                                                key={date}
                                                className="cursor-pointer hover:bg-gray-50 text-left align-top border-r"
                                                onClick={() => onSelectCell({ date, restaurantId: corner.restaurantId, cornerId: corner.cornerId })}
                                            >
                                                {dayMenu ? (
                                                    <div className="space-y-1 py-1">
                                                        <div className="text-sm font-medium">{dayMenu.mainMenuName}</div>
                                                        {dayMenu.items.length > 0 && (
                                                            <div className="text-xs text-gray-600 space-y-0.5">
                                                                {dayMenu.items.map((item, idx) => (
                                                                    <div key={idx}>• {item}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <div className="text-gray-400 text-xs font-medium">메뉴 등록</div>
                                                        <Plus className="w-4 h-4 mx-auto mt-1 text-gray-300" />
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// Menu Editor Component
interface MenuEditorProps {
    corner: MenuCornerData | undefined;
    date: string;
    price: number;
    servings: number;
    onUpdate: (updates: Partial<MenuCornerData>) => void;
    onServingsChange: (val: number) => void;
}

function MenuEditor({ corner, date, price, servings, onUpdate, onServingsChange }: MenuEditorProps) {
    const [newItem, setNewItem] = useState("");
    const [newVariantItem, setNewVariantItem] = useState<Record<number, string>>({});

    if (!corner) return null;

    const handleAddItem = () => {
        if (newItem.trim()) {
            onUpdate({ items: [...corner.items, newItem.trim()] });
            setNewItem("");
        }
    };

    const removeItem = (index: number) => {
        onUpdate({ items: corner.items.filter((_, i) => i !== index) });
    };

    const addVariant = () => {
        const variants = corner.variants || [];
        onUpdate({ variants: [...variants, { mainMenuName: "", items: [] }] });
    };

    const removeVariant = (index: number) => {
        if (!corner.variants) return;
        onUpdate({ variants: corner.variants.filter((_, i) => i !== index) });
    };

    const updateVariant = (index: number, updates: Partial<{ mainMenuName: string; items: string[] }>) => {
        if (!corner.variants) return;
        onUpdate({ variants: corner.variants.map((v, i) => i === index ? { ...v, ...updates } : v) });
    };

    const addVariantItem = (variantIndex: number) => {
        const item = newVariantItem[variantIndex];
        if (item?.trim() && corner.variants) {
            const variant = corner.variants[variantIndex];
            updateVariant(variantIndex, { items: [...variant.items, item.trim()] });
            setNewVariantItem(prev => ({ ...prev, [variantIndex]: "" }));
        }
    };

    const removeVariantItem = (variantIndex: number, itemIndex: number) => {
        if (!corner.variants) return;
        const variant = corner.variants[variantIndex];
        updateVariant(variantIndex, { items: variant.items.filter((_, i) => i !== itemIndex) });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">편집: {corner.cornerDisplayName} · {date}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Main menu name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">메인메뉴명</label>
                    <Input
                        value={corner.mainMenuName}
                        onChange={(e) => onUpdate({ mainMenuName: e.target.value })}
                        placeholder="메인메뉴명 입력"
                    />
                </div>

                {/* Items */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">세부메뉴 (items)</label>
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            {corner.items.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="gap-1">
                                    {item}
                                    <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => removeItem(idx)} />
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                                placeholder="항목 추가 (Enter)"
                                className="flex-1"
                            />
                            <Button size="sm" onClick={handleAddItem}><Plus className="w-4 h-4" /></Button>
                        </div>
                    </div>
                </div>

                {/* Price - Editable */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원)</label>
                    <Input
                        type="number"
                        value={corner.priceWon}
                        onChange={(e) => onUpdate({ priceWon: parseInt(e.target.value) || 0 })}
                        placeholder="예: 5000"
                    />
                </div>

                {/* breakfast_1000: Variants */}
                {corner.cornerId === "breakfast_1000" && (
                    <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Variants</label>
                            <Button size="sm" variant="outline" onClick={addVariant}>
                                <Plus className="w-4 h-4 mr-1" />Variant 추가
                            </Button>
                        </div>
                        {corner.variants?.map((variant, vIdx) => (
                            <Card key={vIdx} className="bg-white">
                                <CardContent className="p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500">Variant {vIdx + 1}</span>
                                        <X className="w-4 h-4 cursor-pointer text-gray-400 hover:text-rose-600" onClick={() => removeVariant(vIdx)} />
                                    </div>
                                    <Input
                                        value={variant.mainMenuName}
                                        onChange={(e) => updateVariant(vIdx, { mainMenuName: e.target.value })}
                                        placeholder="Variant 메뉴명"
                                        className="text-sm"
                                    />
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1">
                                            {variant.items.map((item, itemIdx) => (
                                                <Badge key={itemIdx} variant="secondary" className="text-xs gap-1">
                                                    {item}
                                                    <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => removeVariantItem(vIdx, itemIdx)} />
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            <Input
                                                value={newVariantItem[vIdx] || ""}
                                                onChange={(e) => setNewVariantItem(prev => ({ ...prev, [vIdx]: e.target.value }))}
                                                onKeyPress={(e) => e.key === 'Enter' && addVariantItem(vIdx)}
                                                placeholder="항목 추가 (Enter)"
                                                className="flex-1 text-sm h-8"
                                            />
                                            <Button size="sm" className="h-8" onClick={() => addVariantItem(vIdx)}>
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* breakfast_1000: Servings (staged) */}
                {corner.cornerId === "breakfast_1000" && (
                    <div className="border-t pt-4">
                        <Card className="bg-amber-50 border-amber-200">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">식수 (예상 제공량)</span>
                                    <Badge variant="outline" className="text-xs bg-white text-amber-700 border-amber-300">Coming soon</Badge>
                                </div>
                                <Input
                                    type="number"
                                    value={servings}
                                    onChange={(e) => onServingsChange(parseInt(e.target.value) || 0)}
                                    placeholder="예상 식수 입력"
                                    className="bg-white"
                                />
                                <p className="text-xs text-gray-600">
                                    DB 스키마 업데이트 전 단계로, 현재 JSON/게시에는 포함되지 않습니다.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
