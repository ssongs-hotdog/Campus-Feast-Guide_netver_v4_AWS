import { queryClient } from "@/lib/queryClient";

const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || "/api/admin";

interface ApiRequestOptions extends RequestInit {
    token?: string;
}

/**
 * Custom fetch wrapper for Admin API
 * Automatically adds Authorization header if token exists
 */
export async function adminFetch<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const token = options.token || localStorage.getItem("hyeat_admin_token");

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Mock Mode Check (GATE 3 ONLY)
    // TODO: Remove this block when Real API is ready
    if (endpoint === "/login") {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate returning network
        const body = JSON.parse(options.body as string);
        if (body.password === "admin1234") {
            return { token: "mock_jwt_token_gate_3", user: { id: "admin", email: "admin@hyeat.com" } } as unknown as T;
        }
        throw new Error("비밀번호가 올바르지 않습니다.");
    }
    if (endpoint === "/me") {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (token === "mock_jwt_token_gate_3") {
            return { id: "admin", email: "admin@hyeat.com" } as unknown as T;
        }
        throw new Error("Unauthorized");
    }
    // End Mock Mode

    const response = await fetch(`${ADMIN_API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Auto logout trigger could go here
            localStorage.removeItem("hyeat_admin_token");
            window.location.href = "/admin/login";
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * React Query Keys for Admin
 */
export const adminKeys = {
    all: ["admin"] as const,
    user: () => [...adminKeys.all, "user"] as const,
    menus: () => [...adminKeys.all, "menus"] as const,
};
