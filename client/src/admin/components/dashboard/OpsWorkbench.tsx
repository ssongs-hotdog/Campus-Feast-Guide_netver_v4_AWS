import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { CornerStatus, DashboardDataV2 } from "@/admin/data/mockDashboardDataV2";
import { StatusBadge, TrendIndicator, ReliabilityIndicator } from "./DashboardComponents";
import { Search, Filter, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OpsWorkbenchProps {
    data: DashboardDataV2;
    isLoading: boolean;
}

export function OpsWorkbench({ data, isLoading }: OpsWorkbenchProps) {
    const [selectedCorner, setSelectedCorner] = useState<CornerStatus | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCorners = data.corners.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
            {/* Left: Live Status Table (2 cols) */}
            <div className="lg:col-span-2 flex flex-col h-full bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        Ops Workbench
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {data.corners.length} Operations
                        </span>
                    </h3>
                    <div className="flex gap-2">
                        <div className="relative w-48">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search..."
                                className="pl-8 h-9 text-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-9 px-2">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0">
                            <TableRow>
                                <TableHead className="w-[180px]">Corner Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Est. Wait</TableHead>
                                <TableHead>Trend</TableHead>
                                <TableHead>Reliability</TableHead>
                                <TableHead className="text-right">Last Update</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCorners.map((corner) => (
                                <TableRow
                                    key={corner.id}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setSelectedCorner(corner)}
                                >
                                    <TableCell className="font-medium">{corner.name}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={corner.status} />
                                    </TableCell>
                                    <TableCell className="font-mono text-gray-700">
                                        {corner.waitTime} min
                                    </TableCell>
                                    <TableCell>
                                        <TrendIndicator direction={corner.trend === 'rising' ? 'up' : corner.trend === 'falling' ? 'down' : 'flat'} />
                                    </TableCell>
                                    <TableCell>
                                        <ReliabilityIndicator level={corner.reliability} />
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-gray-400">
                                        {corner.lastUpdate}
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight className="h-4 w-4 text-gray-300" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Right: Heatmap (Today Timeline) - Simple Grid */}
            <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-800">Today Timeline</h3>
                    <p className="text-xs text-gray-500">Time x Congestion Heatmap</p>
                </div>
                <div className="p-4 flex-1 overflow-auto flex items-center justify-center">
                    <div className="w-full">
                        <div className="grid grid-cols-[auto_repeat(6,1fr)] gap-1 text-xs">
                            {/* Header Row: Times */}
                            <div className="h-6"></div> {/* Empty corner */}
                            {data.todaysHeatmap.timeLabels.map((time, i) => (
                                <div key={i} className="text-center text-gray-400 font-mono text-[10px]">{time}</div>
                            ))}

                            {/* Data Rows */}
                            {data.todaysHeatmap.cornerNames.map((name, rowIdx) => (
                                <>
                                    <div className="text-right font-medium text-gray-600 pr-2 h-8 flex items-center justify-end truncate">
                                        {name}
                                    </div>
                                    {data.todaysHeatmap.data[rowIdx].map((value, colIdx) => {
                                        // Color logic: 0-100
                                        let bgClass = "bg-emerald-50";
                                        if (value > 80) bgClass = "bg-rose-500";
                                        else if (value > 60) bgClass = "bg-rose-300";
                                        else if (value > 40) bgClass = "bg-amber-300";
                                        else if (value > 20) bgClass = "bg-emerald-200";

                                        return (
                                            <div
                                                key={colIdx}
                                                className={`h-8 rounded-sm ${bgClass} hover:opacity-80 transition-opacity cursor-help`}
                                                title={`${name} @ ${data.todaysHeatmap.timeLabels[colIdx]}: ${value}% Load`}
                                            />
                                        );
                                    })}
                                </>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Drawer */}
            <Sheet open={!!selectedCorner} onOpenChange={(open) => !open && setSelectedCorner(null)}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            {selectedCorner?.name}
                            {selectedCorner && <StatusBadge status={selectedCorner.status} type="solid" />}
                        </SheetTitle>
                        <SheetDescription>
                            Detailed status and history for {selectedCorner?.name}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedCorner && (
                        <div className="mt-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Current Wait</div>
                                    <div className="text-2xl font-bold font-mono">{selectedCorner.waitTime} min</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Reliability</div>
                                    <div className="flex items-center gap-2">
                                        <ReliabilityIndicator level={selectedCorner.reliability} />
                                        <span className="font-medium capitalize">{selectedCorner.reliability}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-3">Today's Trend</h4>
                                <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                                    Chart Placeholder (Canvas/Recharts)
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button className="flex-1" variant="destructive">Close Corner</Button>
                                <Button className="flex-1" variant="outline">Reset Data</Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
