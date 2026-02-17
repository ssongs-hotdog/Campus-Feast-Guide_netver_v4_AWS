import { MenuPerformance } from "../../data/reportModel";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MenuMatrixProps {
    menuData: MenuPerformance[];
    onMenuClick?: (menu: MenuPerformance) => void;
}

export function MenuMatrix({ menuData, onMenuClick }: MenuMatrixProps) {
    const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

    // Calculate median values for axes
    const salesValues = menuData.map(m => m.sales);
    const ratingValues = menuData.map(m => m.avgRating);

    const medianSales = salesValues.sort((a, b) => a - b)[Math.floor(salesValues.length / 2)] || 300;
    const medianRating = 4.0; // Fixed threshold for clearer quadrants

    // Normalize values for positioning (0-100 scale)
    const maxSales = Math.max(...salesValues);
    const minSales = Math.min(...salesValues);

    const getPosition = (menu: MenuPerformance) => {
        // X: sales (0-100)
        const x = ((menu.sales - minSales) / (maxSales - minSales)) * 80 + 10;
        // Y: rating (inverted because top = high rating)
        const y = ((5.0 - menu.avgRating) / 2.0) * 80 + 10;
        return { x, y };
    };

    const getQuadrant = (menu: MenuPerformance): number => {
        const highSales = menu.sales >= medianSales;
        const highRating = menu.avgRating >= medianRating;

        if (highSales && highRating) return 1; // Star (우상단)
        if (!highSales && highRating) return 2; // Hidden Gem (좌상단)
        if (!highSales && !highRating) return 3; // Underperformer (좌하단)
        return 4; // Fix Required (우하단)
    };

    const quadrantLabels = [
        { id: 1, label: "강력 추천", subtitle: "잘 팔리고 만족도 높음", color: "text-green-700", bg: "bg-green-50" },
        { id: 2, label: "숨은 보석", subtitle: "만족도 높음, 홍보 강화", color: "text-blue-700", bg: "bg-blue-50" },
        { id: 3, label: "정리 후보", subtitle: "개선 또는 메뉴 재검토", color: "text-gray-700", bg: "bg-gray-50" },
        { id: 4, label: "즉시 개선", subtitle: "잘 팔리는데 불만 높음", color: "text-red-700", bg: "bg-red-50" },
    ];

    return (
        <div className="space-y-4">
            {/* Matrix Title */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    메뉴 2x2 매트릭스 (판매 vs 만족도)
                </h3>
                <p className="text-xs text-gray-500">
                    각 메뉴를 클릭하면 상세 리뷰를 확인할 수 있습니다
                </p>
            </div>

            {/* Matrix Chart */}
            <div className="relative bg-white border border-gray-200 rounded-lg p-6" style={{ height: "500px" }}>
                {/* Quadrant backgrounds */}
                <div className="absolute inset-6 grid grid-cols-2 grid-rows-2 gap-0">
                    <div className="bg-blue-50/40 border-r border-b border-gray-200" />
                    <div className="bg-green-50/40 border-b border-gray-200" />
                    <div className="bg-gray-50/40 border-r border-gray-200" />
                    <div className="bg-red-50/40" />
                </div>

                {/* Quadrant labels */}
                {quadrantLabels.map((q) => (
                    <div
                        key={q.id}
                        className={cn(
                            "absolute text-center pointer-events-none",
                            q.id === 1 && "top-8 right-8",
                            q.id === 2 && "top-8 left-8",
                            q.id === 3 && "bottom-8 left-8",
                            q.id === 4 && "bottom-8 right-8"
                        )}
                    >
                        <p className={cn("text-xs font-semibold", q.color)}>{q.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{q.subtitle}</p>
                    </div>
                ))}

                {/* Axes */}
                <div className="absolute bottom-6 left-6 right-6 h-px bg-gray-300" />
                <div className="absolute top-6 bottom-6 left-6 w-px bg-gray-300" />

                {/* Axis labels */}
                <div className="absolute bottom-2 right-6 text-xs text-gray-500">판매 많음 →</div>
                <div className="absolute top-2 left-2 text-xs text-gray-500 -rotate-90 origin-top-left">
                    만족도 높음 ↑
                </div>

                {/* Menu points */}
                {menuData.map((menu) => {
                    const pos = getPosition(menu);
                    const quadrant = getQuadrant(menu);
                    const isHovered = hoveredMenu === menu.menuId;

                    return (
                        <div
                            key={menu.menuId}
                            className="absolute"
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                transform: "translate(-50%, -50%)",
                            }}
                        >
                            <button
                                onClick={() => onMenuClick?.(menu)}
                                onMouseEnter={() => setHoveredMenu(menu.menuId)}
                                onMouseLeave={() => setHoveredMenu(null)}
                                className={cn(
                                    "relative flex items-center justify-center rounded-full border-2 transition-all cursor-pointer",
                                    isHovered ? "scale-125 z-10" : "scale-100",
                                    quadrant === 1 && "bg-green-100 border-green-500",
                                    quadrant === 2 && "bg-blue-100 border-blue-500",
                                    quadrant === 3 && "bg-gray-100 border-gray-500",
                                    quadrant === 4 && "bg-red-100 border-red-500"
                                )}
                                style={{
                                    width: `${Math.max(24, Math.min(48, menu.sales / 10))}px`,
                                    height: `${Math.max(24, Math.min(48, menu.sales / 10))}px`,
                                }}
                            >
                                <span className="text-[10px] font
-bold text-gray-700">
                                    {menu.menuName.substring(0, 2)}
                                </span>
                            </button>

                            {/* Tooltip on hover */}
                            {isHovered && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-20 shadow-lg">
                                    <div className="font-semibold">{menu.menuName}</div>
                                    <div className="text-gray-300 mt-1">
                                        판매: {menu.sales}건 | 별점: {menu.avgRating.toFixed(1)}
                                    </div>
                                    <div className="text-gray-400 text-[10px] mt-0.5">
                                        {menu.cornerName}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
                {quadrantLabels.map((q) => (
                    <div key={q.id} className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full border",
                            q.id === 1 && "bg-green-100 border-green-500",
                            q.id === 2 && "bg-blue-100 border-blue-500",
                            q.id === 3 && "bg-gray-100 border-gray-500",
                            q.id === 4 && "bg-red-100 border-red-500"
                        )} />
                        <span className={cn("font-medium", q.color)}>{q.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
