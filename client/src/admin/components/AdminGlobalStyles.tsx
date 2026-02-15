import { useEffect } from "react";

export function AdminGlobalStyles() {
    useEffect(() => {
        document.body.classList.add("admin-mode");
        return () => {
            document.body.classList.remove("admin-mode");
        };
    }, []);

    return null;
}
