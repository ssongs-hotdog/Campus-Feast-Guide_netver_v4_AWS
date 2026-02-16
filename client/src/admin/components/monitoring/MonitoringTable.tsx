import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ExternalLink } from "lucide-react";
import { MonitoringCornerStatus } from "@/admin/data/mockMonitoringData";
import { cn } from "@/lib/utils";

interface MonitoringTableProps {
    data: MonitoringCornerStatus[];
    onRowClick: (item: MonitoringCornerStatus) => void;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case "congested":
            return <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600">혼잡</Badge>;
        case "normal":
            return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">원활</Badge>;
        case "closed":
            return <Badge variant="outline" className="text-gray-500 border-gray-300">강제마감</Badge>;
        case "sold_out":
            return <Badge variant="secondary" className="bg-gray-800 text-white hover:bg-gray-700">품절</Badge>;
        case "data_delay":
            return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">데이터지연</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

const getTrendIcon = (points: number[]) => {
    // Simple logic: compare last vs avg of prev 3
    if (points.length < 2) return <span className="text-gray-400">-</span>;
    const current = points[points.length - 1];
    const prev = points[points.length - 2];

    if (current > prev + 5) return <span className="text-rose-500 font-bold">↗</span>;
    if (current < prev - 5) return <span className="text-emerald-500 font-bold">↘</span>;
    return <span className="text-gray-400">→</span>;
};

export function MonitoringTable({ data, onRowClick }: MonitoringTableProps) {
    if (data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                <p className="text-gray-500 font-medium mb-1">표시할 데이터가 없습니다.</p>
                <p className="text-sm text-gray-400">필터 조건을 변경하거나 초기화해보세요.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableHead className="w-[200px]">식당 / 코너명</TableHead>
                        <TableHead>예상 대기</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>업데이트</TableHead>
                        <TableHead>추세</TableHead>
                        <TableHead>신뢰도</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-slate-50 transition-colors group"
                            onClick={() => onRowClick(item)}
                        >
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800">{item.cornerName}</span>
                                    <span className="text-xs text-gray-400">{item.restaurantName}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "font-mono font-bold text-lg",
                                    item.estWaitTimeMin >= 20 ? "text-rose-600" : "text-gray-700"
                                )}>
                                    {item.estWaitTimeMin}분
                                </span>
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(item.status)}
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "text-sm",
                                    item.updateDelayMin >= 10 ? "text-rose-500 font-medium" : "text-gray-500"
                                )}>
                                    {item.updateDelayMin > 0 ? `${item.updateDelayMin}분 전` : "방금 전"}
                                </span>
                            </TableCell>
                            <TableCell>
                                {getTrendIcon(item.recentTrendPoints)}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full", item.reliabilityPct >= 80 ? "bg-emerald-500" : "bg-amber-500")}
                                            style={{ width: `${item.reliabilityPct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{item.reliabilityPct}%</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
