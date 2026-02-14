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
                {/* Text Logo Implementation */}
                <div className="flex flex-col items-center justify-center space-y-2">
                    {/* Main Brand Name */}
                    <h1 className="text-6xl font-black text-white tracking-tighter italic" style={{ fontFamily: "sans-serif" }}>
                        HY-eat
                    </h1>
                    {/* Slogan */}
                    <p className="text-white/80 text-sm font-bold tracking-widest uppercase mt-2">
                        WAIT LESS. PAY FASTER.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
