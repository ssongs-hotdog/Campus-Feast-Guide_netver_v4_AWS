import { motion } from "framer-motion";
import { useSplash } from "@/contexts/SplashContext";

export function SplashScreen() {
    const { isVisible } = useSplash();

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0E4A84]"
        >
            <div className="flex flex-col items-center">
                {/* Render Transparency-Optimized Logo */}
                <div className="w-64 h-auto relative mb-4">
                    <img
                        src="/splash_logo.png"
                        alt="HY-eat"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            // Fallback to text if image is missing
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<h1 class="text-6xl font-black text-white tracking-tighter italic" style="font-family: sans-serif">HY-eat</h1>`;
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
