/**
 * ReviewPage.tsx - Review Creation and Listing Page
 * 
 * Purpose: Allows users to write a review and view existing reviews for a specific menu corner.
 * Design Reference: 'Baemin' style (Clean white cards on gray background).
 */
import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RESTAURANTS, type MenuData } from '@shared/types';
import { getMenus } from '@/lib/data/dataProvider';
import { useTimeContext } from '@/lib/timeContext';
import { CORNER_DISPLAY_NAMES } from '@shared/cornerDisplayNames';
import { isValidDayKey, getTodayKey } from '@/lib/dateUtils';

// Mock Data for Reviews
const MOCK_REVIEWS = [
    {
        id: 1,
        nickname: "학식마스터",
        rating: 5,
        date: "2026-02-16",
        content: "고구마돈까스 진짜 맛있어요! 소스가 달짝지근하니 딱 제 취향입니다. 양도 많아서 배부르게 먹었어요.",
        isOwner: false
    },
    {
        id: 2,
        nickname: "배고픈대학생",
        rating: 4,
        date: "2026-02-16",
        content: "맛은 있는데 줄이 좀 기네요 ㅠㅠ 그래도 기다린 보람이 있습니다.",
        isOwner: false
    },
    {
        id: 3,
        nickname: "익명",
        rating: 5,
        date: "2026-02-15",
        content: "가성비 최고! 이 가격에 이 퀄리티면 맨날 옵니다.",
        isOwner: true
    }
];

export default function ReviewPage() {
    const [match, params] = useRoute('/reviews/:restaurantId/:cornerId');
    const [location, setLocation] = useLocation();
    const { todayKey } = useTimeContext();

    // Parse query params for date
    const searchParams = new URLSearchParams(window.location.search);
    const dateParam = searchParams.get('date');
    const effectiveDate = dateParam || todayKey;

    const restaurantId = params?.restaurantId || '';
    const cornerId = params?.cornerId || '';

    // State for review writing
    const [rating, setRating] = useState<number>(0);
    const [content, setContent] = useState<string>('');

    // Helper to get formatted date
    const todayFormatted = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

    const restaurant = RESTAURANTS.find((r) => r.id === restaurantId);
    const restaurantName = restaurant?.name || '식당';
    const cornerName = CORNER_DISPLAY_NAMES[cornerId] || cornerId;

    const { data: menuData } = useQuery<MenuData | null>({
        queryKey: ['/api/menu', effectiveDate],
        queryFn: async () => {
            const result = await getMenus(effectiveDate);
            if (result.error) return null;
            return result.data as MenuData;
        },
    });

    const menu = menuData?.[restaurantId]?.[cornerId];
    const menuName = menu?.mainMenuName || '메뉴 정보 없음';

    const handleBack = () => {
        window.history.back();
    };

    const handleSubmit = () => {
        if (rating === 0) {
            alert('별점을 선택해 주세요.');
            return;
        }
        if (content.length < 5) {
            alert('리뷰 내용을 5자 이상 작성해 주세요.');
            return;
        }
        // TODO: Submit review API call
        alert('리뷰가 등록되었습니다!');
        setRating(0);
        setContent('');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        className="-ml-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-base font-semibold text-gray-900">{restaurantName}</h1>
                        <p className="text-xs text-gray-500">{cornerName}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

                {/* Write Section */}
                <Card className="bg-white rounded-2xl p-6 shadow-sm mb-8 border-none ring-1 ring-gray-100">
                    <h2 className="text-xl font-bold text-center text-gray-900 mb-6">
                        {menuName}
                        <span className="block text-sm font-normal text-gray-500 mt-1">어떠셨나요?</span>
                    </h2>

                    {/* Star Input */}
                    <div className="flex justify-center gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="focus:outline-none transition-transform active:scale-90"
                            >
                                <Star
                                    className={`w-10 h-10 ${star <= rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-200 fill-gray-100'
                                        }`}
                                    strokeWidth={1.5}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Text Input */}
                    <div className="bg-gray-100 rounded-xl p-4 mb-4">
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="음식의 맛, 양 등에 대한 솔직한 리뷰를 남겨주세요."
                            className="bg-transparent border-none shadow-none resize-none h-32 p-0 focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 text-base leading-relaxed"
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        className="w-full h-14 bg-[#0E4A84] hover:bg-[#0b3d6e] text-white font-bold text-lg rounded-xl shadow-md active:scale-[0.98] transition-all"
                        onClick={handleSubmit}
                    >
                        리뷰 등록하기
                    </Button>
                </Card>

                {/* List Section */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">최근 리뷰</h3>

                    <div className="space-y-4">
                        {MOCK_REVIEWS.map((review) => (
                            <Card key={review.id} className="bg-white rounded-2xl p-5 shadow-sm border-none ring-1 ring-gray-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <Avatar className="w-10 h-10 bg-gray-200">
                                        <AvatarFallback className="bg-gray-200 text-gray-400">
                                            <User className="w-6 h-6" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900">{review.nickname}</span>
                                            <span className="text-xs text-gray-400">{review.date}</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 mt-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-3.5 h-3.5 ${star <= review.rating
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-gray-200'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                                    {review.content}
                                </p>
                            </Card>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
}
