import { Link } from "wouter";
import { Activity, Megaphone, Image as ImageIcon, Utensils } from "lucide-react";

export function QuickActions() {
    const actions = [
        {
            label: "실시간 모니터링",
            desc: "전체 현황판",
            href: "/admin/monitor",
            icon: Activity,
            color: "bg-blue-50 text-blue-600",
            hover: "hover:bg-blue-100"
        },
        {
            label: "공지 등록",
            desc: "긴급 알림 발송",
            href: "/admin/notices",
            icon: Megaphone,
            color: "bg-orange-50 text-orange-600",
            hover: "hover:bg-orange-100"
        },
        {
            label: "배너 관리",
            desc: "홈 화면 프로모션",
            href: "/admin/banners",
            icon: ImageIcon,
            color: "bg-purple-50 text-purple-600",
            hover: "hover:bg-purple-100"
        },
        {
            label: "메뉴 등록",
            desc: "주간 식단 업데이트",
            href: "/admin/menu",
            icon: Utensils,
            color: "bg-green-50 text-green-600",
            hover: "hover:bg-green-100"
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-4 flex-1">
                {actions.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                        <Link key={idx} href={action.href}>
                            <a className={`flex flex-col items-center justify-center text-center p-4 rounded-xl transition-all h-full
                                border border-transparent ${action.color} ${action.hover} bg-opacity-50`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-white shadow-sm`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-gray-900">{action.label}</span>
                                <span className="text-xs text-gray-500 mt-1">{action.desc}</span>
                            </a>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
