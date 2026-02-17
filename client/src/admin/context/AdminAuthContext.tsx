import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "../lib/api";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
    id: string;
    email: string;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (password: string) => Promise<void>;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const token = localStorage.getItem("hyeat_admin_token");
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const userData = await adminFetch<AdminUser>("/me");
            setUser(userData);
        } catch (error) {
            console.error("Session verification failed", error);
            localStorage.removeItem("hyeat_admin_token");
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (password: string) => {
        try {
            const data = await adminFetch<{ token: string; user: AdminUser }>("/login", {
                method: "POST",
                body: JSON.stringify({ password }),
            });

            localStorage.setItem("hyeat_admin_token", data.token);
            setUser(data.user);
            setLocation("/admin/dashboard");
            toast({ title: "로그인 성공", description: "관리자 페이지에 접속했습니다." });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "로그인 실패",
                description: error.message
            });
            throw error; // Re-throw for UI error handling
        }
    };

    const logout = () => {
        localStorage.removeItem("hyeat_admin_token");
        setUser(null);
        setLocation("/admin/login");
        toast({ title: "로그아웃", description: "안전하게 로그아웃 되었습니다." });
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
