import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { WaitingData } from "@shared/types";

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const S3_BUCKET = process.env.S3_BUCKET_WAITING || "hyeat-menu-dev";
const WAITING_SOURCE_S3 = process.env.WAITING_SOURCE_S3 || "enabled";

const S3_TIMEOUT_MS = 3000;

// Simple in-memory cache
const WAITING_CACHE_ENABLED = true;
const WAITING_CACHE_TTL_SECONDS = 60 * 5; // 5 minutes
const WAITING_CACHE_MAX_ENTRIES = 20;

interface CacheEntry {
    data: WaitingData[];
    expiresAt: number;
    insertedAt: number;
}

const waitingCache = new Map<string, CacheEntry>();

function getCachedWaiting(dateKey: string): WaitingData[] | null {
    if (!WAITING_CACHE_ENABLED) return null;

    const entry = waitingCache.get(dateKey);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
        waitingCache.delete(dateKey);
        return null;
    }

    return entry.data;
}

function setCachedWaiting(dateKey: string, data: WaitingData[]): void {
    if (!WAITING_CACHE_ENABLED) return;

    const now = Date.now();

    // LRU-like cleanup if full
    if (waitingCache.size >= WAITING_CACHE_MAX_ENTRIES) {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [key, entry] of waitingCache.entries()) {
            if (entry.insertedAt < oldestTime) {
                oldestTime = entry.insertedAt;
                oldestKey = key;
            }
        }
        if (oldestKey) waitingCache.delete(oldestKey);
    }

    waitingCache.set(dateKey, {
        data,
        expiresAt: now + WAITING_CACHE_TTL_SECONDS * 1000,
        insertedAt: now,
    });
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
    if (!s3Client) {
        s3Client = new S3Client({
            region: AWS_REGION,
        });
    }
    return s3Client;
}

export interface S3WaitingResult {
    success: boolean;
    data: WaitingData[] | null;
    error?: string;
    cached?: boolean;
}

export function isS3WaitingEnabled(): boolean {
    return WAITING_SOURCE_S3 === "enabled";
}

export function getS3WaitingCacheStats() {
    return {
        enabled: WAITING_CACHE_ENABLED,
        size: waitingCache.size,
        ttl: WAITING_CACHE_TTL_SECONDS,
    };
}

export async function getWaitingDataFromS3(dateKey: string): Promise<S3WaitingResult> {
    const objectKey = `waiting-data/${dateKey}.json`;

    // 1. Check Cache
    const cachedData = getCachedWaiting(dateKey);
    if (cachedData) {
        console.log(`[S3Waiting] Cache hit for ${dateKey}`);
        return { success: true, data: cachedData, cached: true };
    }

    if (!isS3WaitingEnabled()) {
        return { success: false, data: null, error: "S3 Waiting Source Disabled" };
    }

    try {
        const client = getS3Client();
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: objectKey,
        });

        // 2. S3 Request with Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), S3_TIMEOUT_MS);

        try {
            const response = await client.send(command, {
                abortSignal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.Body) {
                return { success: false, data: null, error: "Empty S3 body" };
            }

            const bodyString = await response.Body.transformToString("utf-8");

            let rawData: any[];
            try {
                rawData = JSON.parse(bodyString);
                if (!Array.isArray(rawData)) {
                    // If it's not an array, maybe it's a wrapper object? 
                    // But strict spec says array.
                    throw new Error("S3 data is not an array");
                }
            } catch (e) {
                return { success: false, data: null, error: "JSON parse error" };
            }

            // 3. Map to WaitingData interface
            const mappedData: WaitingData[] = rawData.map((item: any) => {
                return {
                    timestamp: item.timestampIso || item.timestamp, // Fallback if user uses different name
                    restaurantId: item.restaurantId,
                    cornerId: item.cornerId,
                    queueLen: Number(item.queueLen),
                    estWaitTimeMin: Number(item.estWaitTimeMin),
                };
            });

            setCachedWaiting(dateKey, mappedData);
            console.log(`[S3Waiting] Fetched ${mappedData.length} items from S3 for ${dateKey}`);

            return { success: true, data: mappedData, cached: false };

        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
                console.warn(`[S3Waiting] No data found for ${dateKey} (404)`);
                // Return empty array for missing data if we want to show "no data" chart
                // But for now let's return success:false to indicate explicit missing file
                return { success: false, data: null, error: "S3 object not found" };
            }
            throw err;
        }
    } catch (error: any) {
        console.error(`[S3Waiting] Error fetching ${dateKey}:`, error.message);
        return { success: false, data: null, error: error.message };
    }
}
