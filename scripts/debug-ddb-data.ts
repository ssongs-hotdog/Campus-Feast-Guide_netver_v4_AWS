
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Load .env explicitly
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    console.log(`Loading .env from ${envPath}`);
    config({ path: envPath });
} else {
    console.error(`ERROR: .env file not found at ${envPath}`);
    process.exit(1);
}

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const DDB_TABLE_WAITING = process.env.DDB_TABLE_WAITING || "hyeat_YOLO_data";

async function debugData() {
    console.log("=== DynamoDB Data Debug ===");
    console.log(`Region: ${AWS_REGION}`);
    console.log(`Table: ${DDB_TABLE_WAITING}`);

    const client = new DynamoDBClient({ region: AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(client);

    const targetDate = "2026-02-06";
    // KST day boundaries (approx)
    // 2026-02-06 00:00:00 KST = 2026-02-05 15:00:00 UTC
    // 2026-02-06 23:59:59 KST = 2026-02-06 14:59:59 UTC

    // Actually, let's use the same logic as ddbWaitingRepo to get start/end ms
    const startKST = new Date(`${targetDate}T00:00:00+09:00`);
    const endKST = new Date(`${targetDate}T23:59:59.999+09:00`);
    const startMs = startKST.getTime();
    const endMs = endKST.getTime();

    console.log(`\nChecking data for date: ${targetDate}`);
    console.log(`Start Epoch Ms: ${startMs} (${startKST.toISOString()})`);
    console.log(`End Epoch Ms:   ${endMs} (${endKST.toISOString()})`);

    // We need to check a known corner's PK like CORNER#hanyang_plaza#korean
    // Let's pick a few common corners
    const cornersToCheck = [
        "CORNER#hanyang_plaza#korean",
        "CORNER#hanyang_plaza#western",
        "CORNER#hanyang_plaza#ramen" // Maybe easy to have data
    ];

    for (const pk of cornersToCheck) {
        console.log(`\nQuerying PK: ${pk}`);
        try {
            const result = await docClient.send(new QueryCommand({
                TableName: DDB_TABLE_WAITING,
                KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
                ExpressionAttributeValues: {
                    ":pk": pk,
                    ":start": String(startMs),
                    ":end": String(endMs)
                },
                Limit: 5 // Just peek at first 5
            }));

            if (result.Items && result.Items.length > 0) {
                console.log(`✅ Found ${result.Items.length} items (showing first 2):`);
                console.log(JSON.stringify(result.Items.slice(0, 2), null, 2));
            } else {
                console.log("❌ No items found in this time range.");

                // Try without SK range constraint to see if ANY data exists for this PK
                // console.log("  (Trying without time range...)");
                // const anyRes = await docClient.send(new QueryCommand({
                //     TableName: DDB_TABLE_WAITING,
                //     KeyConditionExpression: "pk = :pk",
                //     ExpressionAttributeValues: { ":pk": pk },
                //     Limit: 1
                // }));
                // if(anyRes.Items && anyRes.Items.length > 0) {
                //     console.log("  ⚠️  However, data DOES exist for this PK outside range. Sample SK: ", anyRes.Items[0].sk);
                // } else {
                //     console.log("  ❌ No data at all for this PK.");
                // }
            }
        } catch (err) {
            console.error("Query Error:", err);
        }
    }
}

debugData();
