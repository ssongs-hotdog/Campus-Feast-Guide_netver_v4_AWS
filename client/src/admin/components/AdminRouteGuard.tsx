import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "../context/AdminAuthContext";

interface AdminRouteGuardProps {
    children: ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
    const { isAuthenticated, isLoading } = useAdminAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            setLocation("/admin/login");
        }
    }, [isLoading, isAuthenticated, setLocation]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-gray-500">Checking permissions...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect via useEffect
    }

    return <>{children}</>;
}
