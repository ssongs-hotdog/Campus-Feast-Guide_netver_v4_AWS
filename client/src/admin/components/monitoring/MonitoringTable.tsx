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

// Helper for generating deterministic mock data
const getDeterministicValue = (id: string, seed: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.sin(seed + hash) * 10000;
    return x - Math.floor(x);
};

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
                        <TableHead className="w-[100px] text-center">예상 대기</TableHead>
                        <TableHead className="w-[100px] text-center">상태</TableHead>
                        <TableHead className="w-[110px] text-center">업데이트</TableHead>
                        <TableHead className="w-[60px] text-center">추세</TableHead>
                        <TableHead className="w-[120px] text-center">신뢰도</TableHead>
                        <TableHead className="w-[130px] text-center">금일 결제 건수</TableHead>
                        <TableHead className="w-[100px] text-center">상세</TableHead>
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
                            <TableCell className="text-center">
                                <span className={cn(
                                    "font-bold text-lg",
                                    item.estWaitTimeMin >= 20 ? "text-rose-600" : "text-gray-700"
                                )}>
                                    {item.estWaitTimeMin}분
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                {getStatusBadge(item.status)}
                            </TableCell>
                            <TableCell className="text-center">
                                <span className={cn(
                                    "text-sm",
                                    item.updateDelayMin >= 10 ? "text-rose-500 font-medium" : "text-gray-500"
                                )}>
                                    {item.updateDelayMin > 0 ? `${item.updateDelayMin}분 전` : "방금 전"}
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                {getTrendIcon(item.recentTrendPoints)}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full", item.reliabilityPct >= 80 ? "bg-emerald-500" : "bg-amber-500")}
                                            style={{ width: `${item.reliabilityPct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{item.reliabilityPct}%</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="text-sm font-semibold text-gray-700">
                                    {Math.floor(getDeterministicValue(item.id, 123) * 150 + 50)}건
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors">
                                    상세보기
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
