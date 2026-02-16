import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
    title: string;
    subtitle?: string;
    rightAction?: ReactNode;
    lastUpdated?: Date;
    onRefresh?: () => void;
    isLoading?: boolean;
    autoRefresh?: boolean;
    onAutoRefreshChange?: (enabled: boolean) => void;
    className?: string; // Allow custom classes just in case, but rely on standard layout
}

export function AdminPageHeader({
    title,
    subtitle,
    rightAction,
    lastUpdated,
    onRefresh,
    isLoading = false,
    autoRefresh,
    onAutoRefreshChange,
    className
}: AdminPageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-3 -mx-8 px-8", className)}>
            {/* Left: Title & Subtitle */}
            <div className="shrink-0">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-2">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-gray-500 leading-none">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Right: Actions & Meta */}
            <div className="flex items-center gap-3 shrink-0">
                {rightAction}

                {/* Standard Refresh & Time controls */}
                {(lastUpdated || onRefresh) && (
                    <div className="flex items-center gap-3">
                        {/* 1. Auto Refresh Toggle (Left of Time) */}
                        {onAutoRefreshChange && (
                            <div className="flex items-center gap-1.5 mr-1">
                                <div
                                    className={cn(
                                        "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                                        autoRefresh ? "bg-emerald-500" : "bg-gray-300"
                                    )}
                                    onClick={() => onAutoRefreshChange(!autoRefresh)}
                                >
                                    <div
                                        className={cn(
                                            "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
                                            autoRefresh ? "translate-x-4" : "translate-x-0"
                                        )}
                                    />
                                </div>
                                <span
                                    className="text-xs text-gray-500 cursor-pointer select-none"
                                    onClick={() => onAutoRefreshChange(!autoRefresh)}
                                >
                                    자동 갱신
                                </span>
                            </div>
                        )}

                        {/* 2. Last Updated Text (Middle) */}
                        {lastUpdated && (
                            <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline-block">
                                마지막 업데이트: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}

                        {/* 3. Refresh Button (Right, Icon Only) */}
                        {onRefresh && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="h-7 w-7 bg-white border-gray-200 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
