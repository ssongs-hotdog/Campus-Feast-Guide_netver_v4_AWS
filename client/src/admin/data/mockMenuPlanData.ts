import { RESTAURANTS, CORNERS } from "./mock_canonical";

// Menu object per corner per date
export interface MenuCornerData {
    restaurantId: string;
    cornerId: string;
    cornerDisplayName: string;
    mainMenuName: string;
    priceWon: number;
    items: string[];
    variants?: Array<{ mainMenuName: string; items: string[] }>; // breakfast_1000 only
}

// Per-date menu storage: { "YYYY-MM-DD": { restaurantKey: { cornerKey: MenuCornerData } } }
export type MenuDataByDate = {
    [date: string]: {
        [restaurantKey: string]: {
            [cornerKey: string]: MenuCornerData;
        };
    };
};

// Price catalog entry (corner default)
export interface PriceCatalogEntry {
    restaurantId: string;
    cornerId: string;
    cornerDisplayName: string;
    priceWon: number;
}

// Helper: Get date string (YYYY-MM-DD)
export function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Helper: Get week dates (Mon-Sat)
export function getWeekDates(weekStart: Date): string[] {
    const dates: string[] = [];
    const start = new Date(weekStart);
    // Adjust to Monday
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Sunday = 0, adjust to Monday
    start.setDate(start.getDate() + diff);

    for (let i = 0; i < 6; i++) {  // Changed from 5 to 6 to include Saturday
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(getDateString(d));
    }
    return dates;
}

// Mock data: 1 week of menus
const today = new Date();
const thisWeekStart = new Date(today);
thisWeekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));

export const MOCK_MENU_BY_DATE: MenuDataByDate = {};

// Generate menus for this week (Mon-Fri)
getWeekDates(thisWeekStart).forEach((date, idx) => {
    MOCK_MENU_BY_DATE[date] = {
        hanyang_plaza: {
            instant: {
                restaurantId: "hanyang_plaza",
                cornerId: "instant",
                cornerDisplayName: "즉석조리",
                mainMenuName: idx === 0 ? "제육볶음" : idx === 1 ? "닭갈비" : idx === 2 ? "김치찌개" : idx === 3 ? "돈까스" : "불고기",
                priceWon: 5000,
                items: ["메인", "밥", "김치", "국"]
            },
            cupbap: {
                restaurantId: "hanyang_plaza",
                cornerId: "cupbap",
                cornerDisplayName: "컵밥",
                mainMenuName: "불고기 컵밥",
                priceWon: 4000,
                items: ["불고기", "밥", "김", "단무지"]
            },
            breakfast_1000: {
                restaurantId: "hanyang_plaza",
                cornerId: "breakfast_1000",
                cornerDisplayName: "천원의 아침밥",
                mainMenuName: "계란후라이 정식",
                priceWon: 1000,
                items: ["밥", "계란후라이", "김", "된장국"],
                variants: [
                    { mainMenuName: "햄 정식", items: ["밥", "햄", "김", "된장국"] },
                    { mainMenuName: "소시지 정식", items: ["밥", "소시지", "김", "된장국"] }
                ]
            }
        },
        life_science: {
            dam_a_lunch: {
                restaurantId: "life_science",
                cornerId: "dam_a_lunch",
                cornerDisplayName: "Dam-A 중식",
                mainMenuName: idx === 0 ? "김치찌개" : idx === 1 ? "된장찌개" : idx === 2 ? "비빔밥" : idx === 3 ? "카레" : "덮밥",
                priceWon: 5500,
                items: ["메인", "밥", "계란찜", "김치", "단무지"]
            },
            dam_a_dinner: {
                restaurantId: "life_science",
                cornerId: "dam_a_dinner",
                cornerDisplayName: "Dam-A 석식",
                mainMenuName: "된장찌개",
                priceWon: 5500,
                items: idx === 4 ? [] : ["된장찌개", "밥", "김치"] // Friday: empty items for warning
            }
        },
        materials: {
            instant: {
                restaurantId: "materials",
                cornerId: "instant",
                cornerDisplayName: "즉석조리",
                mainMenuName: "돈까스",
                priceWon: 6000,
                items: ["돈까스", "밥", "샐러드", "우동국물"]
            }
        }
    };
});

