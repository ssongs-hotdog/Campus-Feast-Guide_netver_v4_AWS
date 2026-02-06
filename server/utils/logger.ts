import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // JSON format for structured logging
    ),
    defaultMeta: { service: 'hy-eat-api' },
    transports: [
        new winston.transports.Console({
            format: isProduction
                ? undefined  // Use default JSON in prod
                : winston.format.combine(
                    winston.format.colorize(), // Colorize for dev
                    winston.format.simple()    // Simple text for dev
                ),
        }),
    ],
});

// Helper for consistency
export const log = (message: string, context?: Record<string, any>) => {
    logger.info(message, context);
};

export const logError = (message: string, error?: any, context?: Record<string, any>) => {
    logger.error(message, {
        ...context,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
    });
};
