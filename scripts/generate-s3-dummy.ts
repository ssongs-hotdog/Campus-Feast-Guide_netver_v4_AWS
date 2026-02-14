import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { RESTAURANTS } from "../shared/types";
import "dotenv/config";

// ==========================================
// [Config] 날짜 범위 및 설정
// ==========================================
const START_DATE = "2026-01-01";
const END_DATE = "2026-01-31";
const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const S3_BUCKET = process.env.S3_BUCKET_WAITING || "hyeat-menu-dev";

// [Config] 2026년 주요 휴무일 (양력 기준)
const HOLIDAYS_2026 = new Set([
    "2026-01-01", // 신정
    "2026-02-17", "2026-02-18", "2026-02-19", // 설날 연휴
    "2026-03-01", // 삼일절
    "2026-05-05", // 어린이날
    "2026-05-24", // 석가탄신일 (대체공휴일 체크 필요)
    "2026-06-06", // 현충일
    "2026-08-15", // 광복절
    "2026-09-24", "2026-09-25", "2026-09-26", // 추석 연휴
    "2026-10-03", // 개천절
    "2026-10-09", // 한글날
    "2026-12-25", // 성탄절
]);

// [Config] 코너별 운영 시간 및 인기 가중치 설정
// weight: 0.0 ~ 1.0 (높을수록 인기 많음)
interface CornerConfig {
    weekday: { start: number; end: number }[]; // 평일 운영 시간
    saturday: { start: number; end: number }[]; // 토요일 운영 시간
    weight: number; // 기본 인기 가중치
}

const CORNER_CONFIGS: Record<string, Record<string, CornerConfig>> = {
    'hanyang_plaza': {
        'breakfast_1000': {
            weekday: [{ start: 500, end: 620 }],
            saturday: [], weight: 0.95
        },
        'western': {
            weekday: [{ start: 660, end: 870 }, { start: 960, end: 1080 }],
            saturday: [{ start: 600, end: 840 }], weight: 0.6
        },
        'korean': {
            weekday: [{ start: 660, end: 870 }, { start: 960, end: 1080 }],
            saturday: [{ start: 600, end: 840 }], weight: 0.7
        },
        'instant': {
            weekday: [{ start: 660, end: 870 }, { start: 960, end: 1080 }],
            saturday: [{ start: 600, end: 840 }], weight: 0.9
        },
        'cupbap': {
            weekday: [{ start: 660, end: 870 }, { start: 960, end: 1080 }],
            saturday: [{ start: 600, end: 840 }], weight: 0.5
        },
        'ramen': {
            weekday: [{ start: 720, end: 870 }, { start: 930, end: 1080 }],
            saturday: [{ start: 600, end: 1080 }], weight: 0.9
        }
    },
    'materials': {
        'set_meal': {
            weekday: [{ start: 690, end: 810 }],
            saturday: [{ start: 690, end: 810 }], weight: 0.6
        },
        'single_dish': {
            weekday: [{ start: 690, end: 810 }],
            saturday: [{ start: 690, end: 810 }], weight: 0.8
        },
        'rice_bowl': {
            weekday: [{ start: 690, end: 810 }],
            saturday: [{ start: 690, end: 810 }], weight: 0.6
        },
        'dinner': {
            weekday: [{ start: 1020, end: 1110 }],
            saturday: [], weight: 0.7
        }
    },
    'life_science': {
        'dam_a_lunch': {
            weekday: [{ start: 690, end: 840 }],
            saturday: [{ start: 690, end: 810 }], weight: 0.7
        },
        'pangeos_lunch': {
            weekday: [{ start: 690, end: 840 }],
            saturday: [{ start: 690, end: 810 }], weight: 0.9
        },
        'dam_a_dinner': {
            weekday: [{ start: 1020, end: 1110 }],
            saturday: [], weight: 0.5
        }
    }
};

// ==========================================
// [Stats] 통계 집계용 클래스
// ==========================================
class VerificationStats {
    private stats: Record<string, { count: number; sumWait: number; maxWait: number; zeros: number }> = {};

    track(cornerKey: string, waitTime: number) {
        if (!this.stats[cornerKey]) {
            this.stats[cornerKey] = { count: 0, sumWait: 0, maxWait: 0, zeros: 0 };
        }
        const s = this.stats[cornerKey];
        s.count++;
        s.sumWait += waitTime;
        s.maxWait = Math.max(s.maxWait, waitTime);
        if (waitTime === 0) s.zeros++;
    }

    printReport() {
        console.log("\n================ [Verification Report] ================");
        console.log("| Corner ID | Count | Avg Wait | Max Wait | Zero Wait % |");
        console.log("|---|---|---|---|---|");

        // Sort by Avg Wait Descending for better visibility of popular corners
        const sortedKeys = Object.keys(this.stats).sort((a, b) => {
            const avgA = this.stats[a].sumWait / this.stats[a].count;
            const avgB = this.stats[b].sumWait / this.stats[b].count;
            return avgB - avgA;
        });

        for (const key of sortedKeys) {
            const s = this.stats[key];
            const avg = (s.sumWait / s.count).toFixed(1);
            const zeroPct = ((s.zeros / s.count) * 100).toFixed(1);
            console.log(`| ${key.padEnd(20)} | ${String(s.count).padEnd(5)} | ${avg.padEnd(8)} | ${String(s.maxWait).padEnd(8)} | ${zeroPct}% |`);
        }
        console.log("=======================================================\n");
    }
}

// ==========================================
// [Helpers] 유틸리티 함수
// ==========================================
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDateKey(date: Date): string {
    const offset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(date.getTime() + offset);
    return kstDate.toISOString().split("T")[0];
}

