import { type User, type InsertUser, waitingSnapshots } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();

const dbUrl = process.env.DATABASE_URL;
const pool = dbUrl ? new Pool({ connectionString: dbUrl }) : null;
export const db = pool ? drizzle(pool) : null;

export interface UpsertWaitingRow {
  timestamp: Date;
  restaurantId: string;
  cornerId: string;
  queueLen: number;
  dataType?: string;
  source?: string;
}

export async function upsertWaitingSnapshots(rows: UpsertWaitingRow[]): Promise<number> {
  if (!db) {
    throw new Error("Database not configured");
  }

  if (rows.length === 0) return 0;

  let inserted = 0;
  for (const row of rows) {
    await db.insert(waitingSnapshots).values({
      timestamp: row.timestamp,
      restaurantId: row.restaurantId,
      cornerId: row.cornerId,
      queueLen: row.queueLen,
      dataType: row.dataType || "observed",
      source: row.source,
    }).onConflictDoUpdate({
      target: [waitingSnapshots.timestamp, waitingSnapshots.restaurantId, waitingSnapshots.cornerId],
      set: {
        queueLen: row.queueLen,
        dataType: row.dataType || "observed",
        source: row.source,
      },
    });
    inserted++;
  }

  return inserted;
}

export async function getWaitingSnapshotCount(): Promise<number> {
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(waitingSnapshots);
  return Number(result[0]?.count ?? 0);
}
