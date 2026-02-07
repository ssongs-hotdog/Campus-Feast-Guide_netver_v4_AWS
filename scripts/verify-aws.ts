
import { config } from "dotenv";
import fs from "fs";
import path from "path";

// 1. Load .env explicitly from current directory
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    console.log(`Loading .env from ${envPath}`);
    config({ path: envPath });
} else {
    console.error(`ERROR: .env file not found at ${envPath}`);
    process.exit(1);
}

// Now import service modules
import { getMenuFromS3 } from "../server/s3MenuService";
import { key } from "readline";

// Mock or bypass ddbWaitingRepo if needed, but let's try importing it
// We need to dynamically import to ensure env vars are set first if they are used at top-level
async function run() {
    console.log("=== AWS Connection Verification Start ===");

    // 1. Environment Check
    console.log("\n[1] Environment Variables Check:");
    const envVars = [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_REGION",
        "S3_BUCKET",
        "DDB_TABLE_WAITING",
        "MENU_SOURCE",
        "WAITING_SOURCE"
    ];

    for (const k of envVars) {
        const val = process.env[k];
        const status = val ? "OK (Set)" : "MISSING";
        let displayVal = "N/A";
        if (val) {
            if (k.includes("KEY")) {
                displayVal = `${val.substring(0, 4)}...`;
            } else {
                displayVal = val;
            }
        }
        console.log(`  - ${k}: ${status} [Value: ${displayVal}]`);
    }

    // 2. S3 Connectivity Check
    console.log("\n[2] S3 Connectivity Check:");
    // Dynamically import to pick up env vars
    const { getMenuFromS3 } = await import("../server/s3MenuService");
    const today = new Date().toISOString().split("T")[0];
    console.log(`  - Testing getMenuFromS3('${today}')...`);

    try {
        const s3Result = await getMenuFromS3(today);

        if (s3Result.success) {
            console.log("  ✅ S3 Connection SUCCESS: Data found and read.");
            console.log("  - Data snippet:", JSON.stringify(s3Result.data).substring(0, 100) + "...");
        } else {
            if (s3Result.reasonCategory === "NoSuchKey") {
                console.log("  ✅ S3 Connection SUCCESS: Bucket reachable, but file not found (Expected 404).");
                console.log(`  - Error: ${s3Result.error}`);
            } else if (s3Result.reasonCategory === "AccessDenied") {
                console.log("  ❌ S3 Connection FAILED: Access Denied (Check credentials/policies).");
                console.log(`  - Error: ${s3Result.error}`);
            } else {
                console.log(`  ⚠️ S3 Connection Warning: ${s3Result.error}`);
                console.log(`  - Reason: ${s3Result.reasonCategory}`);
            }
        }
    } catch (err) {
        console.error("  ❌ S3 Unexpected Error:", err);
    }

    // 3. DynamoDB Connectivity Check
    console.log("\n[3] DynamoDB Connectivity Check:");
    const { checkDdbConnection, getLatestByDate } = await import("../server/ddbWaitingRepo");
    console.log("  - Testing checkDdbConnection()...");

    try {
        const ddbHealth = await checkDdbConnection();

        if (ddbHealth) {
            console.log("  ✅ DynamoDB Connection SUCCESS: Table reachable.");

            console.log(`  - Testing getLatestByDate('${today}')...`);
            const ddbResult = await getLatestByDate(today);
            console.log(`  - Result: Found ${ddbResult.rows.length} rows.`);
        } else {
            console.log("  ❌ DynamoDB Connection FAILED.");
        }
    } catch (err) {
        console.error("  ❌ DynamoDB Unexpected Error:", err);
    }

    console.log("\n=== Verification Complete ===");
}

run().catch(err => console.error(err));
