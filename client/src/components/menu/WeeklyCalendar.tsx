import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, getWeekOfMonth, getMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DayKey, formatDateToKey, parseDayKeyToDate } from '@/lib/dateUtils';

interface WeeklyCalendarProps {
    selectedDate: DayKey;
    onDateSelect: (date: DayKey) => void;
    onCalendarClick?: () => void;
}

export function WeeklyCalendar({ selectedDate, onDateSelect, onCalendarClick }: WeeklyCalendarProps) {
    // Initialize view based on selectedDate
    // We want the week view to always include the selectedDate when it changes from outside (e.g. month picker)
    const initialDate = useMemo(() => parseDayKeyToDate(selectedDate), []);
    const [viewDate, setViewDate] = useState<Date>(initialDate);

    // Sync viewDate when selectedDate changes significantly (optional, but good for UX)
    useEffect(() => {
        const date = parseDayKeyToDate(selectedDate);
        // If the selected date is far from current view, jump to it? 
        // For now, let's keep it simple: if the selected date is not in the current week view, move view to it.
        const startOfCurrentView = startOfWeek(viewDate, { weekStartsOn: 1 });
        const endOfCurrentView = addDays(startOfCurrentView, 6);

        if (date < startOfCurrentView || date > endOfCurrentView) {
            setViewDate(date);
        }
    }, [selectedDate]);

    // Calculate dates for the current week view
    // Request was to start on Monday (based on "월(17)" example)
    const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 }); // 1 = Monday

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Header Title: logic updated to follow "Majority Rule" (Thursday of the week determines month)
    // and using Korean ordinal format (첫째주, 둘째주...)
    // Header Title: logic updated to follow "Majority Rule" (Thursday of the week determines month)
    // and using Korean ordinal format (첫째주, 둘째주...)
    // + Custom Week Numbering: Math.ceil(Thursday.getDate() / 7)
    const headerTitle = useMemo(() => {
        // 1. Determine the Thursday of this week (which represents the majority of days)
        const thursday = addDays(weekStart, 3);

        // 2. Get Month from Thursday
        const month = format(thursday, 'M', { locale: ko });

        // 3. Get Week Number of that month using custom math logic
        // Rule: The week number depends solely on the Thursday's date.
        // e.g. Feb 5th (Thu) -> ceil(5/7) = 1 -> 1st week
        // e.g. Jan 29th (Thu) -> ceil(29/7) = 5 -> 5th week
        const weekNum = Math.ceil(thursday.getDate() / 7);

        // 4. Format ordinal
        const weekOrdinals = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'];
        const weekLabel = weekOrdinals[weekNum - 1] || `${weekNum}째`;

        return `${month}월 ${weekLabel}주`;
    }, [weekStart]);

    const handlePrevWeek = () => setViewDate(prev => addDays(prev, -7));
    const handleNextWeek = () => setViewDate(prev => addDays(prev, 7));

    return (
        <div className="w-full bg-background pb-2">
            {/* Header: < 2월 3주 > + Calendar Icon */}
            <div className="relative flex items-center justify-center mb-4 px-4">
                {/* Centered Navigation */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted/50"
                        onClick={handlePrevWeek}
                    >
                        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                    </Button>

                    <h2 className="text-lg font-bold text-foreground min-w-[80px] text-center">
                        {headerTitle}
                    </h2>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted/50"
                        onClick={handleNextWeek}
                    >
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>

                {/* Right-aligned Calendar Icon */}
                <div className="absolute right-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-muted/50"
                        onClick={onCalendarClick}
                    >
                        <Calendar className="h-5 w-5 text-foreground" />
                    </Button>
                </div>
            </div>

            {/* Days Strip */}
            <div className="relative w-full">
                {/* Scroll Container */}
                <div className="flex justify-between items-center px-2 overflow-x-auto scrollbar-hide">
                    {weekDays.map((date) => {
                        const dateKey = formatDateToKey(date);
                        const isSelected = dateKey === selectedDate;
                        const dayName = format(date, 'E', { locale: ko }); // 월, 화, 수...
                        const dayNum = format(date, 'd'); // 17, 18...

                        return (
                            <button
                                key={dateKey}
                                onClick={() => onDateSelect(dateKey)}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[44px] py-1 gap-1 transition-all rounded-full",
                                    "cursor-pointer select-none"
                                )}
                            >
                                {/* Day Name (Mon, Tue) */}
                                <span className={cn(
                                    "text-xs font-medium",
                                    isSelected ? "text-primary font-bold" : "text-muted-foreground"
                                )}>
                                    {dayName}
                                </span>

                                {/* Day Number Circle */}
                                <div className={cn(
                                    "flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all duration-300",
                                    isSelected
                                        ? "bg-[#0E4A84] text-white shadow-md scale-110" // Hanyang Blue
                                        : "text-muted-foreground hover:bg-muted"
                                )}>
                                    {dayNum}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
