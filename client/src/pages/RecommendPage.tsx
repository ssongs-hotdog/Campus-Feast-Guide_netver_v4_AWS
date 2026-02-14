import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { getMenus, getLatestWaitTimes } from '@/lib/data/dataProvider';
import { getTodayKey } from '@/lib/dateUtils';
import { useRecommendation, RecommendationItem } from '@/hooks/useRecommendation';
import { TopPickCard } from '@/components/recommend/TopPickCard';
import { RecommendList } from '@/components/recommend/RecommendList';
import { MenuData, WaitingData } from '@shared/types';

export default function RecommendPage() {
    const todayKey = getTodayKey();

    // --- Data Fetching ---
    const { data: menuData } = useQuery<MenuData | null>({
        queryKey: ['/api/menu', todayKey],
        queryFn: async () => {
            const result = await getMenus(todayKey);
            return result.data || null;
        }
    });

    const { data: waitingData, isLoading: isWaitingLoading } = useQuery<WaitingData[]>({
        queryKey: ['/api/waiting/latest', todayKey],
        queryFn: async () => {
            const result = await getLatestWaitTimes(todayKey);
            return result.data || [];
        },
        refetchInterval: 30000,
    });

    // --- Hook Logic ---
    const { topPicks, recommendations, lastUpdated } = useRecommendation(waitingData, menuData || null, isWaitingLoading);

    // --- Local Filter/Sort State ---
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeSort, setActiveSort] = useState('fast'); // fast, cheap, trend

    const filteredItems = useMemo(() => {
        let items = [...recommendations];

        // 1. Filter
        if (activeFilter === 'short') {
            items = items.filter(i => i.estWaitTimeMin <= 10);
        } else if (activeFilter === 'price_over_6k') {
            items = items.filter(i => i.price >= 6000);
        } else if (activeFilter === 'value') {
            // Simple value filter for list: price <= 5500
            items = items.filter(i => i.price <= 5500);
        }

        // 2. Sort
        if (activeSort === 'fast') {
            items.sort((a, b) => a.estWaitTimeMin - b.estWaitTimeMin);
        } else if (activeSort === 'cheap') {
            items.sort((a, b) => a.price - b.price);
        } else if (activeSort === 'trend') {
            // Re-use trend pick logic or just sort by current wait (weak proxy without delta in item)
            // For v1 list sort, just stick to low wait time if trend data missing in item
            items.sort((a, b) => a.estWaitTimeMin - b.estWaitTimeMin);
        }

        return items;
    }, [recommendations, activeFilter, activeSort]);

    // --- Carousel Indicator Logic ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [currentSlide, setCurrentSlide] = useState(1);
    const totalSlides = 3;

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollLeft, clientWidth } = scrollContainerRef.current;
        const index = Math.round(scrollLeft / (clientWidth * 0.7)) + 1; // Approx logic based on card width ratio
        // Simpler logic: snap points
        // Let's rely on scroll position relative to card width
        // Card width ~280px + gap 12px = 292px
        const activeIndex = Math.round(scrollLeft / 292) + 1;
        setCurrentSlide(Math.min(Math.max(activeIndex, 1), totalSlides));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">

            {/* Header */}
            <header className="px-5 pt-8 pb-6 bg-white border-b border-gray-100">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-extrabold text-[#0E4A84] mb-1">지금 추천</h1>
                        <p className="text-sm text-gray-500 font-medium">대기시간 기준으로 자동 추천돼요</p>
                    </div>
                </div>
                <p className="text-[10px] text-gray-300 mt-2">최근 업데이트 {lastUpdated}</p>
            </header>

            {/* Section A: Top Picks Carousel (ALWAYS 3 CARDS) */}
            <section className="bg-white border-b border-gray-100 pb-8 pt-6">
                <div className="px-5 mb-3 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Top Picks</h2>
                    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                        {currentSlide} / {totalSlides}
                    </span>
                </div>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-3 overflow-x-auto px-5 pb-4 snap-x mandatory scrollbar-hide"
                >
                    {/* 1. Fastest */}
                    <TopPickCard
                        type="fast"
                        item={topPicks.find(p => p.type === 'fast')}
                    />
                    {/* 2. Value */}
                    <TopPickCard
                        type="value"
                        item={topPicks.find(p => p.type === 'value')}
                    />
                    {/* 3. Trend */}
                    <TopPickCard
                        type="trend"
                        item={topPicks.find(p => p.type === 'trend')}
                    />
                </div>
            </section>

            {/* Gap for separation */}
            <div className="h-2 bg-gray-50"></div>

            {/* Section B: Filters & List */}
            <section className="bg-white px-5 py-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4">맞춤 리스트</h2>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
                    {[
                        { id: 'all', label: '전체' },
                        { id: 'short', label: '짧게' },
                        { id: 'price_over_6k', label: '6천원+' },
                        { id: 'value', label: '가성비' },
                    ].map(chip => (
                        <button
                            key={chip.id}
                            onClick={() => setActiveFilter(chip.id)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${activeFilter === chip.id
                                    ? 'bg-[#0E4A84] text-white shadow-sm'
                                    : 'bg-white text-gray-500 border border-gray-200'
                                }`}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>

                {activeFilter === 'short' && <p className="text-[10px] text-gray-400 mb-3 ml-1">💡 10분 이내로 식사할 수 있는 곳이에요</p>}
                {activeFilter === 'price_over_6k' && <p className="text-[10px] text-gray-400 mb-3 ml-1">💡 든든한 한 끼 식사 메뉴예요</p>}

                {/* Sort & List */}
                <div className="flex justify-between items-center mb-3 mt-6">
                    <span className="text-sm font-bold text-gray-800">목록</span>
                    <div className="flex gap-2 text-[10px] font-medium text-gray-400">
                        <span onClick={() => setActiveSort('fast')} className={`cursor-pointer ${activeSort === 'fast' ? 'text-[#0E4A84] font-bold' : ''}`}>빠른순</span>
                        <span>|</span>
                        <span onClick={() => setActiveSort('cheap')} className={`cursor-pointer ${activeSort === 'cheap' ? 'text-[#0E4A84] font-bold' : ''}`}>가격순</span>
                    </div>
                </div>

                <RecommendList items={filteredItems} />
            </section>

            {/* Gap for separation */}
            <div className="h-2 bg-gray-50"></div>

            {/* Section C: Today's Discovery */}
            <section className="bg-white px-5 py-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✨</span>
                    <h3 className="text-lg font-bold text-gray-800">오늘의 발견</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        오늘은 새로운 메뉴 <strong className="text-[#0E4A84]">돈까스 덮밥</strong> 어떠세요?<br />
                        <span className="text-xs text-gray-400 mt-1 block">학생회관 1층에서 만나볼 수 있어요.</span>
                    </p>
                </div>
            </section>
        </div>
    );
}
