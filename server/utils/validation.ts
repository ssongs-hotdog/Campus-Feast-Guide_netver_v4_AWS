import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// --- Schemas ---

export const DateParamSchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
        .optional(),
});

export const TimeParamSchema = z.object({
    time: z
        .string()
        .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)|(\d{2}:\d{2})$/, "Invalid time format. Expected HH:MM or ISO timestamp")
        .optional(),
});

export const DateTimeQuerySchema = DateParamSchema.merge(TimeParamSchema);

// --- Middleware ---

type ValidationTarget = "query" | "body" | "params";

export function validate(schema: z.ZodSchema, target: ValidationTarget = "query") {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[target];
            schema.parse(data);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: "VALIDATION_ERROR",
                    message: "Invalid request parameters",
                    details: error.errors.map((e) => ({
                        path: e.path.join("."),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}
