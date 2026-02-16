import { useState } from "react";
import { Construction } from "lucide-react";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";

interface ComingSoonProps {
    title?: string;
}

export default function ComingSoon({ title = "페이지 준비 중" }: ComingSoonProps) {
    // Dummy state for visual consistency
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleRefresh = () => {
        setIsLoading(true);
        // Fake refresh
        setTimeout(() => {
            setLastUpdated(new Date());
            setIsLoading(false);
            toast({
                title: "새로고침 완료",
                description: "최신 데이터로 업데이트되었습니다."
            });
        }, 500);
    };

    return (
        <div className="space-y-4 pb-8">
            <AdminPageHeader
                title={title}
                subtitle="해당 기능은 현재 개발 중입니다."
                lastUpdated={lastUpdated}
                onRefresh={handleRefresh}
                autoRefresh={autoRefresh}
                onAutoRefreshChange={setAutoRefresh}
                isLoading={isLoading}
            />

            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh] bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="bg-blue-50 p-6 rounded-full mb-6 animate-pulse">
                    <Construction className="w-12 h-12 text-[#0E4A84]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">기능 준비 중입니다</h2>
                <p className="text-gray-500 max-w-md">
                    운영진을 위한 더 나은 환경을 만들고 있습니다.<br />
                    빠른 시일 내에 <strong>{title}</strong> 기능을 제공해 드리겠습니다.
                </p>
            </div>
        </div>
    );
}
