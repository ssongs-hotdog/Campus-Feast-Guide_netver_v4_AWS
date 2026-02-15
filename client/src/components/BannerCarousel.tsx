import React, { useState, useEffect, useRef, useCallback } from 'react';

const BANNER_IMAGES = [
    '/banners/banner_01.png',
    '/banners/banner_02.png',
    '/banners/banner_03.png',
];

// If no banner images found or array empty, fallback to default
const FALLBACK_IMAGE = '/banner.png';

const AUTO_SLIDE_INTERVAL = 5000;
const RESUME_DELAY = 3000;
const TRANSITION_DURATION = 300; // ms

export function BannerCarousel() {
    const [images] = useState<string[]>(BANNER_IMAGES.length > 0 ? BANNER_IMAGES : [FALLBACK_IMAGE]);
    // We need to clone first and last for infinite loop effect
    // [Last, First, Second, ..., Last, First]
    const extendedImages = [
        images[images.length - 1],
        ...images,
        images[0],
    ];

    const [currentIndex, setCurrentIndex] = useState(1); // Start at the first "real" image
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [offset, setOffset] = useState(0); // For drag effect

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // -- Auto Slide Logic --
    const nextSlide = useCallback(() => {
        if (images.length <= 1) return;
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev + 1);
    }, [images.length]);

    const prevSlide = useCallback(() => {
        if (images.length <= 1) return;
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev - 1);
    }, [images.length]);

    useEffect(() => {
        if (isPaused || images.length <= 1) return;

        timerRef.current = setInterval(() => {
            // Only auto-slide if not currently interacting (dragging)
            if (touchStart === null) {
                nextSlide();
            }
        }, AUTO_SLIDE_INTERVAL);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, images.length, nextSlide, touchStart]);


    // -- Infinite Loop Reset Logic --
    useEffect(() => {
        if (!isTransitioning) return;

        const transitionEndHandler = () => {
            setIsTransitioning(false);
            // If we are at the cloned last image (index 0), jump to real last
            if (currentIndex === 0) {
                setCurrentIndex(images.length);
            }
            // If we are at the cloned first image (index length + 1), jump to real first
            else if (currentIndex === images.length + 1) {
                setCurrentIndex(1);
            }
        };

        const timeout = setTimeout(transitionEndHandler, TRANSITION_DURATION);
        return () => clearTimeout(timeout);
    }, [currentIndex, isTransitioning, images.length]);


    // -- Interaction Handlers --
    const pauseAutoSlide = () => {
        setIsPaused(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };

    const resumeAutoSlide = () => {
        resumeTimerRef.current = setTimeout(() => {
            setIsPaused(false);
        }, RESUME_DELAY);
    };

    // Touch / Mouse Events
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (images.length <= 1) return;
        pauseAutoSlide();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        setTouchStart(clientX);
        setIsTransitioning(false); // Disable transition for direct tracking
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (touchStart === null) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        setTouchEnd(clientX);
        const diff = touchStart - clientX;
        setOffset(diff);
    };

    const handleTouchEnd = () => {
        if (touchStart === null || touchEnd === null) {
            // Just a tap or no movement
            resumeAutoSlide();
            setTouchStart(null);
            setTouchEnd(null);
            setOffset(0);
            return;
        }

        const minSwipeDistance = 50;
        const diff = touchStart - touchEnd;

        setIsTransitioning(true); // Re-enable transition for snap
        if (diff > minSwipeDistance) {
            nextSlide();
        } else if (diff < -minSwipeDistance) {
            prevSlide();
        } else {
            // Snap back if not enough swipe
            // No index change, just visual reset handled by re-render with offset 0
        }

        setTouchStart(null);
        setTouchEnd(null);
        setOffset(0);
        resumeAutoSlide();
    };

    // Prevent default drag behavior on images
    const handleDragStart = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // -- Render Helpers --
    // Calculate the translateX percentage
    // Base position is -100% * currentIndex
    // Plus the drag offset in pixels (converted to approx percentage for simplicity or use px calc)
    // To handle dragging precisely, let's use px for the container width ref, or % with calc

    // Real index for indicator (1-based)
    // If current is 0 (cloned last) -> real index is N
    // If current is N+1 (cloned first) -> real index is 1
    let displayIndex = currentIndex;
    if (currentIndex === 0) displayIndex = images.length;
    else if (currentIndex === images.length + 1) displayIndex = 1;

    return (
        <div
            className="w-full relative overflow-hidden rounded-lg shadow-sm border border-border select-none bg-[#0e4194]"
            style={{ aspectRatio: '2.35 / 1' }}
            ref={containerRef}
            role="region"
            aria-label="Batnner Carousel"
            onMouseEnter={pauseAutoSlide}
            onMouseLeave={resumeAutoSlide}
        >
            <div
                className="flex h-full"
                style={{
                    transform: `translateX(calc(-${currentIndex * 100}% - ${offset}px))`,
                    transition: isTransitioning ? `transform ${TRANSITION_DURATION}ms ease-out` : 'none',
                    cursor: images.length > 1 ? 'grab' : 'default',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={() => {
                    if (touchStart !== null) handleTouchEnd();
                }}
            >
                {extendedImages.map((src, idx) => (
                    <div
                        key={idx}
                        className="w-full flex-shrink-0 relative"
                        style={{ flex: '0 0 100%' }}
                    >
                        <img
                            src={src}
                            alt={`Banner ${idx}`}
                            className="w-full h-full object-contain bg-[#0e4194]"
                            onError={(e) => {
                                // Fallback to placeholder if specific banner fails
                                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                            }}
                            onDragStart={handleDragStart}
                        />
                    </div>
                ))}
            </div>

            {/* Indicator */}
            {images.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10">
                    {displayIndex} / {images.length}
                </div>
            )}
        </div>
    );
}
