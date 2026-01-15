# H-Eat PoC

## Overview

H-Eat is a mobile-first web application designed for Hanyang University students to check real-time cafeteria wait times and congestion levels. The app displays menu information, estimated wait times based on AI camera data, and allows users to purchase digital meal tickets with QR codes. It features both real-time monitoring and a simulation mode for time-based data exploration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context for global state (time mode, tickets), TanStack Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for Hanyang University branding

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Design**: RESTful endpoints serving JSON data
- **Data Source**: CSV file parsing for wait time data, JSON files for menu data
- **Build System**: esbuild for server bundling, Vite for client bundling

### Key Design Patterns
- **Mobile-First Design**: Optimized for smartphone viewports with card-based layouts
- **Time Simulation**: Dual-mode system supporting real-time data and historical simulation with playback controls
- **Context Providers**: TimeProvider manages display time state, TicketProvider handles digital ticket lifecycle
- **5-Level Congestion System**: Color-coded congestion indicators (green to red) based on wait times

### Data Flow
1. CSV wait time data is parsed on the server via `/api/waiting` endpoint
2. Menu data served from static JSON via `/api/menu` endpoint
3. Frontend queries data based on current display time (real-time or simulated)
4. Local storage persists ticket state across sessions

### Page Structure
- **Home** (`/`): Restaurant sections with corner cards showing menus and congestion
- **Corner Detail** (`/restaurant/:restaurantId/corner/:cornerId`): Detailed view with purchase option
- **Ticket** (`/ticket`): Digital ticket management with QR code generation

## External Dependencies

### Database
- PostgreSQL configured via Drizzle ORM (schema in `shared/schema.ts`)
- Currently using in-memory storage for user data with database schema ready for migration

### Third-Party Libraries
- **QRCode**: Client-side QR code generation for meal tickets
- **date-fns**: Date formatting and manipulation
- **Zod**: Schema validation for API data

### Data Sources
- CSV file: `data/waiting_1min_KST_2026-01-15.csv` containing timestamped wait time data
- JSON file: `data/menu.json` containing restaurant and menu information

## Recent Changes (2026-01-15)
- Fixed CSV parsing to handle CRLF line endings correctly
- Fixed time playback loop to stop cleanly at the last timestamp
- Fixed ticket countdown lifecycle to maintain 30-minute timer correctly
- Implemented complete flow: browse → detail → payment → ticket → QR activation

### Build & Development
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-overlay)
- TypeScript with path aliases (`@/` for client, `@shared/` for shared code)