import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Menu, Bell, Settings, LogOut } from "lucide-react";

interface AdminLayoutProps {
    children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [location] = useLocation();

    const isActive = (path: string) => location === path || location.startsWith(path + "/");

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0E4A84] text-white flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight">HY-eat Admin</h1>
                    <p className="text-xs text-blue-200 mt-1">Campus Feast Guide</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <Link href="/admin/dashboard">
                        <a className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive("/admin/dashboard") ? "bg-white/10 text-white" : "text-blue-100 hover:bg-white/5"}`}>
                            <LayoutDashboard size={18} />
                            대시보드
                        </a>
                    </Link>
                    <Link href="/admin/menus">
                        <a className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive("/admin/menus") ? "bg-white/10 text-white" : "text-blue-100 hover:bg-white/5"}`}>
                            <Menu size={18} />
                            식단 관리
                        </a>
                    </Link>
                    <Link href="/admin/notices">
                        <a className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive("/admin/notices") ? "bg-white/10 text-white" : "text-blue-100 hover:bg-white/5"}`}>
                            <Bell size={18} />
                            공지사항
                        </a>
                    </Link>
                </nav>

                <div className="p-4 border-t border-blue-800">
                    <button className="flex items-center gap-3 px-4 py-3 w-full text-left text-blue-200 hover:text-white text-sm font-medium transition-colors">
                        <LogOut size={18} />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
                    <div className="text-sm text-gray-500">
                        관리자 모드 접속 중
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            A
                        </div>
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 overflow-auto p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
