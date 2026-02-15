import { performance } from "perf_hooks";

const API_BASE_URL = "http://127.0.0.1:5000";
const TARGET_DATE = "2026-01-15"; // Center date

function addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

async function fetchMenu(date: string) {
    const start = performance.now();
    try {
        const res = await fetch(`${API_BASE_URL}/api/menu?date=${date}`);
        const end = performance.now();
        const duration = end - start;
        console.log(`[${date}] Status: ${res.status}, Time: ${duration.toFixed(2)}ms`);
        return { date, status: res.status, duration };
    } catch (error) {
        const end = performance.now();
        console.error(`[${date}] Failed: ${error}`);
        return { date, status: 'ERROR', duration: end - start };
    }
}

async function runTest() {
    console.log(`Starting prefetch speed test for ${TARGET_DATE} +/- 5 days (Total 11 requests)...`);

    const dates: string[] = [];
    for (let i = -5; i <= 5; i++) {
        dates.push(addDays(TARGET_DATE, i));
    }

    const startTotal = performance.now();

    // Simulate Promise.all behavior
    const results = await Promise.all(dates.map(date => fetchMenu(date)));

    const endTotal = performance.now();
    const totalDuration = endTotal - startTotal;

    console.log("\n--------------------------------------------------");
    console.log(`Total Requests: ${results.length}`);
    console.log(`Total Duration: ${totalDuration.toFixed(2)}ms`); // This is the user-perceived splash time
    console.log("--------------------------------------------------");

    // Success check
    const successCount = results.filter(r => r.status === 200).length;
    console.log(`Successful (200 OK): ${successCount}/${results.length}`);
}

runTest();
