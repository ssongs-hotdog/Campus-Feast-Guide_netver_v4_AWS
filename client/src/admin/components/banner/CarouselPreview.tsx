import { useState, useEffect } from "react";
import { Banner } from "../../data/bannerModel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CarouselPreviewProps {
    banners: Banner[];
    autoRotate?: boolean;
    intervalSec?: number;
    showIndicators?: boolean;
}

export function CarouselPreview({
    banners,
    autoRotate = true,
    intervalSec = 5,
    showIndicators = true,
}: CarouselPreviewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-rotate effect
    useEffect(() => {
        if (!autoRotate || banners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, intervalSec * 1000);

        return () => clearInterval(interval);
    }, [autoRotate, intervalSec, banners.length]);

    // Reset index when banners change
    useEffect(() => {
        if (currentIndex >= banners.length) {
            setCurrentIndex(0);
        }
    }, [banners.length, currentIndex]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    };

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    if (banners.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-center p-8">
                    <div className="bg-gray-100 p-4 rounded-full mb-3 inline-block">
                        <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">노출중인 배너가 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">배너를 추가하고 노출하면 여기에 표시됩니다.</p>
                </div>
            </div>
        );
    }

    const currentBanner = banners[currentIndex];

    return (
        <div className="relative w-full h-full bg-white rounded-xl border border-gray-200 overflow-hidden group">
            {/* Banner Image */}
            <div className="relative w-full h-full">
                <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.altText}
                    className="w-full h-full object-cover"
                />

                {/* Overlay Info (for admin preview) */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded text-xs font-medium">
                    {currentBanner.internalName}
                </div>
            </div>

            {/* Navigation Arrows (show on hover) */}
            {banners.length > 1 && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/90 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-800" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/90 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-800" />
                    </Button>
                </>
            )}

            {/* Indicators */}
            {showIndicators && banners.length > 1 && (
                <>
                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full">
                        {banners.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => handleDotClick(index)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    index === currentIndex
                                        ? "bg-white w-6"
                                        : "bg-white/50 hover:bg-white/75"
                                )}
                                aria-label={`배너 ${index + 1}로 이동`}
                            />
                        ))}
                    </div>

                    {/* Counter */}
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-medium">
                        {currentIndex + 1}/{banners.length}
                    </div>
                </>
            )}
        </div>
    );
}
