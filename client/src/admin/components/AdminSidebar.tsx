import { Link, useLocation } from "wouter";
import {
    LayoutDashboard,
    Activity,
    Utensils,
    Sliders,
    Megaphone,
    Image as ImageIcon,
    BarChart2,
    FileText,
    Users,
    HelpCircle,
    LogOut,
    ChevronRight,
    Wifi
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

export function AdminSidebar() {
    const [location] = useLocation();
    const { logout } = useAdminAuth();

    const isActive = (path: string) => location === path || location.startsWith(path + "/");

    const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
        const active = isActive(href);
        return (
            <Link href={href}>
                <a className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group relative
          ${active
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-blue-100/80 hover:bg-white/5 hover:text-white"
                    }`}
                >
                    {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full" />
                    )}
                    <Icon size={18} className={active ? "text-blue-300" : "opacity-70 group-hover:opacity-100"} />
                    <span>{label}</span>
                    {active && <ChevronRight size={14} className="ml-auto text-blue-300/50" />}
                </a>
            </Link>
        );
    };

    const SectionTitle = ({ title, className = "" }: { title: string; className?: string }) => (
        <div className={`px-3 mb-2 text-xs font-bold text-blue-300/50 uppercase tracking-wider ${className}`}>
            {title}
        </div>
    );

    return (
        <aside className="w-[260px] bg-[#0E4A84] text-white flex flex-col shrink-0 z-20 shadow-xl font-sans">
            {/* 1. Brand Block */}
            <div className="h-[56px] flex flex-col justify-center px-6 border-b border-white/10 shrink-0">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    Admin Console
                </h1>
            </div>

            {/* 2. Menu Block */}
            <nav className="flex-1 flex flex-col overflow-hidden px-4 py-3 scrollbar-none">
                <div className="space-y-1">
                    {/* OPERATIONS */}
                    <SectionTitle title="Operations" className="mt-1" />
                    <NavItem href="/admin/dashboard" icon={LayoutDashboard} label="대시보드" />
                    <NavItem href="/admin/monitor" icon={Activity} label="실시간 모니터링" />
                    <NavItem href="/admin/menu" icon={Utensils} label="메뉴 등록" />
                    <NavItem href="/admin/ops" icon={Sliders} label="운영 제어" />

                    {/* CONTENT */}
                    <SectionTitle title="Content" />
                    <NavItem href="/admin/notices" icon={Megaphone} label="공지사항" />
                    <NavItem href="/admin/banners" icon={ImageIcon} label="배너 관리" />

                    {/* ANALYTICS */}
                    <SectionTitle title="Analytics" />
                    <NavItem href="/admin/reports" icon={BarChart2} label="성과 리포트" />
                    <NavItem href="/admin/logs" icon={FileText} label="로그 센터" />

                    {/* SYSTEM */}
                    <SectionTitle title="System" />
                    <NavItem href="/admin/admins" icon={Users} label="관리자 권한" />
                </div>

                {/* Spacer & Meta Block */}
                <div className="mt-auto pt-6 pb-2">
                    <div className="bg-[#0b3d6e]/40 rounded-lg p-4 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wide">System Status</span>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                                <span className="text-[10px] text-green-300 font-medium">Normal</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-blue-100/60">
                                <span>Last Sync</span>
                                <span>1 min ago</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-blue-100/60">
                                <span>Env</span>
                                <span className="text-blue-200 font-bold">DEV</span>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 3. Utility Block */}
            <div className="p-4 border-t border-white/10 bg-[#0b3d6e]/20 shrink-0 space-y-1">
                <button className="flex items-center gap-3 px-3 py-2 w-full text-left text-blue-200/70 hover:text-white hover:bg-white/5 rounded-md text-xs transition-colors">
                    <HelpCircle size={16} />
                    도움말 및 가이드
                </button>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2 w-full text-left text-red-200/80 hover:text-red-100 hover:bg-red-500/10 rounded-md text-xs transition-colors"
                >
                    <LogOut size={16} />
                    로그아웃
                </button>

                <div className="pt-3 px-3 flex justify-between items-center text-[10px] text-blue-300/30 font-mono">
                    <span>v0.4.1</span>
                    <span>Build 2026.02</span>
                </div>
            </div>
        </aside>
    );
}
