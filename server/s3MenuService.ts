import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const S3_BUCKET = process.env.S3_BUCKET || "hyeat-menu";
const MENU_SOURCE = process.env.MENU_SOURCE || "disabled";

const S3_TIMEOUT_MS = 3000;

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
}

export async function getMenuFromS3(dateKey: string): Promise<S3MenuResult> {
  if (!isS3MenuEnabled()) {
    return {
      success: false,
      data: null,
      error: "S3 menu source is disabled (MENU_SOURCE != s3)",
    };
  }

  const objectKey = `menus/${dateKey}.json`;

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
        console.log(`[S3Menu] EMPTY_BODY: bucket=${S3_BUCKET} key=${objectKey}`);
        return {
          success: false,
          data: null,
          error: "S3 object body is empty",
        };
      }

      const bodyString = await response.Body.transformToString("utf-8");
      const menuData = JSON.parse(bodyString);

      console.log(`[S3Menu] OK: bucket=${S3_BUCKET} key=${objectKey} size=${bodyString.length}`);
      
      return {
        success: true,
        data: menuData,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  } catch (error: unknown) {
    const errorName = (error as { name?: string })?.name || "UnknownError";
    const errorMessage = (error as Error)?.message || "Unknown error";

    if (errorName === "NoSuchKey") {
      console.log(`[S3Menu] NOT_FOUND: bucket=${S3_BUCKET} key=${objectKey}`);
      return {
        success: false,
        data: null,
        error: `S3 object not found: ${objectKey}`,
      };
    }

    if (errorName === "AbortError" || errorMessage.includes("aborted")) {
      console.log(`[S3Menu] TIMEOUT: bucket=${S3_BUCKET} key=${objectKey} timeout=${S3_TIMEOUT_MS}ms`);
      return {
        success: false,
        data: null,
        error: `S3 request timed out after ${S3_TIMEOUT_MS}ms`,
      };
    }

    console.error(`[S3Menu] ERROR: bucket=${S3_BUCKET} key=${objectKey} error=${errorName}: ${errorMessage}`);
    return {
      success: false,
      data: null,
      error: `S3 error: ${errorName}`,
    };
  }
}
