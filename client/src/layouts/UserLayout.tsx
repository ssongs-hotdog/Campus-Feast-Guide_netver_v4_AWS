import { ReactNode } from "react";
import TopAppBar from "@/components/TopAppBar";
import BottomNav from "@/components/BottomNav";

interface UserLayoutProps {
    children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
    return (
        <>
            <TopAppBar />
            <div className="pt-[56px] pb-[60px] min-h-screen bg-background">
                {children}
            </div>
            <BottomNav />
        </>
    );
}
