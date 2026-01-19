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

  // Format timestamp as ISO with +09:00 suffix (properly converted to KST)
  const ts = new Date(latestTs);
  const kstFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const formatted = kstFormatter.format(ts).replace(' ', 'T') + '+09:00';
  const isoWithKST = formatted;

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

// ============================================================================
// Historical Data Queries (for dates >= BETA_CUTOVER_DATE)
// ============================================================================

/**
 * Beta cutover date: dates >= this use DB for historical queries.
 * Dates before this use file cache only.
 */
export const BETA_CUTOVER_DATE = '2026-01-20';

/**
 * Check if a date should use DB for historical queries.
 */
export function shouldUseDatabaseForDate(dateKey: string): boolean {
  return dateKey >= BETA_CUTOVER_DATE;
}

/**
 * Format a Date object to ISO string with KST timezone (+09:00).
 */
function formatToKSTISO(ts: Date): string {
  const kstFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return kstFormatter.format(ts).replace(' ', 'T') + '+09:00';
}

export interface HistoricalWaitingRow {
  timestamp: string;
  restaurantId: string;
  cornerId: string;
  queue_len: number;
  est_wait_time_min: number;
  data_type: string;
}

/**
 * Get distinct ISO timestamps for a date from DB (for /api/waiting/timestamps).
 * Returns ISO strings to maintain API compatibility with file-based timestamps.
 */
export async function getHistoricalTimestamps(dateKey: string): Promise<string[]> {
  if (!db) {
    throw new Error("Database not configured");
  }

  const result = await db.execute(sql`
    SELECT DISTINCT timestamp
    FROM waiting_snapshots
    WHERE DATE(timestamp AT TIME ZONE 'Asia/Seoul') = ${dateKey}
    ORDER BY timestamp
  `);

  return (result.rows as any[]).map(row => formatToKSTISO(new Date(row.timestamp)));
}

/**
 * Get all waiting data for a date from DB (for /api/waiting/all).
 * Returns data in the same shape as file-based data.
 */
export async function getHistoricalAllData(
  dateKey: string,
  computeWaitFn: (queueLen: number, restaurantId: string, cornerId: string) => number
): Promise<HistoricalWaitingRow[]> {
  if (!db) {
    throw new Error("Database not configured");
  }

  const result = await db.execute(sql`
    SELECT timestamp, restaurant_id, corner_id, queue_len, data_type
    FROM waiting_snapshots
    WHERE DATE(timestamp AT TIME ZONE 'Asia/Seoul') = ${dateKey}
    ORDER BY timestamp, restaurant_id, corner_id
  `);

  return (result.rows as any[]).map(row => ({
    timestamp: formatToKSTISO(new Date(row.timestamp)),
    restaurantId: row.restaurant_id,
    cornerId: row.corner_id,
    queue_len: row.queue_len,
    est_wait_time_min: computeWaitFn(row.queue_len, row.restaurant_id, row.corner_id),
    data_type: row.data_type || 'observed',
  }));
}

/**
 * Get 5-minute aggregated waiting data for a specific time window from DB.
 * Used for /api/waiting?time=HH:MM&aggregate=5min on historical dates.
 */
export async function getHistoricalAggregated(
  dateKey: string,
  timeHHMM: string,
  computeWaitFn: (queueLen: number, restaurantId: string, cornerId: string) => number
): Promise<HistoricalWaitingRow[]> {
  if (!db) {
    throw new Error("Database not configured");
  }

  const [hours, minutes] = timeHHMM.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return [];
  }
  
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + 4;

  const result = await db.execute(sql`
    SELECT 
      restaurant_id,
      corner_id,
      ROUND(AVG(queue_len)) as avg_queue_len
    FROM waiting_snapshots
    WHERE DATE(timestamp AT TIME ZONE 'Asia/Seoul') = ${dateKey}
      AND (EXTRACT(hour FROM timestamp AT TIME ZONE 'Asia/Seoul') * 60 
           + EXTRACT(minute FROM timestamp AT TIME ZONE 'Asia/Seoul'))
          BETWEEN ${startMinutes} AND ${endMinutes}
    GROUP BY restaurant_id, corner_id
  `);

  const syntheticTimestamp = `${dateKey}T${timeHHMM}:00+09:00`;

  return (result.rows as any[]).map(row => ({
    timestamp: syntheticTimestamp,
    restaurantId: row.restaurant_id,
    cornerId: row.corner_id,
    queue_len: Math.round(Number(row.avg_queue_len)),
    est_wait_time_min: computeWaitFn(Math.round(Number(row.avg_queue_len)), row.restaurant_id, row.corner_id),
    data_type: 'observed',
  }));
}

/**
 * Get waiting data for a specific ISO timestamp from DB.
 * Used for /api/waiting?time=ISO_TIMESTAMP on historical dates.
 */
export async function getHistoricalByTimestamp(
  isoTimestamp: string,
  computeWaitFn: (queueLen: number, restaurantId: string, cornerId: string) => number
): Promise<HistoricalWaitingRow[]> {
  if (!db) {
    throw new Error("Database not configured");
  }

  const targetDate = new Date(isoTimestamp);

  const result = await db.execute(sql`
    SELECT timestamp, restaurant_id, corner_id, queue_len, data_type
    FROM waiting_snapshots
    WHERE timestamp = ${targetDate}
    ORDER BY restaurant_id, corner_id
  `);

  return (result.rows as any[]).map(row => ({
    timestamp: formatToKSTISO(new Date(row.timestamp)),
    restaurantId: row.restaurant_id,
    cornerId: row.corner_id,
    queue_len: row.queue_len,
    est_wait_time_min: computeWaitFn(row.queue_len, row.restaurant_id, row.corner_id),
    data_type: row.data_type || 'observed',
  }));
}

/**
 * Create expression index for efficient date filtering if it doesn't exist.
 * This improves performance of all queries filtering by KST date.
 */
export async function ensureKSTDateIndex(): Promise<boolean> {
  if (!db) {
    return false;
  }

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_waiting_kst_date 
      ON waiting_snapshots (DATE(timestamp AT TIME ZONE 'Asia/Seoul'))
    `);
    console.log('[DB] KST date expression index created or already exists');
    return true;
  } catch (error) {
    console.error('[DB] Failed to create KST date index:', error);
    return false;
  }
}
