import "dotenv/config";
import serverless from "serverless-http";
import { createApp } from "./app";

let serverlessHandler: any;

export const handler = async (event: any, context: any) => {
    // [DEBUG] Log start of execution immediately
    console.log("[Lambda] HANDLER START", { path: event.path, httpMethod: event.httpMethod });

    try {
        if (!serverlessHandler) {
            console.log("[Lambda] Initializing App...");
            const app = await createApp();
            serverlessHandler = serverless(app);
            console.log("[Lambda] App Initialized");
        }

        const res = await serverlessHandler(event, context);

        // [DEBUG] Log successful completion
        console.log("[Lambda] HANDLER SUCCESS", { statusCode: res.statusCode });
        return res;
    } catch (error) {
        // [CRITICAL] Catch any initialization/runtime error
        console.error("[Lambda] CRITICAL ERROR CAUGHT:", error);

        // Force a JSON error response instead of generic 500
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "CRITICAL LAMBDA ERROR",
                error: (error as Error).message,
                stack: (error as Error).stack
            })
        };
    }
};
