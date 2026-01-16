export interface WaitingData {
  timestamp: string;
  restaurantId: string;
  cornerId: string;
  queue_len: number;
  est_wait_time_min: number;
}

export interface MenuItem {
  restaurantId: string;
  cornerId: string;
  cornerDisplayName: string;
  mainMenuName: string;
  priceWon: number;
  items: string[];
}

export interface MenuData {
  [restaurantId: string]: {
    [cornerId: string]: MenuItem;
  };
}

export interface RestaurantInfo {
  id: string;
  name: string;
  location: string;
  hours: string;
  cornerOrder: string[];
}

export type TicketStatus = 'stored' | 'active' | 'used' | 'expired';

export interface Ticket {
  id: string;
  restaurantId: string;
  cornerId: string;
  menuName: string;
  priceWon: number;
  status: TicketStatus;
  createdAt: number;
  activatedAt?: number;
  expiresAt?: number;
}

export type TimeMode = 'realtime' | 'sim';

export interface TimeState {
  mode: TimeMode;
  displayTime: Date;
  isPlaying: boolean;
  isDemoSpeed: boolean;
}

export type CongestionLevel = 1 | 2 | 3 | 4 | 5;

export const CONGESTION_LABELS: Record<CongestionLevel, string> = {
  1: '매우여유',
  2: '여유',
  3: '보통',
  4: '혼잡',
  5: '매우혼잡',
};

export const CONGESTION_COLORS: Record<CongestionLevel, string> = {
  1: '#10B981',
  2: '#84CC16',
  3: '#EAB308',
  4: '#F97316',
  5: '#EF4444',
};

export function getCongestionLevel(estWaitTime: number): CongestionLevel {
  if (estWaitTime <= 2) return 1;  // 1-2 min → 매우 여유
  if (estWaitTime <= 5) return 2;  // 3-5 min → 여유
  if (estWaitTime <= 9) return 3;  // 6-9 min → 보통
  if (estWaitTime <= 12) return 4; // 10-12 min → 혼잡
  return 5;                        // 13+ min → 매우 혼잡
}

export function formatPrice(won: number): string {
  return won.toLocaleString('ko-KR') + '원';
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatDateWithLabel(dateStr: string, todayStr: string): string {
  const date = new Date(dateStr + 'T12:00:00+09:00');
  const baseDate = date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  
  if (dateStr === todayStr) {
    return `${baseDate} (오늘)`;
  } else if (dateStr < todayStr) {
    return `${baseDate} (전날)`;
  } else {
    return `${baseDate} (다음날)`;
  }
}

export const RESTAURANTS: RestaurantInfo[] = [
  {
    id: 'hanyang_plaza',
    name: '한양플라자(학생식당)',
    location: '학생복지관(한양플라자) 3층',
    hours: `평일(방학 중 12/23~2/27)
천원의 아침밥 08:20~10:20
중식 11:00~14:30
Break Time 14:30~16:00
석식 16:00~18:00
라면 12:00~18:00
Break Time 14:30~15:30
홀 운영 08:00~22:00
토요일: 중식 10:00~14:00 / 라면 10:00~18:00
일요일/공휴일 운영 없음
문의 02-2220-1883`,
    cornerOrder: ['western', 'korean', 'instant', 'ramen'],
  },
  {
    id: 'materials',
    name: '신소재공학관',
    location: '신소재공학관 7층',
    hours: `평일: 중식 11:30~13:30 / 석식 17:00~18:30
토요일: 중식 11:30~13:30
일요일/공휴일 운영 없음
문의 070-4773-4161`,
    cornerOrder: ['set_meal', 'single_dish'],
  },
  {
    id: 'life_science',
    name: '생활과학관',
    location: '생활과학관 7층',
    hours: `평일: 중식 11:30~14:00 / 석식 17:00~18:30
토요일: 중식 11:30~13:30
일요일/공휴일 운영 없음
문의 02-2298-8797`,
    cornerOrder: ['dam_a', 'pangeos'],
  },
];
