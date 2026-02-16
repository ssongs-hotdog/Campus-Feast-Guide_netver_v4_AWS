import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
    title: string;
    subtitle?: string;
    lastSync?: string;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export function DashboardHeader({ title, subtitle, lastSync, onRefresh, isLoading }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-3">
                {lastSync && (
                    <span className="text-xs text-gray-400">
                        마지막 업데이트: {new Date(lastSync).toLocaleTimeString()}
                    </span>
                )}
                {onRefresh && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-8 gap-2 bg-white"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                )}
            </div>
        </div>
    );
}
