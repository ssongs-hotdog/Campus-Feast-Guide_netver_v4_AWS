
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) config({ path: envPath });

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const DDB_TABLE_WAITING = process.env.DDB_TABLE_WAITING || "hyeat_YOLO_data";

async function debugKeys() {
    const client = new DynamoDBClient({ region: AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(client);
    const targetDate = "2026-02-06";
    const startMs = new Date(`${targetDate}T00:00:00+09:00`).getTime();
    const endMs = new Date(`${targetDate}T23:59:59.999+09:00`).getTime();
    const pk = "CORNER#hanyang_plaza#korean";

    try {
        const result = await docClient.send(new QueryCommand({
            TableName: DDB_TABLE_WAITING,
            KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
            ExpressionAttributeValues: { ":pk": pk, ":start": String(startMs), ":end": String(endMs) },
            Limit: 1
        }));

        if (result.Items && result.Items.length > 0) {
            console.log("Found Item. Keys:");
            console.log(Object.keys(result.Items[0]));
            console.log("Sample Item:", JSON.stringify(result.Items[0]));
        } else {
            console.log("No items found.");
        }
    } catch (err) { console.error(err); }
}
debugKeys();