// 정규분포 유사 랜덤 (Box-Muller)
function randomNormal(mean: number, stdDev: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
}

function isHoliday(dateKey: string, date: Date): boolean {
    // 1. 공휴일 리스트 체크
    if (HOLIDAYS_2026.has(dateKey)) return true;

    // 2. 일요일 체크 (0: 일요일, 6: 토요일)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return true; // 일요일 휴무

    return false;
}

function getCornerHours(restaurantId: string, cornerId: string, isSaturday: boolean) {
    const config = CORNER_CONFIGS[restaurantId]?.[cornerId];
    if (!config) return null;
    return isSaturday ? config.saturday : config.weekday;
}

function getBaseWeight(restaurantId: string, cornerId: string): number {
    return CORNER_CONFIGS[restaurantId]?.[cornerId]?.weight || 0.5;
}

// ==========================================
// [Main] 실행 로직
// ==========================================
async function main() {
    const client = new S3Client({ region: AWS_REGION });
    const start = new Date(START_DATE);
    const end = new Date(END_DATE);
    const stats = new VerificationStats();

    console.log(`[Start] Generating ADVANCED dummy data from ${START_DATE} to ${END_DATE}...`);

    let currentDate = start;

    while (currentDate <= end) {
        const dateKey = formatDateKey(currentDate);
        const dayOfWeek = currentDate.getDay();
        const isSaturday = dayOfWeek === 6;

        // A. 휴무일 체크
        if (isHoliday(dateKey, currentDate)) {
            console.log(`[Skip] ${dateKey} is Holiday/Sunday.`);
            currentDate = addDays(currentDate, 1);
            continue;
        }

        // B. Daily Condition (0.8 ~ 1.2) - 그날의 수요 변동
        const dailyCondition = 0.8 + Math.random() * 0.4;

        const dailyData: any[] = [];

        // 08:00 ~ 19:00 (10분 간격)
        for (let minutes = 480; minutes <= 1140; minutes += 10) {
            const hour = Math.floor(minutes / 60);
            const min = minutes % 60;
            const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
            const timestampIso = `${dateKey}T${timeStr}+09:00`;

            // Time Profile (시간대별 가중치)
            let timeMultiplier = 0.5; // 기본: 한산함

            // 아침 (08:30~09:30)
            if (minutes >= 510 && minutes <= 570) timeMultiplier = 0.9;
            // 점심 피크 (11:30~13:00)
            else if (minutes >= 690 && minutes <= 780) timeMultiplier = 1.2;
            // 점심 늦게 (13:10~14:00)
            else if (minutes > 780 && minutes <= 840) timeMultiplier = 0.8;
            // 저녁 피크 (17:30~18:30)
            else if (minutes >= 1050 && minutes <= 1110) timeMultiplier = 0.9; // 저녁은 점심보다 약함

            for (const restaurant of RESTAURANTS) {
                for (const cornerId of restaurant.cornerOrder) {

                    // 운영 시간 체크
                    const hours = getCornerHours(restaurant.id, cornerId, isSaturday);
                    if (!hours || !hours.some(r => minutes >= r.start && minutes <= r.end)) {
                        continue;
                    }

                    // C. 대기열 계산 (확률 모델 적용)
                    const baseWeight = getBaseWeight(restaurant.id, cornerId);

                    // 평균(Mean) 대기열 = 기본 인기 * 시간대 가중치 * 일별 컨디션 * 스케일(25명 기준)
                    let meanQueue = baseWeight * timeMultiplier * dailyCondition * 25;

                    // 아침 메뉴 예외 처리 (천원의 아침밥은 매우 붐빔)
                    if (cornerId === 'breakfast_1000' && minutes <= 600) {
                        meanQueue *= 1.5;
                    }

                    // 랜덤 노이즈 추가 (정규분포)
                    // stdDev를 mean의 30%로 설정하여 변동성 부여
                    let queueLen = Math.floor(randomNormal(meanQueue, meanQueue * 0.3));

                    // Min/Max Clamping
                    queueLen = Math.max(0, queueLen);
                    // 최대 상한선 (인기 코너도 35명 넘기 힘들게, 붐비면 50명까지도 가능은 하게)
                    // 점심 피크 && 인기 코너면 상한을 좀 풀어줌
                    const limit = (baseWeight > 0.8 && timeMultiplier > 1.0) ? 60 : 40;
                    queueLen = Math.min(limit, queueLen);

                    // 예상 대기시간 계산 (회전율 고려)
                    // 기본 1명당 0.5분, 인기코너(빠른배식)는 0.4분 등...
                    // 여기선 단순화하여 큐 길이에 비례하되, 약간의 랜덤성 추가
                    const rotateSpeed = (cornerId === 'breakfast_1000' || cornerId === 'ramen') ? 0.4 : 0.6;
                    let waitTime = Math.round(queueLen * rotateSpeed);

                    // User Request: Max Wait Time < 20 min
                    if (waitTime > 19) waitTime = 19;

                    // 데이터 추가
                    dailyData.push({
                        pk: `CORNER#${restaurant.id}#${cornerId}`,
                        sk: String(new Date(timestampIso).getTime()),
                        restaurantId: restaurant.id,
                        cornerId: cornerId,
                        queueLen: queueLen,
                        estWaitTimeMin: waitTime,
                        dataType: "dummy-v2",
                        source: "script-adv",
                        timestampIso: timestampIso,
                        createdAtIso: new Date().toISOString(),
                        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
                    });

                    // 통계 기록
                    stats.track(`${cornerId}`, waitTime);
                }
            }
        } // end time loop

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
        }

        currentDate = addDays(currentDate, 1);
    } // end date loop

    console.log("[Done] All advanced dummy data generated.");
    stats.printReport();
}

main();
