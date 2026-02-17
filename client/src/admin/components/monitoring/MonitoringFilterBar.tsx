import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Filter } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MonitoringFilterBarProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    statusFilter: string;
    onStatusChange: (val: string) => void;
    onlyCongested: boolean;
    onCongestedChange: (val: boolean) => void;
    onReset: () => void;
}

export function MonitoringFilterBar({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusChange,
    onlyCongested,
    onCongestedChange,
    onReset
}: MonitoringFilterBarProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex-1 w-full md:w-auto flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                    placeholder="코너명 검색..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="max-w-xs h-9 text-sm"
                />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                <div className="flex items-center space-x-2 border-r pr-4 border-gray-200">
                    <Switch
                        id="congested-mode"
                        checked={onlyCongested}
                        onCheckedChange={onCongestedChange}
                    />
                    <Label htmlFor="congested-mode" className="text-sm font-medium cursor-pointer">
                        혼잡 코너만 보기
                    </Label>
                </div>

                <Select value={statusFilter} onValueChange={onStatusChange} disabled={onlyCongested}>
                    <SelectTrigger className="w-[140px] h-9">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            <SelectValue placeholder="상태 필터" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">전체 상태</SelectItem>
                        <SelectItem value="congested">혼잡</SelectItem>
                        <SelectItem value="normal">원활</SelectItem>
                        <SelectItem value="closed">강제마감</SelectItem>
                        <SelectItem value="sold_out">품절</SelectItem>
                        <SelectItem value="data_delay">데이터지연</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="h-9 gap-2"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    초기화
                </Button>
            </div>
        </div>
    );
}
