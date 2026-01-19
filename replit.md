# HY-eat - Hanyang University Cafeteria Congestion Monitor

## Overview

HY-eat is a mobile-first web application designed for Hanyang University students to check real-time cafeteria wait times and congestion levels. The app displays menu information, estimated wait times based on queue data, and supports historical data viewing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Layered Architecture (Refactored)

The codebase is organized into clearly separated layers:

1. **Data Provider Layer** (`client/src/lib/data/dataProvider.ts`)
   - Abstracts data fetching from the UI
   - Easy to swap from JSON files to a real API later
   - Functions: `getMenus()`, `getMenuDetail()`, `getWaitTimes()`, `getAvailableTimestamps()`

2. **Domain Logic Layer** (`shared/domain/waitTime.ts` + `client/src/lib/domain/`)
   - Pure, testable business logic
   - Wait time estimation based on queue length and service rates
   - Congestion level calculation
   - `shared/domain/waitTime.ts` - Canonical wait-time calculation (used by both server and client)
   - `client/src/lib/domain/schedule.ts` - Schedule configuration and active status logic

3. **Date Utility Layer** (`client/src/lib/dateUtils.ts`)
   - Real date-based navigation (no hardcoded dates)
   - Functions: `getTodayKey()`, `addDays()`, `parseDayKeyFromPath()`, `formatDayKeyForDisplay()`

4. **UI Presentation Layer** (pages and components)
   - No hardcoded menu strings or dates
   - Receives data from the data provider layer
   - URL-driven date navigation

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
  - `/d/YYYY-MM-DD` - Main view for a specific date
  - `/d/YYYY-MM-DD/restaurant/:restaurantId/corner/:cornerId` - Menu detail
  - `/ticket` - Ticket management
  - `/` - Redirects to today's date
- **State Management**: React Context for time state, TanStack Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: RESTful endpoints serving JSON data
- **Data Source**: Date-indexed JSON files and CSV data in `/data/`
- **Build System**: esbuild for server bundling, Vite for client bundling

### Key Design Patterns
- **URL-Driven Dates**: Date is in the URL (`/d/YYYY-MM-DD`), making navigation refresh-safe and shareable
- **Mobile-First Design**: Optimized for smartphone viewports with card-based layouts
- **Time Simulation**: Dual-mode system supporting real-time data and historical simulation
- **5-Level Congestion System**: Color-coded indicators (green to red) based on wait times

### Data Flow
1. User navigates to `/d/YYYY-MM-DD`
2. Frontend calls data provider functions (which fetch from `/api/menu?date=` and `/api/waiting?date=`)
3. Data is displayed; if no data exists for the date, "no data" UI is shown (layout preserved)
4. Clicking a menu card navigates to detail with date in URL path

### Page Structure
- **Home** (`/d/YYYY-MM-DD`): Restaurant sections with corner cards showing menus and congestion
- **Corner Detail** (`/d/YYYY-MM-DD/restaurant/:restaurantId/corner/:cornerId`): Detailed view with purchase option (today only)
- **Ticket** (`/ticket`): Digital ticket management with QR code generation

## Data Files

### Menu Data
- Location: `data/menus_by_date.json`
- Format: Keyed by date (YYYY-MM-DD), then by restaurant ID, then by corner ID
- To add a new date: Add a new top-level key with the date string

### Waiting Data
- Location: `data/hy_eat_queue_3days_combined.csv`
- Format: CSV with columns: timestamp, restaurantId, cornerId, queue_len, data_type
- Timestamps in ISO 8601 format with timezone

### How to Add New Date Data
1. Add menu data: Edit `data/menus_by_date.json`, add a new date key
2. Add waiting data: Append rows to CSV with the new date's timestamps

### How to Switch to a Real API
1. Edit `client/src/lib/data/dataProvider.ts`
2. Change the fetch URLs to point to your real API endpoints
3. Adjust response parsing if needed
4. The rest of the app doesn't need to change!

## External Dependencies

