import { Link, useLocation } from "wouter";
import { Home, Calendar, Sparkles, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
    const [location] = useLocation();

    const tabs = [
        { name: "홈", path: "/", icon: Home, matchPrefix: false },
        { name: "메뉴", path: "/menu", icon: Calendar, matchPrefix: true },
        { name: "추천", path: "/recommend", icon: Sparkles, matchPrefix: true },
        { name: "식권", path: "/ticket", icon: Ticket, matchPrefix: true },
        { name: "MY", path: "/my", icon: User, matchPrefix: true },
    ];

    // Helper to check active state
    // For home '/', allow '/d/...' to also be active, assuming home is the main view
    const isActive = (path: string, matchPrefix: boolean) => {
        if (path === "/") {
            // Home is active if exact match OR starts with /d/ (detail view) OR /restaurant (if navigated)
            // Adjust logic based on your exact home routing requirements.
            return location === "/" || location.startsWith("/d/") || location.startsWith("/restaurant/");
        }
        return location === path;
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 h-[60px] flex items-center justify-around pb-safe">
            {tabs.map((tab) => {
                const active = isActive(tab.path, tab.matchPrefix);
                const Icon = tab.icon;

                return (
                    <Link key={tab.path} href={tab.path} className="flex-1">
                        <div className="flex flex-col items-center justify-center h-full w-full cursor-pointer">
                            <Icon
                                size={24}
                                className={cn(
                                    "mb-[2px] transition-colors",
                                    active ? "text-[#0E4A84]" : "text-[#9AA0A6]"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-[11px] font-medium transition-colors",
                                    active ? "text-[#0E4A84]" : "text-[#9AA0A6]"
                                )}
                            >
                                {tab.name}
                            </span>
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
}
