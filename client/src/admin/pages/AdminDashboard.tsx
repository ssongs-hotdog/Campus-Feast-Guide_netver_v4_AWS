export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">대시보드</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500">현재 대기 인원</h3>
                    <p className="text-3xl font-bold text-[#0E4A84] mt-2">-- 명</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500">오늘 방문자 수</h3>
                    <p className="text-3xl font-bold text-[#0E4A84] mt-2">-- 명</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500">시스템 상태</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">정상</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center h-64 text-gray-400">
                차트 영역 (GATE 3 이후 구현)
            </div>
        </div>
    );
}