### Database
- PostgreSQL configured via Drizzle ORM (schema in `shared/schema.ts`)
- `waiting_snapshots` table for real-time queue data ingestion (Phase 2A)
- Users table for future authentication (currently in-memory storage)

### Third-Party Libraries
- **QRCode**: Client-side QR code generation for meal tickets
- **Zod**: Schema validation for API data
- **pg**: PostgreSQL driver for Node.js

## Real-time Data Pipeline (Phase 2A - Shadow Write)

### Database Schema: waiting_snapshots
```sql
CREATE TABLE waiting_snapshots (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  restaurant_id VARCHAR(50) NOT NULL,
  corner_id VARCHAR(50) NOT NULL,
  queue_len INTEGER NOT NULL,
  data_type VARCHAR(20) DEFAULT 'observed',
  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(timestamp, restaurant_id, corner_id)
);
```

### Ingestion Endpoint: POST /api/ingest/waiting
- **Authentication**: Bearer token via `INGESTION_TOKEN` secret
- **Payload format**:
```json
{
  "timestamp": "2026-01-19T12:30:00+09:00",
  "source": "camera_ai_v1",
  "data_type": "observed",
  "corners": [
    { "restaurantId": "hanyang_plaza", "cornerId": "korean", "queue_len": 12 }
  ]
}
```
- **Validation rules**:
  - Timestamp: ISO 8601 with `+09:00` timezone suffix (KST)
  - Timestamp must be ≤ now + 60 seconds (reject future timestamps)
  - restaurantId must exist in `shared/types.ts` RESTAURANTS
  - cornerId must exist in that restaurant's cornerOrder
  - queue_len must be integer ≥ 0
- **UPSERT semantics**: Updates existing rows on conflict (timestamp, restaurant_id, corner_id)
- **Logging**: `[Ingest] OK/REJECTED/AUTH_FAIL/DB_FAIL` with latency

### Phase 2A Status
- ✅ PostgreSQL provisioned (DATABASE_URL available)
- ✅ Drizzle schema + migration applied
- ✅ POST /api/ingest/waiting endpoint operational
- ✅ All existing GET endpoints unchanged (file-based)

### Phase 2B: Real-time Today Tab (Current)

**Feature Flag**: `USE_DB_WAITING` environment variable
- `true`: Today tab reads from PostgreSQL with 30s polling
- `false` (default): All dates use file-based data (original behavior)

**New Endpoints**:
- `GET /api/config` - Returns `{ useDbWaiting: boolean, today: string }`
- `GET /api/health` - Returns `{ status, timestamp, db, lastIngestion, secondsSinceLastIngestion }`
- `GET /api/waiting/latest?date=YYYY-MM-DD` - Returns latest waiting snapshot from DB (or file fallback)

**KST Timezone Utilities** (server/storage.ts):
- `getKSTDateKey()` - Current date in Asia/Seoul timezone
- `getKSTISOTimestamp()` - Current ISO timestamp with +09:00 suffix
- `getLatestWaitingByDate(dateKey)` - Queries DB for latest snapshot

**Client Behavior**:
- When `useDbWaiting=true` AND date is today: Uses `/api/waiting/latest` with 30s polling
- Otherwise: Uses existing `/api/waiting` endpoint (no polling for non-today)
- 30s polling only activates for live DB mode on today tab

**Staleness Threshold**:
- `WAITING_STALE_SECONDS` env var controls data freshness (default: 90 seconds)
- If latest DB snapshot is older than threshold, `/api/waiting/latest` returns `[]`
- This prevents "stuck at old timestamp" behavior when ingestion stops
- Logs: `[Latest] STALE: date=... latest=... ageSec=... thresholdSec=...`

**Rollback**:
- Set `USE_DB_WAITING=false` to immediately revert to file-based behavior

**Backup Table**:
- `waiting_snapshots_backup` stores deleted test/cleanup rows for recovery

### Phase Status Summary
- ✅ Phase 2A: Shadow write to DB (ingestion endpoint)
- ✅ Phase 2B: Today read switch (USE_DB_WAITING flag)
- ⏳ Phase 2C: Historical migration to DB

## Recent Changes (2026-01-18)

