
import { Clock, TrendingDown, Wallet } from "lucide-react";
import { useLocation } from "wouter";
import type { RecommendationItem } from "@/hooks/useRecommendation";

interface TopPickCardProps {
    type: 'fast' | 'value' | 'trend';
    item: RecommendationItem | null | undefined;
}

export function TopPickCard({ type, item }: TopPickCardProps) {
    const [, setLocation] = useLocation();
    let badgeColor = "bg-blue-100 text-blue-700";
    let icon = <Clock className="w-3 h-3 mr-1" />;
    let label = "추천";
    let microcopy = "";

    if (type === 'fast') {
        label = "가장 빠른 한 끼";
        microcopy = "지금 가장 빠른 선택";
        badgeColor = "bg-[#E3F2FD] text-[#1565C0]";
        icon = <Clock className="w-3 h-3 mr-1" />;
    } else if (type === 'value') {
        label = "가성비 픽";
        microcopy = item?.reason || "가격은 낮고, 대기는 무난해요";
        badgeColor = "bg-[#FFF3E0] text-[#EF6C00]";
        icon = <Wallet className="w-3 h-3 mr-1" />;
    } else if (type === 'trend') {
        label = "지금 막 풀리는 코너";
        microcopy = "대기시간이 꺾였어요";
        badgeColor = "bg-[#E8F5E9] text-[#2E7D32]";
        icon = <TrendingDown className="w-3 h-3 mr-1" />;
    }

    const waitTimeDisplay = item ? item.estWaitTimeMin : "—";
    const nameDisplay = item ? `${item.cornerName} · ${item.menuName}` : "데이터 준비 중";

    const handleClick = () => {
        if (item) {
            // Navigate to corner detail
            // Format: /d/:dayKey/restaurant/:restaurantId/corner/:cornerId
            // We need today's date key here or just use /restaurant/... ID-based routing if available
            // The app routing for MenuDetail is /menu/detail/:restaurantId/:cornerId OR /d/:date/...
            // Let's use the simpler path if App.tsx supports it, or construct date-based one.
            // Checking App.tsx: Route path="/restaurant/:restaurantId/corner/:cornerId" component={HomeCornerDetail} exists
            setLocation(`/restaurant/${item.restaurantId}/corner/${item.cornerId}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`min-w-[280px] bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col h-[210px] snap-center transition-all ${item ? 'active:scale-[0.98] cursor-pointer' : ''}`}
        >
            <div>
                <div className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold mb-3 ${badgeColor}`}>
                    {icon}
                    {label}
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                    {item ? (
                        <span className="text-4xl font-extrabold text-foreground">{waitTimeDisplay}</span>
                    ) : (
                        <span className="text-4xl font-extrabold text-gray-200 animate-pulse">--</span>
                    )}
                    <span className="text-base text-gray-500 font-medium">분 대기</span>
                </div>

                <p className="text-sm text-gray-600 font-medium truncate mb-0.5">{microcopy}</p>
                <p className={`text-xs text-gray-400 truncate ${!item ? 'opacity-50' : ''}`}>
                    {nameDisplay}
                </p>
            </div>

            <div className="mt-auto pt-4">
                <button
                    disabled={!item}
                    onClick={(e) => {
                        e.stopPropagation(); // Avoid double trigger if nested
                        handleClick();
                    }}
                    className={`w-full text-white text-xs font-bold py-3 rounded-lg transition-colors ${item ? 'bg-[#0E4A84] hover:bg-[#0b3d6e]' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                    자세히 보기
                </button>
            </div>
        </div>
    );
}
