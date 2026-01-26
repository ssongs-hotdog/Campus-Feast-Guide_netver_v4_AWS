# HY-eat - Hanyang University Cafeteria Congestion Monitor

## Overview
HY-eat is a mobile-first web application for Hanyang University students to monitor real-time cafeteria wait times and congestion. It provides menu information, estimated wait times based on queue data, and supports historical data viewing. The project aims to improve student dining experience by offering transparency into cafeteria congestion, with future potential for broader university service integration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
The application uses a layered architecture to separate concerns:
1.  **Data Provider Layer**: Abstracts data fetching from the UI, allowing easy swapping between local JSON files and a real API.
2.  **Domain Logic Layer**: Contains pure, testable business logic for wait time estimation and congestion level calculation, shared between client and server.
3.  **Date Utility Layer**: Provides consistent date-based navigation and formatting.
4.  **UI Presentation Layer**: Handles rendering, receives data from the data provider, and utilizes URL-driven date navigation.

### Frontend
-   **Framework**: React 18 with TypeScript, built with Vite.
-   **Routing**: Wouter for client-side routing, supporting date-specific views (`/d/YYYY-MM-DD`) and detailed menu views.
-   **State Management**: React Context for time state and TanStack Query for server state.
-   **UI**: shadcn/ui component library based on Radix UI, styled with Tailwind CSS.
-   **Design**: Mobile-first, card-based layout, with a 5-level color-coded congestion system.

### Backend
-   **Runtime**: Node.js with Express.
-   **API**: RESTful endpoints serving JSON data.
-   **Data Source**: Primarily uses date-indexed JSON files and CSV data for menus and waiting times, with a progressive transition to PostgreSQL.
-   **Build System**: esbuild for server bundling.

### Key Features and Design Patterns
-   **URL-Driven Dates**: Dates are embedded in the URL for shareable and refresh-safe navigation.
-   **Time Simulation**: Supports both real-time data and historical data simulation.
-   **Dynamic Schedule System**: Displays cafeteria corners as active or inactive based on configured operating hours and real-time KST.
-   **Placeholder UI**: Ensures a consistent UI structure even when menu or waiting data is missing, displaying "데이터 없음" or "-" accordingly.
-   **Server-Authoritative Time**: Client fetches current date from the server to prevent timezone discrepancies and ensure accurate daily rollovers.

### Real-time Data Pipeline (Phased Rollout)
The application is transitioning from file-based data to a PostgreSQL database for real-time data:
-   **Phase 2A (Shadow Write)**: An ingestion API (`POST /api/ingest/waiting`) securely writes real-time queue data to the `waiting_snapshots` PostgreSQL table, authenticated via a bearer token.
-   **Phase 2B (Real-time Today Tab)**: A feature flag (`USE_DB_WAITING`) enables fetching today's waiting data from PostgreSQL with 30-second polling. Includes a staleness threshold to prevent display of outdated data.
-   **Phase 2C (Historical DB Queries)**: Introduces a `BETA_CUTOVER_DATE` where dates on or after this will query historical data directly from PostgreSQL, utilizing an expression index for efficient KST date-based filtering. A fallback to CSV data is implemented for robustness.

## External Dependencies

### Database
-   **PostgreSQL**: Used for storing real-time queue data (`waiting_snapshots` table) and supporting historical queries.
-   **Drizzle ORM**: For interacting with PostgreSQL.

### Third-Party Libraries
-   **QRCode**: For client-side QR code generation for meal tickets.
-   **Zod**: For API data schema validation.
-   **pg**: PostgreSQL driver for Node.js.

### Deployment Environment
-   **Netlify**: Used for deployment, leveraging serverless functions for the Express API and managing redirects.

## Beta Day Runbook (2026-01-20)

### One-Time Setup: Create Simulator Workflow

1. Open **Workflows** pane (Tools sidebar or `Cmd+K` → "Workflows")
2. Click **"+ New Workflow"**
3. Name: `simulator-beta`
4. Add task: **Shell command** → `npx tsx scripts/simulator.ts`
5. Open **Project** workflow (the main workflow)
6. Add task: **Run workflow** → `simulator-beta`
7. Save

