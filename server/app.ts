import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./utils/logger";

// Extend IncomingMessage to include rawBody
declare module "http" {
    interface IncomingMessage {
        rawBody: unknown;
    }
}

export async function createApp() {
    const app = express();

    app.use(
        express.json({
            verify: (req: any, _res, buf) => {
                req.rawBody = buf;
            },
        }),
    );

    app.use(express.urlencoded({ extended: false }));

    // Logging middleware
    app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse: Record<string, any> | undefined = undefined;

        const originalResJson = res.json;
        res.json = function (bodyJson, ...args) {
            capturedJsonResponse = bodyJson;
            return originalResJson.apply(res, [bodyJson, ...args]);
        };

        res.on("finish", () => {
            const duration = Date.now() - start;
            if (path.startsWith("/api")) {
                let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
                if (capturedJsonResponse) {
                    try {
                        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
                    } catch (e) {
                        // ignore circular reference or other json stringify errors
                    }
                }
                log(logLine);
            }
        });

        next();
    });

    await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        // [DEBUG] Return actual error message for debugging
        const message = err.message || "Internal Server Error";

        // If message is generic, try to capture the whole error object
        const fullError = {
            message,
            errorObject: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
            stack: err.stack
        };

        res.status(status).json(fullError);
        throw err;
    });

    return app;
}
