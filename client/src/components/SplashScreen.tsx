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
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0E4A84]"
        >
            <div className="flex flex-col items-center">
                {/* Logo Image with White Filter */}
                <div className="w-48 h-20 relative mb-4">
                    <img
                        src="/banner.png"
                        alt="HY-eat Logo"
                        className="w-full h-full object-contain"
                        style={{
                            filter: "brightness(0) invert(1)"
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
