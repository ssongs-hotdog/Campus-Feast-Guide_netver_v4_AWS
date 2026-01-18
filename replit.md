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

2. **Domain Logic Layer** (`client/src/lib/domain/waitTime.ts`)
   - Pure, testable business logic
   - Wait time estimation based on queue length and service rates
   - Congestion level calculation

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
- Currently using in-memory storage

### Third-Party Libraries
- **QRCode**: Client-side QR code generation for meal tickets
- **Zod**: Schema validation for API data

## Recent Changes (2026-01-18)

### Architecture Refactoring
- Implemented URL-based routing with date in path (`/d/YYYY-MM-DD`)
- Created date utility module using real system date (no hardcoded TODAY_DATE)
- Separated concerns into data provider, domain logic, and presentation layers
- Added beginner-friendly comments to all major files
- UI components now receive date from URL, making navigation refresh-safe and shareable

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

### Files Added
- `client/src/lib/dateUtils.ts` - Date utility functions
- `client/src/lib/data/dataProvider.ts` - Data fetching abstraction
- `client/src/lib/domain/waitTime.ts` - Wait time estimation logic
- `shared/dataTypes.ts` - Shared type definitions

### Files Modified
- `client/src/App.tsx` - Updated routing to /d/YYYY-MM-DD format
- `client/src/pages/Home.tsx` - Reads date from URL, always renders restaurant sections
- `client/src/pages/CornerDetail.tsx` - URL-driven date handling with placeholder support
- `client/src/components/CornerCard.tsx` - Supports optional menu data with placeholders
- `client/src/components/RestaurantSection.tsx` - Always renders one card per corner
- `client/src/components/CongestionBar.tsx` - Added noData prop for "미제공" state
- `client/src/lib/timeContext.tsx` - Simplified, date management moved to URL

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
