import { useState, useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Check, Utensils } from 'lucide-react';
import { RESTAURANTS } from '@shared/types';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';
import { addMinutes, format } from 'date-fns';

interface ForecastSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedOffset: number;
    onApply: (offset: number, cornerId?: string) => void;
    activeRestaurantId: string | null;
}

const TIME_OPTIONS = [0, 10, 20, 30];

export function ForecastSheet({
    isOpen,
    onOpenChange,
    selectedOffset,
    onApply,
    activeRestaurantId
}: ForecastSheetProps) {
    const [tempOffset, setTempOffset] = useState(selectedOffset);
    const [selectedCornerId, setSelectedCornerId] = useState<string>('');

    // Sync internal state when sheet opens
    useEffect(() => {
        if (isOpen) {
            setTempOffset(selectedOffset);
            // We don't necessarily reset corner selection here to allow re-opening and seeing previous choice, 
            // but for "jump to" functionality, resetting might be cleaner. Let's keep it sticky for now if implemented in parent, 
            // but here valid local state starts empty or based on props if we passed it.
            // For now, let's reset to force a fresh "action" decision unless we want to show current state.
            // Given requirements, let's keep it simple.
            setSelectedCornerId('');
        }
    }, [isOpen, selectedOffset]);

    const now = new Date();

    // Filter corners based on active restaurant selection (if any)
    const availableRestaurants = useMemo(() => {
        if (activeRestaurantId) {
            return RESTAURANTS.filter(r => r.id === activeRestaurantId);
        }
        return RESTAURANTS;
    }, [activeRestaurantId]);

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="text-left pb-2">
                    <DrawerTitle className="text-xl font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        대기 시간 예측
                    </DrawerTitle>
                </DrawerHeader>

                <div className="px-4 py-2 space-y-6">
                    {/* Time Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">시간 선택</label>
                        <div className="grid grid-cols-4 gap-2">
                            {TIME_OPTIONS.map((offset) => {
                                const targetTime = addMinutes(now, offset);
                                // Check if target time crosses midnight (next day)
                                const isNextDay = targetTime.getDate() !== now.getDate();
                                const isDisabled = isNextDay;

                                return (
                                    <Button
                                        key={offset}
                                        variant={tempOffset === offset ? 'default' : 'outline'}
                                        className={`h-auto py-3 flex flex-col gap-1 ${isDisabled ? 'opacity-50' : ''}`}
                                        onClick={() => !isDisabled && setTempOffset(offset)}
                                        disabled={isDisabled}
                                    >
                                        <span className="text-sm font-semibold">
                                            {offset === 0 ? '지금' : `+${offset}분`}
                                        </span>
                                        <span className="text-[10px] opacity-70">
                                            {offset === 0 ? '실시간' : format(targetTime, 'HH:mm')}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Corner Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">코너 바로가기 (선택)</label>
                        <ScrollArea className="h-[240px] border rounded-lg bg-muted/20 p-2">
                            <RadioGroup value={selectedCornerId} onValueChange={setSelectedCornerId}>
                                {availableRestaurants.map(restaurant => (
                                    <div key={restaurant.id} className="mb-4 last:mb-0">
                                        <h4 className="text-xs font-bold text-muted-foreground mb-2 px-2 flex items-center gap-1">
                                            <Utensils className="w-3 h-3" />
                                            {restaurant.name}
                                        </h4>
                                        <div className="space-y-1">
                                            {restaurant.cornerOrder.map(cornerId => {
                                                const displayName = CORNER_DISPLAY_NAMES[cornerId] || cornerId;
                                                return (
                                                    <div
                                                        key={cornerId}
                                                        className={`flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors border ${selectedCornerId === cornerId
                                                                ? 'bg-primary/10 border-primary/50'
                                                                : 'bg-card border-transparent hover:bg-muted'
                                                            }`}
                                                        onClick={() => setSelectedCornerId(cornerId)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <RadioGroupItem value={cornerId} id={`${restaurant.id}-${cornerId}`} className="sr-only" />
                                                            <span className={`text-sm ${selectedCornerId === cornerId ? 'font-bold text-primary' : 'font-medium'}`}>
                                                                {displayName}
                                                            </span>
                                                        </div>
                                                        {selectedCornerId === cornerId && (
                                                            <Check className="w-4 h-4 text-primary" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </RadioGroup>
                        </ScrollArea>
                    </div>
                </div>

                <DrawerFooter className="pt-2">
                    <Button
                        onClick={() => {
                            onApply(tempOffset, selectedCornerId);
                            onOpenChange(false);
                        }}
                        size="lg"
                        className="w-full font-bold text-base"
                    >
                        {tempOffset === 0 ? '실시간 정보 보기' : `${tempOffset}분 후 예측 보기`}
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline">닫기</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
