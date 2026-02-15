/**
 * MyPage.tsx - Personal Hub
 * 
 * Implements the MY Tab with:
 * 1. Profile Section (Static)
 * 2. Favorites Section (Core feature)
 * 3. Notifications (Toggles)
 * 4. Golden Time Widget (Mock)
 * 5. History & Footer
 */
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Settings, Star, Bell, Clock, Receipt, CircleHelp } from 'lucide-react';
import { useFavorites } from '@/lib/favoritesContext';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';
import { RESTAURANTS } from '@shared/types';
import { getTodayKey } from '@/lib/dateUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TicketVault } from '@/components/ticket/TicketVault';
import {
    CORNER_SCHEDULES,
    isCornerActive,
    getServiceDayType,
    type TimeWindow
} from '@/lib/domain/schedule';

/**
 * Calculates the status badge text for a corner based on current time and schedule.
 * Statuses: "운영 전", "운영 중", "운영 종료"
 */
function getCornerBadgeStatus(restaurantId: string, cornerId: string): string {
    const schedule = CORNER_SCHEDULES[restaurantId]?.[cornerId];
    if (!schedule) return "운영 종료"; // No schedule data

    const now = new Date(); // KST (Browser time, which is KST in this environment)
    const dayKey = getTodayKey();

    // Format current time as HH:MM
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const nowHHMM = `${hours}:${minutes}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Check if currently active (Operating Now)
    const isActive = isCornerActive({
        restaurantId,
        cornerId,
        dateKey: dayKey,
        timeHHMM: nowHHMM
    });

    if (isActive) return "운영 중";

    // 2. Check if before operation (Operating Before)
    // "Before" means there is a future operating window today that hasn't ended yet
    // (or arguably hasn't started, but "Before next window" usually covers "between windows" too)
    const dayType = getServiceDayType(dayKey);
    let windows: TimeWindow[] = [];

    if (dayType === 'WEEKDAY') windows = schedule.weekday || [];
    else if (dayType === 'SATURDAY') windows = schedule.saturday || [];
    else if (dayType === 'SUNDAY' && schedule.sunday) windows = schedule.sunday || [];

    // Helper to convert HH:MM to minutes
    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    // If there is ANY window that ends AFTER now, we consider it "Before Operation" (or "Break")
    // Strictly: User asked for "Before next upcoming window today" => "운영 전".
    // If we are effectively "waiting for service", it is "운영 전".
    const hasRemainingService = windows.some(w => parseTime(w.end) > nowMinutes);

    if (hasRemainingService) return "운영 전";

    // 3. Else (Operating Ended)
    return "운영 종료";
}

export default function MyPage() {
    const [, setLocation] = useLocation();
    const { favoritedCornerIds } = useFavorites();

    // -- Notifications State (Mock) --
    const [notifOpen, setNotifOpen] = useState(true);
    const [notifGolden, setNotifGolden] = useState(false);
    const [notifCrowded, setNotifCrowded] = useState(true);
    const [masterNotif, setMasterNotif] = useState(true);
    const [showTicketPopup, setShowTicketPopup] = useState(false);

    // Force re-render every minute to update badges
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    // -- Favorites Data Processing --
    // Flatten restaurants to find corners by ID
    const allCorners = useMemo(() => RESTAURANTS.flatMap(r =>
        r.cornerOrder.map(cId => ({
            id: cId,
            restaurantId: r.id,
            restaurantName: r.name,
            cornerName: CORNER_DISPLAY_NAMES[cId] || cId
        }))
    ), []);

    const favoriteList = useMemo(() => favoritedCornerIds.map(fId =>
        allCorners.find(c => c.id === fId)
    ).filter(Boolean) as typeof allCorners, [favoritedCornerIds, allCorners]);

    const todayKey = getTodayKey();

    // -- Mock Golden Time Logic --
    // If user has favorites, show a random realistic time. If not, show info text.
    const goldenTime = favoriteList.length > 0 ? "12:40" : null;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">

            {/* 1. Profile Card */}
            <div className="bg-white p-6 pb-8 border-b border-border">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">엄준식님</h1>
                        <p className="text-sm text-gray-500 mt-1">한양대학교 전기·생체공학부 전기공학전공</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 h-auto p-0">
                        <span className="text-xs mr-1">계정 관리</span>
                        <Settings className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            <div className="px-4 -mt-4 space-y-4">

                {/* 2. Favorites Section */}
                <Card className="p-5 shadow-sm border-0">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-[#0E4A84] fill-[#0E4A84]" />
                        <h2 className="font-bold text-lg">즐겨찾기</h2>
                    </div>

                    {favoriteList.length > 0 ? (
                        <div className="space-y-3">
                            {favoriteList.map(item => {
                                const statusText = getCornerBadgeStatus(item.restaurantId, item.id);
                                const isOperating = statusText === "운영 중";

                                return (
                                    <div
                                        key={item.id}
                                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2 transition-colors"
                                        onClick={() => {
                                            // Find restaurant ID for navigation
                                            const rest = RESTAURANTS.find(r => r.cornerOrder.includes(item.id));
                                            if (rest) setLocation(`/d/${todayKey}/restaurant/${rest.id}/corner/${item.id}`);
                                        }}
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">{item.restaurantName}</div>
                                            <div className="text-sm text-gray-500">{item.cornerName}</div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`font-normal ${isOperating ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            {statusText}
                                        </Badge>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-3">자주 가는 코너를 즐겨찾기하면<br />여기에서 바로 확인할 수 있어요.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-[#0E4A84] text-[#0E4A84]"
                                onClick={() => setLocation('/')}
                            >
                                홈에서 즐겨찾기 추가하기
                            </Button>
                        </div>
                    )}
                </Card>

                {/* 3. Notifications Section */}
                <Card className="p-5 shadow-sm border-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-[#0E4A84]" />
                            <h2 className="font-bold text-lg">알림 설정</h2>
                        </div>
                        <Switch checked={masterNotif} onCheckedChange={setMasterNotif} />
                    </div>

                    <div className={`space-y-4 transition-opacity ${masterNotif ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">오픈 알림</span>
                            <Switch checked={notifOpen} onCheckedChange={setNotifOpen} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">골든타임 알림 (한산할 때)</span>
                            <Switch checked={notifGolden} onCheckedChange={setNotifGolden} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">혼잡 알림 (붐빌 때)</span>
                            <Switch checked={notifCrowded} onCheckedChange={setNotifCrowded} />
                        </div>
                        <p className="text-xs text-gray-400 pt-2">
                            즐겨찾기한 코너 기준으로 알림을 보내요.
                        </p>
                    </div>
                </Card>

                {/* 4. My Golden Time Widget */}
                <Card className="p-5 shadow-sm border-0 bg-gradient-to-br from-[#0E4A84] to-[#0a3560] text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-white/90" />
                        <h2 className="font-bold text-lg">내 골든타임</h2>
                    </div>

                    {goldenTime ? (
                        <div className="mt-2">
                            <div className="text-3xl font-bold mb-1">{goldenTime}</div>
                            <p className="text-sm text-white/80">오늘 가장 한산할 가능성이 큰 시간</p>
                            <p className="text-xs text-white/60 mt-2">즐겨찾기 코너 기준 (최근 데이터 기반)</p>
                        </div>
                    ) : (
                        <div className="mt-2">
                            <p className="text-sm text-white/90">데이터가 없습니다.</p>
                            <p className="text-xs text-white/60 mt-1">즐겨찾기를 추가하면 골든타임을 찾아드려요.</p>
                        </div>
                    )}
                </Card>

                {/* 5. Tickets / History */}
                <Card className="p-0 shadow-sm border-0 divide-y divide-gray-100 overflow-hidden">
                    <div
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setShowTicketPopup(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2 rounded-full">
                                <Receipt className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="font-medium text-gray-700">내 식권</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2 rounded-full">
                                <Clock className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="font-medium text-gray-700">이용 내역</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </Card>

                {/* Ticket Vault Dialog */}
                <Dialog open={showTicketPopup} onOpenChange={setShowTicketPopup}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>내 식권함</DialogTitle>
                        </DialogHeader>
                        <TicketVault />
                    </DialogContent>
                </Dialog>

                {/* 6. Footer Links */}
                <div className="pt-4 pb-8 text-center space-y-3">
                    <div className="flex justify-center gap-6 text-xs text-gray-500">
                        <span className="cursor-pointer hover:underline">공지사항</span>
                        <span className="cursor-pointer hover:underline">문의/피드백</span>
                        <span className="cursor-pointer hover:underline">앱 정보</span>
                    </div>
                    <div className="text-[10px] text-gray-300">
                        ⓒ HY-eat. All rights reserved.
                    </div>
                </div>

            </div>
        </div>
    );
}
