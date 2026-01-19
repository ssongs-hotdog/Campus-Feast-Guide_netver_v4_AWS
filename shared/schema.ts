import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const waitingSnapshots = pgTable("waiting_snapshots", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  restaurantId: varchar("restaurant_id", { length: 50 }).notNull(),
  cornerId: varchar("corner_id", { length: 50 }).notNull(),
  queueLen: integer("queue_len").notNull(),
  dataType: varchar("data_type", { length: 20 }).default("observed"),
  source: varchar("source", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueSnapshot: uniqueIndex("unique_snapshot").on(table.timestamp, table.restaurantId, table.cornerId),
  idxByTimestamp: index("idx_waiting_by_timestamp").on(table.timestamp),
  idxByCorner: index("idx_waiting_by_corner").on(table.restaurantId, table.cornerId, table.timestamp),
}));

export const insertWaitingSnapshotSchema = createInsertSchema(waitingSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertWaitingSnapshot = z.infer<typeof insertWaitingSnapshotSchema>;
export type WaitingSnapshot = typeof waitingSnapshots.$inferSelect;
