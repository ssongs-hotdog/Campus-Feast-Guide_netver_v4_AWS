import { Link } from "wouter";
import { CornerStatus } from "../../data/mockDashboardData";
import { StatusBadge, StatusType } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Megaphone, Sliders, Image as ImageIcon } from "lucide-react";

interface HotspotsTableProps {
    hotspots: CornerStatus[];
    isLoading: boolean;
}

export function HotspotsTable({ hotspots, isLoading }: HotspotsTableProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="h-6 w-48 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="p-6 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 w-full bg-gray-50 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Now Hotspots (혼잡 Top 5)</h3>
                    <p className="text-sm text-gray-500">현재 대기시간이 가장 긴 코너 순서입니다.</p>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                {hotspots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <span className="text-2xl">🎉</span>
                        </div>
                        <p className="font-medium">현재 혼잡 코너가 없습니다.</p>
                        <p className="text-sm">모든 식당이 원활하게 운영되고 있습니다.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">식당 / 코너명</th>
                                <th className="px-6 py-4">예상 대기</th>
                                <th className="px-6 py-4">상태</th>
                                <th className="px-6 py-4">업데이트</th>
                                <th className="px-6 py-4 text-right">빠른 조치</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {hotspots.map((spot) => (
                                <tr key={spot.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{spot.restaurantName}</div>
                                        <div className="text-xs text-gray-500">{spot.cornerName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-[#0E4A84]">{spot.waitTime}분</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={spot.status as StatusType} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {spot.lastUpdate}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/notices?target=${spot.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600">
                                                    <Megaphone className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/admin/ops?target=${spot.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-green-600">
                                                    <Sliders className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/admin/banners?target=${spot.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-purple-600">
                                                    <ImageIcon className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/30 text-center">
                <Link href="/admin/monitor">
                    <span className="text-xs font-medium text-blue-600 hover:underline cursor-pointer">
                        전체 모니터링 현황 보기 &rarr;
                    </span>
                </Link>
            </div>
        </div>
    );
}