// Price catalog
export const INITIAL_PRICE_CATALOG: PriceCatalogEntry[] = [
    { restaurantId: "hanyang_plaza", cornerId: "instant", cornerDisplayName: "즉석조리", priceWon: 5000 },
    { restaurantId: "hanyang_plaza", cornerId: "cupbap", cornerDisplayName: "컵밥", priceWon: 4000 },
    { restaurantId: "hanyang_plaza", cornerId: "breakfast_1000", cornerDisplayName: "천원의 아침밥", priceWon: 1000 },
    { restaurantId: "life_science", cornerId: "dam_a_lunch", cornerDisplayName: "Dam-A 중식", priceWon: 5500 },
    { restaurantId: "life_science", cornerId: "dam_a_dinner", cornerDisplayName: "Dam-A 석식", priceWon: 5500 },
    { restaurantId: "materials", cornerId: "instant", cornerDisplayName: "즉석조리", priceWon: 6000 }
];

// Get corners for a specific date
export function getCornersForDate(date: string, restaurantId?: string): MenuCornerData[] {
    const dateData = MOCK_MENU_BY_DATE[date];
    if (!dateData) return [];

    const corners: MenuCornerData[] = [];
    Object.entries(dateData).forEach(([restId, restaurant]) => {
        if (restaurantId && restaurantId !== "all" && restId !== restaurantId) return;
        Object.values(restaurant).forEach(corner => corners.push(corner));
    });
    return corners;
}

// Get specific corner for date
export function getCornerForDate(date: string, restaurantId: string, cornerId: string): MenuCornerData | undefined {
    return MOCK_MENU_BY_DATE[date]?.[restaurantId]?.[cornerId];
}

// Validation
export interface ValidationIssue {
    id: string;
    date: string;
    restaurantId: string;
    cornerId: string;
    message: string;
    type: 'error' | 'warning';
}

export interface ValidationResult {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}

export function validateMenuData(data: MenuDataByDate, dates?: string[]): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const datesToValidate = dates || Object.keys(data);

    datesToValidate.forEach(date => {
        const dateData = data[date];
        if (!dateData) return;

        Object.entries(dateData).forEach(([restaurantKey, restaurant]) => {
            Object.entries(restaurant).forEach(([cornerKey, corner]) => {
                const id = `${date}_${corner.restaurantId}_${corner.cornerId}`;

                // Required fields
                if (!corner.mainMenuName) {
                    errors.push({ id, date, restaurantId: restaurantKey, cornerId: cornerKey, message: 'mainMenuName 필수', type: 'error' });
                }
                if (!corner.priceWon || corner.priceWon <= 0) {
                    errors.push({ id, date, restaurantId: restaurantKey, cornerId: cornerKey, message: 'priceWon 필수 (0보다 커야 함)', type: 'error' });
                }

                // Items validation
                if (!Array.isArray(corner.items)) {
                    errors.push({ id, date, restaurantId: restaurantKey, cornerId: cornerKey, message: 'items는 배열이어야 함', type: 'error' });
                } else if (corner.items.length === 0) {
                    warnings.push({ id, date, restaurantId: restaurantKey, cornerId: cornerKey, message: 'items 배열이 비어있음', type: 'warning' });
                }

                // Variants (breakfast_1000)
                if (corner.variants) {
                    corner.variants.forEach((v, idx) => {
                        if (!v.mainMenuName) {
                            errors.push({ id: `${id}_v${idx}`, date, restaurantId: restaurantKey, cornerId: cornerKey, message: `variant ${idx + 1}: mainMenuName 필수`, type: 'error' });
                        }
                        if (!Array.isArray(v.items)) {
                            errors.push({ id: `${id}_v${idx}`, date, restaurantId: restaurantKey, cornerId: cornerKey, message: `variant ${idx + 1}: items는 배열이어야 함`, type: 'error' });
                        }
                    });
                }
            });
        });
    });

    return { errors, warnings };
}
