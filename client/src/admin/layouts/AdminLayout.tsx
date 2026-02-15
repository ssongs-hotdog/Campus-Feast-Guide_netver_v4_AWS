import { ReactNode } from "react";
import { Link } from "wouter";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminGlobalStyles } from "../components/AdminGlobalStyles";

interface AdminLayoutProps {
    children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="flex h-screen bg-gray-50/50">
            <AdminGlobalStyles />
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header - Admin Specific but Same Visual Tone as User TopAppBar */}
                <header className="h-[56px] bg-[#0E4A84] flex items-center justify-between px-4 border-b border-white/10 shadow-sm shrink-0">
                    <div className="flex items-center">
                        <Link href="/admin/dashboard">
                            <img
                                src="/brand/hy-eat-logo-white.png"
                                alt="HY-eat Admin"
                                className="h-6 w-auto object-contain cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = `<span class="text-white font-bold text-lg italic">HY-eat Admin</span>`;
                                }}
                            />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-white/80 text-sm font-medium">
                            관리자
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold border border-white/20">
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
