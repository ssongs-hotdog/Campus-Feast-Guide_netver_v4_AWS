import { Construction } from "lucide-react";

export default function ComingSoon() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
                <Construction className="w-12 h-12 text-[#0E4A84]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">페이지 준비 중입니다</h2>
            <p className="text-gray-500 max-w-md">
                해당 기능은 현재 개발 중이거나 아직 활성화되지 않았습니다.<br />
                빠른 시일 내에 제공해 드리겠습니다.
            </p>
        </div>
    );
}
