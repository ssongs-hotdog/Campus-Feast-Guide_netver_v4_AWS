import { ArrowUp, ArrowDown, Minus, Signal, SignalHigh, SignalLow } from "lucide-react";

export function StatusBadge({ status, type = "dot" }: { status: string; type?: "dot" | "solid" }) {
    const colors: Record<string, string> = {
        good: "bg-emerald-500",
        success: "bg-emerald-500",
        open: "bg-emerald-500",
        warning: "bg-amber-500",
        congested: "bg-amber-500",
        critical: "bg-rose-500",
        fail: "bg-rose-500",
        closed: "bg-gray-400",
        break: "bg-gray-400",
    };

    const textColors: Record<string, string> = {
        good: "text-emerald-700 bg-emerald-50",
        success: "text-emerald-700 bg-emerald-50",
        open: "text-emerald-700 bg-emerald-50",
        warning: "text-amber-700 bg-amber-50",
        congested: "text-amber-700 bg-amber-50",
        critical: "text-rose-700 bg-rose-50",
        fail: "text-rose-700 bg-rose-50",
        closed: "text-gray-600 bg-gray-100",
        break: "text-gray-600 bg-gray-100",
    };

    const labels: Record<string, string> = {
        good: "정상",
        success: "달성",
        open: "원활",
        warning: "주의",
        congested: "혼잡",
        critical: "위험",
        fail: "미달",
        closed: "마감",
        break: "휴식",
    };

    const bg = colors[status] || "bg-gray-400";
    const textStyle = textColors[status] || "text-gray-600 bg-gray-100";

    if (type === "solid") {
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${textStyle}`}>
                {labels[status] || status}
            </span>
        )
    }

    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${bg} transition-colors`} />
            <span className="text-sm text-gray-600 font-medium">
                {labels[status] || status}
            </span>
        </div>
    );
}

export function TrendIndicator({ direction, value }: { direction: string; value?: string }) {
    if (direction === "up") {
        return (
            <div className="flex items-center gap-0.5 text-rose-600 text-xs font-medium">
                <ArrowUp className="w-3 h-3" />
                {value && <span>{value}</span>}
            </div>
        );
    }
    if (direction === "down") {
        return (
            <div className="flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
                <ArrowDown className="w-3 h-3" />
                {value && <span>{value}</span>}
            </div>
        );
    }
    return (
        <div className="flex items-center gap-0.5 text-gray-400 text-xs font-medium">
            <Minus className="w-3 h-3" />
            {value && <span>{value}</span>}
        </div>
    );
}

export function ReliabilityIndicator({ level }: { level: "high" | "medium" | "low" }) {
    if (level === "high") {
        return <Signal className="w-4 h-4 text-emerald-500" />;
    }
    if (level === "medium") {
        return <SignalHigh className="w-4 h-4 text-amber-500" />;
    }
    return <SignalLow className="w-4 h-4 text-rose-500" />;
}
