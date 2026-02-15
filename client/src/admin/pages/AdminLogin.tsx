import { useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export default function AdminLogin() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAdminAuth();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // GATE 2: Simple hardcoded check for dev/demo purpose
        // GATE 3: Replace with Cognito/Backend verification
        if (password === "admin1234") {
            login("mock_token_for_gate_2");
        } else {
            setError("비밀번호가 올바르지 않습니다.");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <Card className="w-full max-w-sm shadow-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-2">
                        <Lock className="w-6 h-6 text-[#0E4A84]" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
                    <CardDescription>
                        관리자 전용 페이지입니다.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="관리자 암호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-[#0E4A84] hover:bg-[#0b3d6e]" type="submit">
                            로그인
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
