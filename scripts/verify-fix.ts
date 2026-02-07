
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// Load .env
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) config({ path: envPath });

const TARGET_DATE = "2026-02-06";
const TARGET_TIME = "12:00"; // Should match data around 12:01

async function verify() {
    console.log("=== Verifying API Fix ===");

    // Ensure server is running - user said it is on port 5000
    const url = `http://localhost:5000/api/waiting?date=${TARGET_DATE}&time=${TARGET_TIME}`;
    console.log(`Fetching: ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`API Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Body:", text);
            return;
        }

        const data = await res.json();
        console.log(`Response Status: ${res.status}`);
        console.log(`Response Type: ${Array.isArray(data) ? "Array" : typeof data}`);
        console.log(`Item Count: ${Array.isArray(data) ? data.length : "N/A"}`);

        if (Array.isArray(data) && data.length > 0) {
            const firstItem = data[0];
            console.log("First Item Sample:", JSON.stringify(firstItem, null, 2));

            // Verification Checks
            console.log("\n--- Verification Checks ---");

            // 1. camelCase Check
            if (firstItem.estWaitTimeMin !== undefined) {
                console.log("✅ camelCase 'estWaitTimeMin' present.");
            } else {
                console.error("❌ camelCase 'estWaitTimeMin' MISSING.");
            }

            if (firstItem.queueLen !== undefined) {
                console.log("✅ camelCase 'queueLen' present.");
            } else {
                console.error("❌ camelCase 'queueLen' MISSING.");
            }

            // 2. Snake Case Absence Check
            if (firstItem.est_wait_time_min === undefined) {
                console.log("✅ snake_case 'est_wait_time_min' removed/hidden.");
            } else {
                console.warn("⚠️ snake_case 'est_wait_time_min' still present (not critical but redundant).");
            }

            // 3. Time Bucket Check
            const ts = new Date(firstItem.timestamp);
            const h = ts.getHours();
            const m = ts.getMinutes();
            console.log(`Timestamp: ${firstItem.timestamp} -> ${h}:${m}`);

            if (h === 12 && m >= 0 && m < 5) {
                console.log("✅ Timestamp correctly falls within 12:00-12:05 bucket.");
            } else {
                console.error("❌ Timestamp OUTSIDE requested 12:00 bucket!");
            }

        } else {
            console.warn("⚠️ No data returned. Ensure local server has reloaded with changes and DDB has data.");
        }

    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

verify();
