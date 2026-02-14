import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { RESTAURANTS } from "../shared/types";
import "dotenv/config";

// ==========================================
// [설정] 원하는 날짜 범위를 수정하세요
// ==========================================
const START_DATE = "2026-01-01";
const END_DATE = "2026-01-31";
// ==========================================

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const S3_BUCKET = process.env.S3_BUCKET_WAITING || "hyeat-menu-dev";

// 식당별/코너별 운영 시간 정의 (분 단위: HH * 60 + MM)
// 기반 데이터: shared/types.ts의 hours 텍스트
interface TimeRange {
    start: number;
    end: number;
}

// 코너별 정확한 운영 시간 매핑
const CORNER_HOURS: Record<string, Record<string, TimeRange[]>> = {
    // 1. 한양플라자 (학생복지관)
    // 천원의 아침밥: 08:20~10:20 (500~620)
    // 중식: 11:00~14:30 (660~870)
    // 석식: 16:00~18:00 (960~1080)
    // 라면: 12:00~18:00 (Break 14:30~15:30) -> 12:00~14:30 (720~870), 15:30~18:00 (930~1080)
    'hanyang_plaza': {
        'breakfast_1000': [{ start: 500, end: 620 }],
        'western': [{ start: 660, end: 870 }, { start: 960, end: 1080 }], // 중식/석식
        'korean': [{ start: 660, end: 870 }, { start: 960, end: 1080 }],  // 중식/석식
        'instant': [{ start: 660, end: 870 }, { start: 960, end: 1080 }], // 중식/석식 (가정)
        'cupbap': [{ start: 660, end: 870 }, { start: 960, end: 1080 }],  // 중식/석식 (가정)
        'ramen': [{ start: 720, end: 870 }, { start: 930, end: 1080 }]    // 라면 전용 시간 (브레이크 타임 반영)
    },

    // 2. 신소재공학관
    // 중식: 11:30~13:30 (690~810)
    // 석식: 17:00~18:30 (1020~1110)
    'materials': {
        'set_meal': [{ start: 690, end: 810 }],     // 중식
        'single_dish': [{ start: 690, end: 810 }],  // 중식
        'rice_bowl': [{ start: 690, end: 810 }],    // 중식
        'dinner': [{ start: 1020, end: 1110 }]      // 석식
    },

    // 3. 생활과학관
    // 중식: 11:30~14:00 (690~840)
    // 석식: 17:00~18:30 (1020~1110)
    'life_science': {
        'dam_a_lunch': [{ start: 690, end: 840 }],   // 중식
        'pangeos_lunch': [{ start: 690, end: 840 }], // 중식
        'dam_a_dinner': [{ start: 1020, end: 1110 }] // 석식
    }
};

// Helper: 날짜 더하기
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Helper: KST 날짜 포맷 (YYYY-MM-DD)
function formatDateKey(date: Date): string {
    const offset = 9 * 60 * 60 * 1000; // +09:00
    const kstDate = new Date(date.getTime() + offset);
    return kstDate.toISOString().split("T")[0];
}

// Helper: 랜덤 정수 생성 (min ~ max)
function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: 코너별 운영 시간 확인
function isCornerOperating(restaurantId: string, cornerId: string, currentMinutes: number): boolean {
    const restaurantHours = CORNER_HOURS[restaurantId];
    if (!restaurantHours) return false;

    const ranges = restaurantHours[cornerId];
    if (!ranges) return false;

    return ranges.some(range => currentMinutes >= range.start && currentMinutes <= range.end);
}

// 메인 실행 함수
async function main() {
    const client = new S3Client({ region: AWS_REGION });

    const start = new Date(START_DATE);
    const end = new Date(END_DATE);

    console.log(`[Start] Generating dummy data from ${START_DATE} to ${END_DATE}...`);
    console.log(`[Target Bucket] ${S3_BUCKET}`);

    let currentDate = start;

    while (currentDate <= end) {
        const dateKey = formatDateKey(currentDate);
        const dailyData: any[] = [];

        // 하루 전체 범위 스캔: 08:00 (480분) ~ 19:00 (1140분)
        for (let minutes = 480; minutes <= 1140; minutes += 10) {
            const hour = Math.floor(minutes / 60);
            const min = minutes % 60;
            const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
            const timestampIso = `${dateKey}T${timeStr}+09:00`;

            // 모든 식당 & 코너에 대해 데이터 생성
            for (const restaurant of RESTAURANTS) {
                for (const cornerId of restaurant.cornerOrder) {

                    // [Check] 해당 코너가 현재 시간에 운영 중인가?
                    if (!isCornerOperating(restaurant.id, cornerId, minutes)) {
                        continue;
                    }

                    // 피크타임 로직 (데이터가 생성되는 시간대 안에서만 적용)
                    let queueLen = 0;
                    let waitTime = 0;

                    // 점심 피크 (11:30 ~ 13:00)
                    if (minutes >= 690 && minutes <= 780) {
                        queueLen = getRandomInt(15, 60);
                        waitTime = Math.round(queueLen * 0.7);
                    }
                    // 저녁 피크 (17:30 ~ 18:30)
                    else if (minutes >= 1050 && minutes <= 1110) {
                        queueLen = getRandomInt(10, 40);
                        waitTime = Math.round(queueLen * 0.7);
                    }
                    // 아침 피크 (08:30 ~ 09:30) - 천원의 아침밥 등
                    else if (minutes >= 510 && minutes <= 570) {
                        queueLen = getRandomInt(20, 80); // 아침밥은 줄이 길 수 있음
                        waitTime = Math.round(queueLen * 0.5); // 회전율 빠름
                    }
                    // 그 외 (한산함)
                    else {
                        queueLen = getRandomInt(0, 8);
                        waitTime = getRandomInt(0, 4);
                    }

                    dailyData.push({
                        pk: `CORNER#${restaurant.id}#${cornerId}`,
                        sk: String(new Date(timestampIso).getTime()),
                        restaurantId: restaurant.id,
                        cornerId: cornerId,
                        queueLen: queueLen,
                        estWaitTimeMin: waitTime,
                        dataType: "dummy",
                        source: "script",
                        timestampIso: timestampIso,
                        createdAtIso: new Date().toISOString(),
                        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
                    });
                }
            }
        }

        if (dailyData.length > 0) {
            try {
                const command = new PutObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: `waiting-data/${dateKey}.json`,
                    Body: JSON.stringify(dailyData),
                    ContentType: "application/json"
                });

                await client.send(command);
                console.log(`[Uploaded] ${dateKey}.json (${dailyData.length} items)`);
            } catch (error) {
                console.error(`[Error] Failed to upload ${dateKey}:`, error);
            }
        } else {
            console.log(`[Skip] No data for ${dateKey} (Holiday or empty)`);
        }

        // 다음 날짜로 이동
        currentDate = addDays(currentDate, 1);
    }

    console.log("[Done] All dummy data generated and uploaded.");
}

main();
