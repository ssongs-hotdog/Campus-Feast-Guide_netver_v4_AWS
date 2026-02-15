
import { ChevronRight } from "lucide-react";
import type { RecommendationItem } from "@/hooks/useRecommendation";

interface RecommendListProps {
    items: RecommendationItem[];
}

export function RecommendList({ items }: RecommendListProps) {
    if (items.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-400 text-sm">조건에 맞는 추천이 없어요</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-3">
            {items.map((item, idx) => (
                <div key={`${item.restaurantId}-${item.cornerId}-${idx}`} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-[0.99] transition-transform">
                    <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-[#0E4A84]">{item.estWaitTimeMin}분</span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-sm font-semibold text-gray-800 truncate">{item.cornerName}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{item.menuName}</p>
                        {item.reason && <p className="text-[10px] text-[#0E4A84] mt-1 font-medium">{item.reason}</p>}
                    </div>

                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
