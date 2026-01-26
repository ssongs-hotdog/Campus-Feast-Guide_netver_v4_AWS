import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const S3_BUCKET = process.env.S3_BUCKET || "hyeat-menu";
const MENU_SOURCE = process.env.MENU_SOURCE || "disabled";

const S3_TIMEOUT_MS = 3000;

const MENU_CACHE_ENABLED = process.env.MENU_CACHE_ENABLED === "true";
const MENU_CACHE_TTL_SECONDS = parseInt(process.env.MENU_CACHE_TTL_SECONDS || "60", 10);
const MENU_CACHE_MAX_ENTRIES = parseInt(process.env.MENU_CACHE_MAX_ENTRIES || "50", 10);

type ReasonCategory = "AccessDenied" | "NoSuchKey" | "JSONParseError" | "Timeout" | "EmptyBody" | "Disabled" | "Unknown";

interface CacheEntry {
  data: Record<string, unknown>;
  expiresAt: number;
  insertedAt: number;
}

const menuCache = new Map<string, CacheEntry>();

function getCachedMenu(dateKey: string): Record<string, unknown> | null {
  if (!MENU_CACHE_ENABLED) return null;
  
  const entry = menuCache.get(dateKey);
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.expiresAt) {
    menuCache.delete(dateKey);
    return null;
  }
  
  return entry.data;
}

function setCachedMenu(dateKey: string, data: Record<string, unknown>): void {
  if (!MENU_CACHE_ENABLED) return;
  
  const now = Date.now();
  
  const entries = Array.from(menuCache.entries());
  for (const [key, entry] of entries) {
    if (now > entry.expiresAt) {
      menuCache.delete(key);
    }
  }
  
  if (menuCache.size >= MENU_CACHE_MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    const currentEntries = Array.from(menuCache.entries());
    for (const [key, entry] of currentEntries) {
      if (entry.insertedAt < oldestTime) {
        oldestTime = entry.insertedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      menuCache.delete(oldestKey);
    }
  }
  
  menuCache.set(dateKey, {
    data,
    expiresAt: now + MENU_CACHE_TTL_SECONDS * 1000,
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

export function isS3MenuEnabled(): boolean {
  return MENU_SOURCE === "s3";
}

export interface S3MenuResult {
  success: boolean;
  data: Record<string, unknown> | null;
  error?: string;
  reasonCategory?: ReasonCategory;
  cached?: boolean;
}

function logMenu(
  dateKey: string,
  objectKey: string,
  status: "success" | "cache_hit" | "failure",
  opts?: { reasonCategory?: ReasonCategory; size?: number; errorCode?: string }
): void {
  const parts = [`[menu] date=${dateKey} key=${objectKey}`];
  
  if (status === "cache_hit") {
    parts.push(`source=cache status=success`);
  } else {
    parts.push(`source=s3 status=${status}`);
  }
  
  if (opts?.size !== undefined) {
    parts.push(`size=${opts.size}`);
  }
  if (opts?.reasonCategory) {
    parts.push(`reason=${opts.reasonCategory}`);
  }
  if (opts?.errorCode) {
    parts.push(`errorCode=${opts.errorCode}`);
  }
  
  console.log(parts.join(" "));
}

export async function getMenuFromS3(dateKey: string): Promise<S3MenuResult> {
  const objectKey = `menus/${dateKey}.json`;
  
  if (!isS3MenuEnabled()) {
    logMenu(dateKey, objectKey, "failure", { reasonCategory: "Disabled" });
    return {
      success: false,
      data: null,
      error: "S3 menu source is disabled (MENU_SOURCE != s3)",
      reasonCategory: "Disabled",
    };
  }

  const cachedData = getCachedMenu(dateKey);
  if (cachedData) {
    logMenu(dateKey, objectKey, "cache_hit");
    return {
      success: true,
      data: cachedData,
      cached: true,
    };
  }

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), S3_TIMEOUT_MS);

    try {
      const response = await client.send(command, {
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.Body) {
        logMenu(dateKey, objectKey, "failure", { reasonCategory: "EmptyBody" });
        return {
          success: false,
          data: null,
          error: "S3 object body is empty",
          reasonCategory: "EmptyBody",
        };
      }

      const bodyString = await response.Body.transformToString("utf-8");
      
      let menuData: Record<string, unknown>;
      try {
        menuData = JSON.parse(bodyString);
      } catch (parseError) {
        logMenu(dateKey, objectKey, "failure", { 
          reasonCategory: "JSONParseError",
          size: bodyString.length,
        });
        return {
          success: false,
          data: null,
          error: `JSON parse error: ${(parseError as Error).message}`,
          reasonCategory: "JSONParseError",
        };
      }

      logMenu(dateKey, objectKey, "success", { size: bodyString.length });
      
      setCachedMenu(dateKey, menuData);
      
      return {
        success: true,
        data: menuData,
        cached: false,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  } catch (error: unknown) {
    const errorName = (error as { name?: string })?.name || "UnknownError";
    const errorMessage = (error as Error)?.message || "Unknown error";
    const httpStatusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;

    if (errorName === "NoSuchKey" || httpStatusCode === 404) {
      logMenu(dateKey, objectKey, "failure", { 
        reasonCategory: "NoSuchKey",
        errorCode: "404",
      });
      return {
        success: false,
        data: null,
        error: `S3 object not found: ${objectKey}`,
        reasonCategory: "NoSuchKey",
      };
    }

    if (httpStatusCode === 403 || errorName === "AccessDenied") {
      logMenu(dateKey, objectKey, "failure", { 
        reasonCategory: "AccessDenied",
        errorCode: "403",
      });
      return {
        success: false,
        data: null,
        error: "Access denied to S3 object",
        reasonCategory: "AccessDenied",
      };
    }

    if (errorName === "AbortError" || errorMessage.includes("aborted")) {
      logMenu(dateKey, objectKey, "failure", { 
        reasonCategory: "Timeout",
      });
      return {
        success: false,
        data: null,
        error: `S3 request timed out after ${S3_TIMEOUT_MS}ms`,
        reasonCategory: "Timeout",
      };
    }

    logMenu(dateKey, objectKey, "failure", { 
      reasonCategory: "Unknown",
      errorCode: errorName,
    });
    return {
      success: false,
      data: null,
      error: `S3 error: ${errorName}`,
      reasonCategory: "Unknown",
    };
  }
}

export function clearMenuCache(): void {
  menuCache.clear();
}

export function getMenuCacheStats(): { enabled: boolean; size: number; ttlSeconds: number; maxEntries: number } {
  return {
    enabled: MENU_CACHE_ENABLED,
    size: menuCache.size,
    ttlSeconds: MENU_CACHE_TTL_SECONDS,
    maxEntries: MENU_CACHE_MAX_ENTRIES,
  };
}
