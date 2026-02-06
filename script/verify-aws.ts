import fs from 'fs';
import path from 'path';

// 1. Load .env manually to ensure process.env is populated before imports
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
        // Ignore comments and empty lines
        if (!line || line.startsWith('#')) return;

        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            // Remove wrapping quotes if present
            const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
    console.log("✅ Loaded .env file successfully.");
} else {
    console.error("❌ .env file NOT FOUND. Please create it first.");
    process.exit(1);
}

// 2. Import repo functions (dynamically to use updated env env)
async function verify() {
    try {
        const { checkDdbConnection } = await import('../server/ddbWaitingRepo');
        // Using import path relative from script/ folder? 
        // script/verify-aws.ts -> ../server/s3MenuService
        // Using aliases might be safer if tsconfig handles it, but relative is robust here
        const { getMenuFromS3 } = await import('../server/s3MenuService');
        const { getKSTDateKey } = await import('../server/utils/date');

        console.log("\n========================================");
        console.log("AWS Connectivity Verification");
        console.log("========================================");
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`Region: ${process.env.AWS_REGION}`);

        // --- DynamoDB Check ---
        console.log(`\n[1/2] Checking DynamoDB (Table: ${process.env.DDB_TABLE_WAITING})...`);
        try {
            const ddbConnected = await checkDdbConnection();
            if (ddbConnected) {
                console.log("   ✅ SUCCESS: Connected to DynamoDB.");
            } else {
                console.error("   ❌ FAILURE: Could not connect to DynamoDB.");
                console.error("      Check your AWS Keys and Table Name.");
            }
        } catch (e) {
            console.error("   ❌ ERROR:", e);
        }

        // --- S3 Check ---
        console.log(`\n[2/2] Checking S3 (Bucket: ${process.env.S3_BUCKET})...`);
        try {
            const today = getKSTDateKey();
            const s3Result = await getMenuFromS3(today);

            if (s3Result.success) {
                console.log("   ✅ SUCCESS: S3 access verified (Data found).");
            } else {
                // Distinguish between Auth error vs Missing Data error
                if (s3Result.error?.includes("NoSuchKey") || s3Result.reasonCategory === "NoSuchKey") {
                    console.log("   ✅ SUCCESS: Connection successful (Bucket accessible).");
                    console.log("      (Note: No menu data found for today, which is expected for a fresh setup)");
                } else if (s3Result.error?.includes("AccessDenied") || s3Result.reasonCategory === "AccessDenied") {
                    console.error("   ❌ FAILURE: Access Denied.");
                    console.error("      Check your AWS Keys and Bucket permissions.");
                } else if (s3Result.reasonCategory === "Disabled") {
                    console.warn("   ⚠️ SKIPPED: S3 is disabled in .env (MENU_SOURCE!=s3)");
                } else {
                    console.log(`   ⚠️ WARNING: Connection likely OK, but returned error: [${s3Result.reasonCategory}] ${s3Result.error}`);
                }
            }
        } catch (e) {
            console.error("   ❌ ERROR:", e);
        }

        console.log("\n========================================");
        console.log("Verification Complete");

    } catch (err) {
        console.error("Fatal Error during verification:", err);
    }
}

verify();
