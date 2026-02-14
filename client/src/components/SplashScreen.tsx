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
            <div className="flex flex-col items-center justify-center w-full h-full p-8">
                {/* Render Transparency-Optimized Logo (Image Only) */}
                {/* Using max-w and w-full to ensure responsiveness and centering */}
                <div className="w-[80%] max-w-[320px] h-auto relative">
                    <img
                        src="/splash_logo.png"
                        alt="HY-eat"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<h1 class="text-5xl font-black text-white italic text-center" style="font-family: sans-serif">HY-eat</h1>`;
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