### Verifying the Simulator is Running

**Check Workflows panel:**
- `simulator-beta` should show status: **running**

**Check logs for:**
```
[Simulator] HY-eat Beta Simulator (Workflow-Ready)
[Simulator] Target date: 2026-01-20 (KST)
[Simulator] Auth: token PRESENT
```

During pre-beta (before 2026-01-20 KST):
```
[Simulator] Current KST date: 2026-01-19, waiting for 2026-01-20... (checking every 60s)
```

During beta day (2026-01-20 KST):
```
[Simulator] 12:30:00 → 12 corners [korean:8, western:6, ...] → {"ok":true,"inserted":12,...}
```

During inactive hours:
```
[Simulator] 02:30: No active corners, skipping ingestion (tick 42)
```

### API Verification

**Health check:**
```bash
curl http://localhost:5000/api/health
```
Expected: `"secondsSinceLastIngestion": <number < 40>`

**Latest data:**
```bash
curl "http://localhost:5000/api/waiting/latest?date=2026-01-20"
```
Expected: Array of corner data (not empty `[]` during operating hours)

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `token MISSING!` | INGESTION_TOKEN secret not set | Add to Replit Secrets |
| `secondsSinceLastIngestion: null` | Simulator not running | Check workflow status |
| Empty `[]` from latest | Data stale (>90s) or inactive hours | Check simulator logs |
| `POST-BETA STOP` | Date changed to 2026-01-21 | Expected behavior |

### Simulator Behavior Summary

| KST Date | Behavior |
|----------|----------|
| Before 2026-01-20 | Sleeps, checks every 60s |
| 2026-01-20 | Active ingestion every 30s |
| 2026-01-21+ | Exits gracefully (code 0) |

## Recent Changes (2026-01-26)

### Phase 2: DynamoDB Integration for Waiting Queue Data
- **WAITING_SOURCE=ddb**: Feature flag to switch waiting data source to DynamoDB
- **DDB_TABLE_WAITING=hyeat_YOLO_data**: DynamoDB table name
- All waiting endpoints now support DynamoDB:
  - `POST /api/ingest/waiting`: Writes to DynamoDB with 90-day TTL
  - `GET /api/waiting/latest`: Reads latest from DynamoDB
  - `GET /api/waiting/all`: Reads all data from DynamoDB
  - `GET /api/waiting/timestamps`: Gets timestamps from DynamoDB
  - `GET /api/waiting`: Base endpoint with DDB support
- DynamoDB data model:
  - pk (String): `CORNER#{restaurantId}#{cornerId}`
  - sk (String): epochMillis as string
  - ttl: 90 days retention
- PostgreSQL code path preserved for rollback (set WAITING_SOURCE=postgres)

### Key Files Added/Modified
- `server/ddbWaitingRepo.ts` - NEW: DynamoDB repository module
- `server/routes.ts` - Updated with DDB routing logic
- AWS SDK v3 packages: @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb

## Previous Changes (2026-01-19)

### Beta Package Update Implementation
- **8-1**: Client timezone alignment with server-authoritative todayKey (60s refresh)
- **8-2**: Shared schedule configuration moved to `shared/domain/schedule.ts`
- **8-3**: Beta simulator created (`scripts/simulator.ts`) with 30s cadence
- **8-4**: Historical DB queries with cutover date policy (≥2026-01-20 uses DB)
- Expression index for efficient KST date filtering
- CSV fallback on DB errors for resilient data availability
- Beta test scheduled for 2026-01-20
- **8-5**: Simulator updated to workflow-ready with pre-beta waiting and graceful post-beta exit

### Key Files Added/Modified
- `shared/domain/schedule.ts` - Schedule configuration for corners
- `scripts/simulator.ts` - Beta day simulator (workflow-ready)
- `server/storage.ts` - DB query functions for historical data
- `server/routes.ts` - Cutover logic for historical endpoints
- `client/src/lib/timeContext.tsx` - Server-authoritative todayKey