### Schedule-Based Active/Inactive Status System
- Added schedule domain module (`client/src/lib/domain/schedule.ts`)
- Corners now show active (green dot) or inactive (gray dot) based on operating hours
- Active corners are sorted to appear first in each restaurant section
- Reference time: KST current time for today, dropdown time for other dates
- 10-minute auto-refresh for today's active status
- Break time support (e.g., 라면 14:30-15:30 on weekdays)
- Day-type rules: WEEKDAY (Mon-Fri), SATURDAY, SUNDAY, HOLIDAY

### Corner Configuration (New)
- 한양플라자: breakfast_1000, western, korean, instant, cupbap, ramen
- 신소재공학관: set_meal, single_dish, rice_bowl, dinner
- 생활과학관: dam_a_lunch, pangeos_lunch, dam_a_dinner

### Menu Data Neutralized
- `data/menus_by_date.json` emptied to `{}` to prevent conflicts with new corner structure
- UI shows placeholder values by default until real menu data is added

### Placeholder UI for Missing Data
- UI always renders the same structure regardless of data availability
- Each restaurant section always shows one card per corner
- When menu data is missing:
  - Menu name shows: "데이터 없음"
  - Price shows: "-"
- When waiting data is missing:
  - Wait time shows: "-"
  - Congestion bar shows gray bars
  - Congestion label shows: "미제공"
- Detail pages are always accessible (even without data)
- Payment button only appears when menu data exists

### How to Add Schedule for New Corners
1. Add corner ID to `RESTAURANTS[].cornerOrder` in `shared/types.ts`
2. Add corner display name to `CORNER_DISPLAY_NAMES` in `shared/cornerDisplayNames.ts`
3. Add schedule config to `CORNER_SCHEDULES` in `client/src/lib/domain/schedule.ts`

### How to Add Korean Holiday Support
1. Implement `isHoliday(dateKey)` in `client/src/lib/domain/schedule.ts`
2. Options: use a holiday library, maintain a static list, or fetch from an API
3. Currently returns `false` (stub)

### Files Added
- `client/src/lib/dateUtils.ts` - Date utility functions
- `client/src/lib/data/dataProvider.ts` - Data fetching abstraction
- `client/src/lib/domain/schedule.ts` - Schedule configuration and active status logic
- `shared/domain/waitTime.ts` - Canonical wait-time calculation (shared between server and client)
- `shared/dataTypes.ts` - Shared type definitions
- `shared/cornerDisplayNames.ts` - Single source of truth for corner display names (Korean)

### Files Modified
- `shared/types.ts` - Updated RESTAURANTS with new corner IDs
- `server/waitModel.ts` - Now re-exports from shared/domain/waitTime.ts
- `client/src/lib/domain/waitTime.ts` - Now imports from shared/domain/waitTime.ts
- `client/src/App.tsx` - Updated routing to /d/YYYY-MM-DD format
- `client/src/pages/Home.tsx` - Reference time computation, 10-minute refresh
- `client/src/pages/CornerDetail.tsx` - URL-driven date handling with placeholder support
- `client/src/components/CornerCard.tsx` - Added isActive prop with status indicator
- `client/src/components/RestaurantSection.tsx` - Sorts corners by active status
- `client/src/components/CongestionBar.tsx` - Added noData prop for "미제공" state
- `client/src/lib/timeContext.tsx` - Simplified, date management moved to URL
- `data/menus_by_date.json` - Emptied to neutralize old dummy data

## Netlify Deployment

### Configuration Files
- `netlify.toml`: Build configuration, functions directory, and redirects
- `netlify/functions/api.ts`: Express API wrapped with serverless-http

### Deployment Setup
- **Build Command**: `npx vite build`
- **Publish Directory**: `dist/public`
- **Functions Directory**: `netlify/functions`
- **Node Version**: 20

### API Routing on Netlify
- `/api/*` requests are redirected to `/.netlify/functions/api/:splat`
- SPA fallback redirects all other routes to `/index.html`

### Data Files
- CSV and JSON data files in `data/` are bundled with the serverless function via `included_files`
