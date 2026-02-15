import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

interface AdminUser {
    id: string;
    email: string;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string) => void; // GATE 3에서 실제 토큰 검증 로직 추가
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [, setLocation] = useLocation();

    useEffect(() => {
        // Check for existing session
        const token = localStorage.getItem("hyeat_admin_token");
        if (token) {
            // TODO: Verify token with backend in GATE 3
            // For GATE 2, we assume valid if token exists
            setUser({ id: "admin", email: "admin@hanyang.ac.kr" });
        }
        setIsLoading(false);
    }, []);

    const login = (token: string) => {
        localStorage.setItem("hyeat_admin_token", token);
        setUser({ id: "admin", email: "admin@hanyang.ac.kr" });
        setLocation("/admin/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("hyeat_admin_token");
        setUser(null);
        setLocation("/admin/login");
    };

    return (
        <AdminAuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
}
