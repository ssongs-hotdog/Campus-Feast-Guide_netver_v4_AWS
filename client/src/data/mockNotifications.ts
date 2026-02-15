export interface NotificationItem {
    id: string;
    type: 'notice' | 'personal';
    title: string;
    date: string;
    isRead: boolean;
    content?: string;
}

export const mockNotifications: NotificationItem[] = [
    // 공지사항 (Notices)
    {
        id: 'n1',
        type: 'notice',
        title: '[공지] 2월 업데이트 안내',
        date: '2026.02.14',
        isRead: false,
        content: '새로운 기능이 추가되었습니다.'
    },
    {
        id: 'n2',
        type: 'notice',
        title: '[점검] 서버 점검 예정 안내',
        date: '2026.02.13',
        isRead: true,
        content: '새벽 2시부터 4시까지 점검이 진행됩니다.'
    },
    {
        id: 'n3',
        type: 'notice',
        title: '[이벤트] 신학기 맞이 식권 할인',
        date: '2026.02.10',
        isRead: true,
        content: '학생식당 식권을 10% 할인된 가격에 만나보세요.'
    },
    {
        id: 'n4',
        type: 'notice',
        title: '[안내] 사랑방 운영 시간 변경',
        date: '2026.02.05',
        isRead: true
    },
    {
        id: 'n5',
        type: 'notice',
        title: '[공지] 설 연휴 운영 안내',
        date: '2026.01.28',
        isRead: true
    },

    // 개인 알림 (Personal)
    {
        id: 'p1',
        type: 'personal',
        title: '주문하신 식권이 발급되었습니다.',
        date: '2026.02.14 10:30',
        isRead: false,
        content: '식권함에서 확인해주세요.'
    },
    {
        id: 'p2',
        type: 'personal',
        title: '오늘의 추천 메뉴가 도착했습니다!',
        date: '2026.02.14 08:00',
        isRead: true
    },
    {
        id: 'p3',
        type: 'personal',
        title: '즐겨찾기한 식당이 오픈했습니다.',
        date: '2026.02.13 11:00',
        isRead: true
    },
    {
        id: 'p4',
        type: 'personal',
        title: '포인트 적립 안내',
        date: '2026.02.12 13:45',
        isRead: true
    },
    {
        id: 'p5',
        type: 'personal',
        title: '회원가입을 환영합니다!',
        date: '2026.02.01 09:00',
        isRead: true
    },
];
