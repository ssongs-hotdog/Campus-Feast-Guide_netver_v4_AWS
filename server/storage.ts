import { type User, type InsertUser, waitingSnapshots } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql, desc, eq } from "drizzle-orm";

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

/**
 * Get the current date key in KST (Asia/Seoul) timezone.
 * Returns YYYY-MM-DD format.
 */
export function getKSTDateKey(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Get the current ISO timestamp in KST (Asia/Seoul) timezone.
 */
export function getKSTISOTimestamp(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+09:00`;
}

export interface LatestWaitingRow {
  timestamp: Date;
  restaurantId: string;
  cornerId: string;
  queueLen: number;
  dataType: string | null;
  source: string | null;
}

/**
 * Get the latest waiting snapshots for a specific date (in KST).
 * Finds the most recent timestamp for that date and returns all rows for that timestamp.
 */
export async function getLatestWaitingByDate(dateKey: string): Promise<{
  rows: LatestWaitingRow[];
  latestTimestamp: string | null;
}> {
  if (!db) {
    throw new Error("Database not configured");
  }

  // Find the latest timestamp for the given KST date
  const latestResult = await db.execute(sql`
    SELECT MAX(timestamp) as latest_ts
    FROM waiting_snapshots
    WHERE DATE(timestamp AT TIME ZONE 'Asia/Seoul') = ${dateKey}
  `);

  const latestTs = (latestResult.rows[0] as any)?.latest_ts;
  
  if (!latestTs) {
    return { rows: [], latestTimestamp: null };
  }

  // Fetch all rows for that exact timestamp
  const rows = await db.execute(sql`
    SELECT timestamp, restaurant_id, corner_id, queue_len, data_type, source
    FROM waiting_snapshots
    WHERE timestamp = ${latestTs}
    ORDER BY restaurant_id, corner_id
  `);

  const latestRows: LatestWaitingRow[] = (rows.rows as any[]).map(row => ({
    timestamp: row.timestamp,
    restaurantId: row.restaurant_id,
    cornerId: row.corner_id,
    queueLen: row.queue_len,
    dataType: row.data_type,
    source: row.source,
  }));

  // Format timestamp as ISO with +09:00 suffix
  const ts = new Date(latestTs);
  const isoWithKST = ts.toISOString().replace('Z', '+09:00').replace('.000', '');

  return { rows: latestRows, latestTimestamp: isoWithKST };
}

/**
 * Get the last ingestion timestamp (created_at) from the database.
 */
export async function getLastIngestionTime(): Promise<Date | null> {
  if (!db) {
    throw new Error("Database not configured");
  }

  const result = await db.execute(sql`
    SELECT MAX(created_at) as last_ingestion
    FROM waiting_snapshots
  `);

  const lastIngestion = (result.rows[0] as any)?.last_ingestion;
  return lastIngestion ? new Date(lastIngestion) : null;
}

/**
 * Check if the database is connected.
 */
export async function checkDbConnection(): Promise<boolean> {
  if (!db || !pool) return false;
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
