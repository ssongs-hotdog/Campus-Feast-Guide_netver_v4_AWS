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

## Recent Changes (2026-01-19)

### Beta Package Update Implementation
- **8-1**: Client timezone alignment with server-authoritative todayKey (60s refresh)
- **8-2**: Shared schedule configuration moved to `shared/domain/schedule.ts`
- **8-3**: Beta simulator created (`scripts/simulator.ts`) with 30s cadence
- **8-4**: Historical DB queries with cutover date policy (≥2026-01-20 uses DB)
- Expression index for efficient KST date filtering
- CSV fallback on DB errors for resilient data availability
- Beta test scheduled for 2026-01-20

### Key Files Added/Modified
- `shared/domain/schedule.ts` - Schedule configuration for corners
- `scripts/simulator.ts` - Beta day simulator
- `server/storage.ts` - DB query functions for historical data
- `server/routes.ts` - Cutover logic for historical endpoints
- `client/src/lib/timeContext.tsx` - Server-authoritative todayKey