/**
 * DatePickerModal.tsx - Calendar Date Picker Modal Component
 * 
 * Purpose: Popup calendar for selecting dates with Hanyang Blue theme
 * Features:
 * - Month/Year navigation
 * - Today highlight with Hanyang Blue
 * - Quick "Today" button
 * - Responsive design
 */
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DayKey } from '@/lib/dateUtils';
import 'react-day-picker/dist/style.css';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: DayKey;
    onDateSelect: (date: DayKey) => void;
}

export function DatePickerModal({ isOpen, onClose, selectedDate, onDateSelect }: DatePickerModalProps) {
    if (!isOpen) return null;

    // Parse selected date to Date object
    const selectedDateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const [month, setMonth] = useState<Date>(selectedDateObj);
    const [tempSelected, setTempSelected] = useState<Date>(selectedDateObj);
    const today = new Date();

    const handleDateClick = (date: Date | undefined) => {
        if (!date) return;
        setTempSelected(date);
    };

    const handleConfirm = () => {
        const dayKey = format(tempSelected, 'yyyy-MM-dd') as DayKey;
        onDateSelect(dayKey);
        onClose();
    };

    const handleToday = () => {
        setMonth(today);
        setTempSelected(today);
    };

    const handlePrevMonth = () => {
        const newMonth = new Date(month);
        newMonth.setMonth(month.getMonth() - 1);
        setMonth(newMonth);
    };

    const handleNextMonth = () => {
        const newMonth = new Date(month);
        newMonth.setMonth(month.getMonth() + 1);
        setMonth(newMonth);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-background rounded-lg shadow-xl max-w-sm w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">날짜 선택</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Calendar */}
                <div className="p-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevMonth}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-base font-semibold">
                            {format(month, 'yyyy년 M월', { locale: ko })}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNextMonth}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Day Picker */}
                    <style>{`
            .date-picker-modal .rdp {
              --rdp-cell-size: 40px;
              --rdp-accent-color: #0E4A84;
              --rdp-background-color: #0E4A84;
              margin: 0 auto;
            }
            .date-picker-modal .rdp-months {
              justify-content: center;
            }
            .date-picker-modal .rdp-month {
              width: 100%;
            }
            .date-picker-modal .rdp-table {
              margin: 0 auto;
            }
            .date-picker-modal .rdp-caption {
              display: none;
            }
            .date-picker-modal .rdp-head_cell {
              color: #6b7280;
              font-weight: 500;
              font-size: 0.875rem;
              text-align: center;
            }
            .date-picker-modal .rdp-day {
              border-radius: 50%;
              font-size: 0.875rem;
            }
            .date-picker-modal .rdp-day_today {
              background-color: #0E4A84;
              color: white;
              font-weight: 600;
            }
            .date-picker-modal .rdp-day_selected {
              background-color: #0E4A84;
              color: white;
            }
            .date-picker-modal .rdp-day_selected:hover {
              background-color: #0a3666;
            }
            .date-picker-modal .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_today) {
              background-color: #f3f4f6;
            }
          `}</style>
                    <div className="date-picker-modal text-center">
                        <DayPicker
                            mode="single"
                            selected={tempSelected}
                            onSelect={handleDateClick}
                            month={month}
                            onMonthChange={setMonth}
                            locale={ko}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center p-4 border-t border-border">
                    <Button
                        onClick={handleConfirm}
                        className="w-full"
                        style={{ backgroundColor: '#0E4A84' }}
                    >
                        선택
                    </Button>
                </div>
            </div>
        </div>
    );
}
