// Canonical Data for HY-eat (Static & Deterministic)
// Based on User Request 2026-02-16

export interface RestaurantConstant {
    id: string;
    name: string;
}

export interface CornerConstant {
    id: string;
    restaurantId: string;
    name: string;
}

export const RESTAURANTS: RestaurantConstant[] = [
    { id: "hanyang_plaza", name: "한양플라자(학생식당)" },
    { id: "materials", name: "신소재공학관" },
    { id: "life_science", name: "생활과학관" },
];

export const CORNERS: CornerConstant[] = [
    // 3.1 한양플라자 (hanyang_plaza)
    { id: "breakfast_1000", restaurantId: "hanyang_plaza", name: "천원의 아침밥" },
    { id: "western", restaurantId: "hanyang_plaza", name: "양식" },
    { id: "korean", restaurantId: "hanyang_plaza", name: "한식" },
    { id: "instant", restaurantId: "hanyang_plaza", name: "즉석" },
    { id: "cupbap", restaurantId: "hanyang_plaza", name: "오늘의 컵밥" },
    { id: "ramen", restaurantId: "hanyang_plaza", name: "라면" },

    // 3.2 신소재공학관 (materials)
    { id: "set_meal", restaurantId: "materials", name: "정식" },
    { id: "single_dish", restaurantId: "materials", name: "일품" },
    { id: "rice_bowl", restaurantId: "materials", name: "덮밥" }, // 비정기
    { id: "dinner", restaurantId: "materials", name: "석식" },

    // 3.3 생활과학관 (life_science)
    { id: "dam_a_lunch", restaurantId: "life_science", name: "중식 Dam-A" },
    { id: "pangeos_lunch", restaurantId: "life_science", name: "중식 Pangeos" },
    { id: "dam_a_dinner", restaurantId: "life_science", name: "석식 Dam-A" },
];
