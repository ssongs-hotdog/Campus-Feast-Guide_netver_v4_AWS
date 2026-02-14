import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Info, Bell } from "lucide-react";
import { mockNotifications, NotificationItem } from "@/data/mockNotifications";
import { cn } from "@/lib/utils";

export default function NotificationCenter() {
    const [activeTab, setActiveTab] = useState<'notice' | 'personal'>('notice');
    const [, setLocation] = useLocation();

    // Filter notifications based on active tab
    const filteredNotifications = mockNotifications.filter(
        (n) => n.type === activeTab
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Custom Header for Notification Center */}
            <header className="fixed top-0 left-0 right-0 z-50 h-[56px] bg-white border-b border-gray-200 flex items-center px-4">
                <button
                    onClick={() => setLocation("/")} // Go back to home (or previous page if we had history)
                    className="p-2 -ml-2 text-gray-700"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold text-gray-900 ml-2">알림</h1>
            </header>

            {/* Tabs */}
            <div className="fixed top-[56px] left-0 right-0 z-40 bg-white shadow-sm flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('notice')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'notice'
                            ? "border-[#0E4A84] text-[#0E4A84]"
                            : "border-transparent text-gray-500"
                    )}
                >
                    공지
                </button>
                <button
                    onClick={() => setActiveTab('personal')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'personal'
                            ? "border-[#0E4A84] text-[#0E4A84]"
                            : "border-transparent text-gray-500"
                    )}
                >
                    개인알림
                </button>
            </div>

            {/* Content List */}
            <div className="pt-[110px] px-4 pb-safe bg-white min-h-screen">
                {filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                        {activeTab === 'notice' ? <Info size={48} className="mb-4 opacity-50" /> : <Bell size={48} className="mb-4 opacity-50" />}
                        <p>{activeTab === 'notice' ? "등록된 공지사항이 없습니다." : "새로운 알림이 없습니다."}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {filteredNotifications.map((item) => (
                            <li key={item.id} className="py-4 cursor-pointer active:bg-gray-50">
                                <div className="flex justify-between items-start mb-1">
                                    <span className={cn("text-sm font-medium text-gray-900", !item.isRead && "font-bold text-black")}>
                                        {!item.isRead && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-2 mb-0.5 align-middle" />}
                                        {item.title}
                                    </span>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{item.date}</span>
                                </div>
                                {item.content && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.content}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
