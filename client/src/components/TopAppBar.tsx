import { Link, useLocation } from "wouter";
import { Bell } from "lucide-react";
import { mockNotifications } from "@/data/mockNotifications";

export default function TopAppBar() {
    const [location] = useLocation();

    // Hide TopAppBar on specific routes if needed (e.g., Splash, or if NotificationCenter has its own header)
    // For now, based on requirements, we might want to show it on main tabs.
    // NotificationCenter usually has a "Back" header, so we might hide this global bar there.
    const isNotificationPage = location === "/notifications";
    const isSplash = false; // Splash handles its own visibility via context/overlay

    // Show on main tabs or wherever appropriate. 
    // If we want it global but hidden on Notification page:
    if (isNotificationPage) return null;

    // Calculate unread count
    // Logic: Sum of (notice unread + personal unread)
    const unreadCount = mockNotifications.filter(n => !n.isRead).length;
    const hasUnread = unreadCount > 0;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-[56px] bg-[#0E4A84] flex items-center justify-between px-4 shadow-sm">
            {/* Left: Logo */}
            <div className="flex items-center">
                <Link href="/">
                    <img
                        src="/brand/hy-eat-logo-white.png"
                        alt="HY-eat"
                        className="h-6 w-auto object-contain cursor-pointer"
                        onError={(e) => {
                            // Fallback if image missing (dev safety)
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<span class="text-white font-bold text-xl italic">HY-eat</span>`;
                        }}
                    />
                </Link>
            </div>

            {/* Right: Notification Bell */}
            <Link href="/notifications">
                <div className="relative p-2 cursor-pointer">
                    <Bell className="text-white w-6 h-6" />

                    {/* Badge: Red dot if unread > 0 */}
                    {hasUnread && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-1 ring-[#0E4A84]" />
                    )}
                </div>
            </Link>
        </header>
    );
}
