import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { log } from "./utils/logger";

/**
 * Validate critical environment variables at startup
 * Fail fast if configuration is incorrect
 */
function validateEnvironment() {
  const waitingSource = process.env.WAITING_SOURCE;
  const ddbTable = process.env.DDB_TABLE_WAITING;

  // If DDB is enabled, table name must be provided
  if (waitingSource === 'ddb' && !ddbTable) {
    throw new Error(
      'FATAL: DDB_TABLE_WAITING must be set when WAITING_SOURCE=ddb'
    );
  }

  // Log non-fatal warnings
  if (!waitingSource) {
    console.warn('[WARN] WAITING_SOURCE not set, waiting data will be disabled');
  }
}

(async () => {
  // Validate environment before starting server
  validateEnvironment();

  const app = await createApp();
  const httpServer = createServer(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    // Only used to make "npm run start" work locally if needed
    // But for AWS production, this path is not used (lambda.ts is used)
    const { serveStatic } = await import("./static");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "127.0.0.1",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
